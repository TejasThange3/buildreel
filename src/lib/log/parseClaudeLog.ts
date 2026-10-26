import { z } from "zod";
import type { BuildEvent, ParsedLog } from "@/shared/types";

const block = z.union([
  z.object({ type: z.literal("text"), text: z.string() }),
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

function promptEvent(line: LogLine): BuildEvent | undefined {
  // Older and CLI logs have no origin; there, any text the user record carries is the prompt.
  if (line.origin && line.origin.kind !== "human") return undefined;
  const raw = userText(line);
  if (!raw || NOISE_PREFIXES.some((p) => raw.startsWith(p))) return undefined;
  const text = cleanPrompt(raw);
  if (!text) return undefined;
  return { kind: "prompt", at: Date.parse(line.timestamp), text, sessionId: line.sessionId };
}

export function parseClaudeLogs(files: string[]): ParsedLog {
  const { lines, skippedLines } = readLines(files);
  const events: BuildEvent[] = [];
  for (const line of lines) {
    if (line.isMeta || line.isSidechain) continue;
    if (line.type !== "user") continue;
    const event = promptEvent(line);
    if (event) events.push(event);
  }
  return { events, skippedLines };
}
