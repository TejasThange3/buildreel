// `at` is epoch milliseconds (UTC), taken from the log line's timestamp.
export type BuildEvent =
  | { kind: "prompt"; at: number; text: string; sessionId: string }
  | { kind: "tool"; at: number; tool: string; label: string }
  | { kind: "reply"; at: number }
  | { kind: "turnEnd"; at: number }
  | { kind: "interrupt"; at: number };

export type ParsedLog = { events: BuildEvent[]; skippedLines: number };

export type VideoProbe = { durationS: number; width: number; height: number };
