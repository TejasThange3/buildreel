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
  timestamp: z.iso.datetime(),
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

// The desktop app writes a new file per turn that repeats the whole conversation, and side
// questions branch into short files, so the same uuid appears in many files.
// A bad line repeated in every per-turn file is still one bad line, so they are counted by content.
export function readLogLines(files: string[]): { lines: LogLine[]; skippedLines: number } {
  const byUuid = new Map<string, LogLine>();
  const skipped = new Set<string>();
  for (const file of files) {
    for (const raw of file.split("\n")) {
      if (!raw.trim()) continue;
      const json = parseJson(raw);
      const kind = lineType.safeParse(json);
      if (!kind.success) {
        skipped.add(raw);
        continue;
      }
      // Dozens of other record types (attachments, queue operations, request blobs) carry no build events.
      if (kind.data.type !== "user" && kind.data.type !== "assistant") continue;
      const line = logLine.safeParse(json);
      if (!line.success) skipped.add(raw);
      else if (!byUuid.has(line.data.uuid)) byUuid.set(line.data.uuid, line.data);
    }
  }
  const lines = [...byUuid.values()].sort(
    (a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp),
  );
  return { lines, skippedLines: skipped.size };
}
