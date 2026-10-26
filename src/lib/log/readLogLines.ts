import { z } from "zod";

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
  timestamp: z.iso.datetime({ offset: true }),
  sessionId: z.string(),
  isMeta: z.boolean().optional(),
  isSidechain: z.boolean().optional(),
  isCompactSummary: z.boolean().optional(),
  origin: z.object({ kind: z.string() }).optional(),
  message: z.object({ content: z.union([z.string(), z.array(block)]) }),
});

export type LogLine = z.infer<typeof logLine>;

const lineType = z.object({ type: z.string() });

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

// The desktop app rewrites sessionId in every copy, so session ids that share any uuid are one
// conversation and merge into the smallest id; otherwise a turn could split across ids.
function mergedSessions(idsByUuid: Map<string, Set<string>>): (id: string) => string {
  const parent = new Map<string, string>();
  const root = (id: string): string => {
    const up = parent.get(id);
    return up === undefined ? id : root(up);
  };
  for (const ids of idsByUuid.values()) {
    const [first, ...rest] = [...ids].map(root).sort();
    if (first === undefined) continue;
    for (const id of rest) if (id !== first) parent.set(id, first);
  }
  return root;
}

// Per-turn and branch files repeat history, so lines dedupe by uuid and bad lines by content.
export function readLogLines(files: string[]): { lines: LogLine[]; skippedLines: number } {
  const byUuid = new Map<string, LogLine>();
  const idsByUuid = new Map<string, Set<string>>();
  const skipped = new Set<string>();
  for (const file of files) {
    for (const raw of file.split("\n")) {
      if (!raw.trim()) continue;
      const json = parseJson(raw);
      const kind = lineType.safeParse(json);
      // Other record types (attachments, queue operations, request blobs) carry no build events.
      if (kind.success && kind.data.type !== "user" && kind.data.type !== "assistant") continue;
      const line = logLine.safeParse(json);
      if (!line.success) {
        skipped.add(raw);
        continue;
      }
      const { uuid, sessionId } = line.data;
      idsByUuid.set(uuid, (idsByUuid.get(uuid) ?? new Set()).add(sessionId));
      if (!byUuid.has(uuid)) byUuid.set(uuid, line.data);
    }
  }
  const session = mergedSessions(idsByUuid);
  const lines = [...byUuid.values()]
    .map((line) => ({ ...line, sessionId: session(line.sessionId) }))
    .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
  return { lines, skippedLines: skipped.size };
}
