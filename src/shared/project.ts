import { z } from "zod";
import type { Constraints } from "./types";

// The recording and logs are too large and too private to store, so a project file keeps only
// the user's decisions: the sync offset and the constraints. Opening it needs the same files again.
const ConstraintsSchema = z.object({
  targetS: z.number().min(15).max(300),
  pinned: z.array(z.int().min(1)),
  dropped: z.array(z.int().min(1)),
  emphasis: z.record(z.string(), z.number().min(0).max(20)),
  speed: z.record(z.string(), z.number().min(1).max(2000)),
  titles: z.record(z.string(), z.string().max(48)),
  // Files saved before prompts could be edited have neither field.
  prompts: z.record(z.string(), z.string().min(1).max(2000)).default({}),
  hiddenPrompts: z.array(z.int().min(1)).default([]),
  intro: z.string().max(60).optional(),
  outro: z.string().max(60).optional(),
});

const ProjectFileSchema = z.object({
  app: z.literal("buildreel"),
  version: z.literal(1),
  recording: z.object({ name: z.string(), durationS: z.number().positive() }),
  offsetS: z.number(),
  constraints: ConstraintsSchema,
});

type ProjectFile = z.infer<typeof ProjectFileSchema>;

// Durations from two probes of the same file agree to well under a second.
const SAME_RECORDING_S = 1;

export function saveProject(
  recording: ProjectFile["recording"],
  offsetS: number,
  constraints: Constraints,
): string {
  const file: ProjectFile = { app: "buildreel", version: 1, recording, offsetS, constraints };
  return JSON.stringify(file, null, 2);
}

type OpenedProject =
  { ok: true; offsetS: number; constraints: Constraints } | { ok: false; message: string };

export function openProject(text: string, durationS: number): OpenedProject {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, message: "That project file is not valid JSON." };
  }
  const parsed = ProjectFileSchema.safeParse(json);
  if (!parsed.success) return { ok: false, message: "That is not a Buildreel project file." };
  const { recording, offsetS, constraints } = parsed.data;
  if (Math.abs(recording.durationS - durationS) > SAME_RECORDING_S)
    return {
      ok: false,
      message: `That project was saved for ${recording.name}. Drop that recording with it.`,
    };
  return { ok: true, offsetS, constraints };
}
