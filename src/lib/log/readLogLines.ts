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

export function readLogLines(files: string[]): { lines: LogLine[]; skippedLines: number } {
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
