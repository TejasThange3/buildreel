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
  const { sessionId } = line;
  if (raw.startsWith(INTERRUPT_PREFIX)) return { kind: "interrupt", at, sessionId };
  // Older and CLI logs have no origin; there, any text the user record carries is the prompt.
  if (line.origin && line.origin.kind !== "human") return undefined;
  if (NOISE_PREFIXES.some((p) => raw.startsWith(p))) return undefined;
  const text = redact(cleanPrompt(raw));
  if (!text) return undefined;
  return { kind: "prompt", at, text, sessionId };
}

// Reads, greps and globs collapse into one "Read N files" event per turn.
type Turn = {
  sessionId: string;
  lastAssistantAt?: number;
  reads?: { event: Extract<BuildEvent, { kind: "tool" }>; count: number };
};

export function parseClaudeLogs(files: string[]): ParsedLog {
  const { lines, skippedLines } = readLogLines(files);
  const events: BuildEvent[] = [];
  // Turn state is per session, so overlapping sessions never close or merge each other's turns.
  const turns = new Map<string, Turn>();
  const turnOf = (sessionId: string): Turn => {
    const turn = turns.get(sessionId) ?? { sessionId };
    turns.set(sessionId, turn);
    return turn;
  };
  // A turn ends at its last assistant record: interrupted ones lack end_turn, resumed ones pass it.
  const endTurn = (turn: Turn) => {
    if (turn.lastAssistantAt !== undefined) {
      events.push({ kind: "turnEnd", at: turn.lastAssistantAt, sessionId: turn.sessionId });
    }
    turn.lastAssistantAt = undefined;
    turn.reads = undefined;
  };
  for (const line of lines) {
    // Compact summaries are the agent's recap of earlier context, logged as a user line.
    if (line.isMeta || line.isSidechain || line.isCompactSummary) continue;
    const at = Date.parse(line.timestamp);
    const { sessionId } = line;
    const turn = turnOf(sessionId);
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
      if ("text" in b && b.text.trim()) events.push({ kind: "reply", at, sessionId });
      if (!("name" in b) || isHiddenTool(b.name)) continue;
      const read = isReadTool(b.name);
      if (read && turn.reads) {
        turn.reads.event.label = readLabel(++turn.reads.count);
        continue;
      }
      const label = read ? readLabel(1) : toolLabel(b.name, b.input);
      const event = { kind: "tool" as const, at, sessionId, tool: read ? "Read" : b.name, label };
      if (read) turn.reads = { event, count: 1 };
      events.push(event);
    }
  }
  for (const turn of turns.values()) endTurn(turn);
  // Turn ends of overlapping sessions arrive late; the stable sort restores time order.
  return { events: events.sort((a, b) => a.at - b.at), skippedLines };
}
