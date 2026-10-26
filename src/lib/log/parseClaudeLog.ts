import { z } from "zod";
import type { BuildEvent, ParsedLog } from "@/shared/types";

const block = z.union([
  z.object({ type: z.literal("text"), text: z.string() }),
  z.object({
    type: z.literal("tool_use"),
    name: z.string(),
    input: z.record(z.string(), z.unknown()),
  }),
  z.object({ type: z.string() }),
]);

const logLine = z.object({
  type: z.enum(["user", "assistant"]),
  uuid: z.string(),
  timestamp: z.iso.datetime(),
  sessionId: z.string(),
  isMeta: z.boolean().optional(),
  isSidechain: z.boolean().optional(),
  origin: z.object({ kind: z.string() }).optional(),
  message: z.object({ content: z.union([z.string(), z.array(block)]) }),
});

type LogLine = z.infer<typeof logLine>;

const lineType = z.object({ type: z.string() });

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function readLines(files: string[]): { lines: LogLine[]; skippedLines: number } {
  const lines: LogLine[] = [];
  let skippedLines = 0;
  for (const file of files) {
    for (const raw of file.split("\n")) {
      if (!raw.trim()) continue;
      const json = parseJson(raw);
      const kind = lineType.safeParse(json);
      if (!kind.success) {
        skippedLines++;
        continue;
      }
      // Dozens of other record types (attachments, queue operations, request blobs) carry no build events.
      if (kind.data.type !== "user" && kind.data.type !== "assistant") continue;
      const line = logLine.safeParse(json);
      if (line.success) lines.push(line.data);
      else skippedLines++;
    }
  }
  return { lines, skippedLines };
}

function userText(line: LogLine): string | undefined {
  const content = line.message.content;
  if (typeof content === "string") return content.trim();
  if (content.some((b) => b.type === "tool_result")) return undefined;
  return content
    .flatMap((b) => ("text" in b ? [b.text] : []))
    .join("\n")
    .trim();
}

// Slash commands and their output are logged as user text but are not something the user asked for.
const NOISE_PREFIXES = [
  "<command-name>",
  "<command-message>",
  "<local-command-stdout>",
  "<local-command-caveat>",
];

function cleanPrompt(text: string): string {
  return text
    .replace(/<\/?pasted_content[^>]*>/g, "")
    .replace(/@"[^"]*?([^"\\/]+)"/g, "@$1")
    .trim();
}

// Also matches "[Request interrupted by user for tool use]". These lines carry no origin.
const INTERRUPT_PREFIX = "[Request interrupted by user";

function userEvent(line: LogLine): BuildEvent | undefined {
  const raw = userText(line);
  if (!raw) return undefined;
  const at = Date.parse(line.timestamp);
  if (raw.startsWith(INTERRUPT_PREFIX)) return { kind: "interrupt", at };
  // Older and CLI logs have no origin; there, any text the user record carries is the prompt.
  if (line.origin && line.origin.kind !== "human") return undefined;
  if (NOISE_PREFIXES.some((p) => raw.startsWith(p))) return undefined;
  const text = cleanPrompt(raw);
  if (!text) return undefined;
  return { kind: "prompt", at, text, sessionId: line.sessionId };
}

const EDIT_TOOLS = new Set(["Edit", "Write", "MultiEdit", "NotebookEdit"]);
const SHELL_TOOLS = new Set(["Bash", "PowerShell"]);
const READ_TOOLS = new Set(["Read", "Grep", "Glob"]);
// Agent bookkeeping (desktop task list and wrap-up, tool discovery) is not work a viewer would recognise.
const HIDDEN_TOOL = /^(mcp__ccd_|ToolSearch$|TodoWrite$)/;

function stringField(input: Record<string, unknown>, key: string): string | undefined {
  const value = input[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function toolLabel(name: string, input: Record<string, unknown>): string {
  if (EDIT_TOOLS.has(name)) {
    const path = stringField(input, "file_path") ?? stringField(input, "notebook_path") ?? "";
    return `Edited ${path.split(/[\\/]/).pop()}`;
  }
  if (SHELL_TOOLS.has(name)) {
    const what = stringField(input, "description") ?? stringField(input, "command")?.slice(0, 40);
    return `Ran ${what ?? name}`;
  }
  if (name === "Agent" || name === "Task") return "Started a subagent";
  return name.split("__").pop() ?? name;
}

function readLabel(count: number): string {
  return `Read ${count} ${count === 1 ? "file" : "files"}`;
}

export function parseClaudeLogs(files: string[]): ParsedLog {
  const { lines, skippedLines } = readLines(files);
  const events: BuildEvent[] = [];
  // Reads, greps and globs collapse into one "Read N files" event per turn.
  let reads: { event: Extract<BuildEvent, { kind: "tool" }>; count: number } | undefined;
  // A turn ends at its last assistant record: interrupted turns have no end_turn, and turns
  // resumed by a subagent report keep working after one.
  let lastAssistantAt: number | undefined;
  const endTurn = () => {
    if (lastAssistantAt !== undefined) events.push({ kind: "turnEnd", at: lastAssistantAt });
    lastAssistantAt = undefined;
    reads = undefined;
  };
  for (const line of lines) {
    if (line.isMeta || line.isSidechain) continue;
    const at = Date.parse(line.timestamp);
    if (line.type === "user") {
      const event = userEvent(line);
      if (!event) continue;
      endTurn();
      events.push(event);
      continue;
    }
    lastAssistantAt = at;
    if (typeof line.message.content === "string") continue;
    for (const b of line.message.content) {
      if ("text" in b && b.text.trim()) events.push({ kind: "reply", at });
      if (!("name" in b) || HIDDEN_TOOL.test(b.name)) continue;
      if (!READ_TOOLS.has(b.name)) {
        events.push({ kind: "tool", at, tool: b.name, label: toolLabel(b.name, b.input) });
      } else if (reads) {
        reads.count++;
        reads.event.label = readLabel(reads.count);
      } else {
        reads = { event: { kind: "tool", at, tool: "Read", label: readLabel(1) }, count: 1 };
        events.push(reads.event);
      }
    }
  }
  endTurn();
  return { events, skippedLines };
}
