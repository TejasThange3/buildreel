import type { BuildEvent, ParsedLog } from "@/shared/types";
import { redact } from "./redact";
import { readLogLines, type LogLine } from "./readLogLines";
import { isHiddenTool, isReadTool, readLabel, toolLabel } from "./toolLabel";

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
  const text = redact(cleanPrompt(raw));
  if (!text) return undefined;
  return { kind: "prompt", at, text, sessionId: line.sessionId };
}

// Reads, greps and globs collapse into one "Read N files" event per turn.
type Turn = {
  lastAssistantAt?: number;
  reads?: { event: Extract<BuildEvent, { kind: "tool" }>; count: number };
};

export function parseClaudeLogs(files: string[]): ParsedLog {
  const { lines, skippedLines } = readLogLines(files);
  const events: BuildEvent[] = [];
  // Turn state is per session: imported sessions can overlap in time, and one session's prompt
  // must not close another's turn or merge its reads.
  const turns = new Map<string, Turn>();
  const turnOf = (sessionId: string): Turn => {
    const turn = turns.get(sessionId) ?? {};
    turns.set(sessionId, turn);
    return turn;
  };
  // A turn ends at its last assistant record: interrupted turns have no end_turn, and turns
  // resumed by a subagent report keep working after one.
  const endTurn = (turn: Turn) => {
    if (turn.lastAssistantAt !== undefined) {
      events.push({ kind: "turnEnd", at: turn.lastAssistantAt });
    }
    turn.lastAssistantAt = undefined;
    turn.reads = undefined;
  };
  for (const line of lines) {
    // Compact summaries are the agent's recap of earlier context, logged as a user line.
    if (line.isMeta || line.isSidechain || line.isCompactSummary) continue;
    const at = Date.parse(line.timestamp);
    const turn = turnOf(line.sessionId);
    if (line.type === "user") {
      const event = userEvent(line);
      if (!event) continue;
      endTurn(turn);
      events.push(event);
      continue;
    }
    turn.lastAssistantAt = at;
    if (typeof line.message.content === "string") continue;
    for (const b of line.message.content) {
      if ("text" in b && b.text.trim()) events.push({ kind: "reply", at });
      if (!("name" in b) || isHiddenTool(b.name)) continue;
      if (!isReadTool(b.name)) {
        events.push({ kind: "tool", at, tool: b.name, label: toolLabel(b.name, b.input) });
      } else if (turn.reads) {
        turn.reads.count++;
        turn.reads.event.label = readLabel(turn.reads.count);
      } else {
        turn.reads = { event: { kind: "tool", at, tool: "Read", label: readLabel(1) }, count: 1 };
        events.push(turn.reads.event);
      }
    }
  }
  for (const turn of turns.values()) endTurn(turn);
  // A turn end is only known when its session's next prompt arrives, so it can be pushed after
  // later events from another session. The sort is stable, so ties keep their order.
  return { events: events.sort((a, b) => a.at - b.at), skippedLines };
}
