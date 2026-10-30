import { z } from "zod";

// The sample build: the recording of three Buildreel features dictated with Wispr Flow, its
// trimmed and redacted session log, the project that syncs them, and the recording's analysis.
// The video itself is never fetched here: the player streams it, and with the analysis shipped
// beside it the editor opens on about 40 KB instead of reading a 19 MB file first.
export const SAMPLE_NAME = "buildreel-sample.mp4";
export const SAMPLE_VIDEO = "/sample/recording.mp4";

// What the editor would otherwise read from the video: its probe, activity per half second,
// keyframe times, and where each prompt was dictated.
const AnalysisSchema = z.object({
  durationS: z.number().positive(),
  width: z.int().positive(),
  height: z.int().positive(),
  activity: z.array(z.number().min(0).max(1)),
  keyTimes: z.array(z.number().min(0)),
  dictation: z.record(z.string(), z.tuple([z.number(), z.number()])),
});

export type SampleAnalysis = z.infer<typeof AnalysisSchema>;

async function text(path: string): Promise<string> {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`The sample could not be loaded (${response.status}).`);
  return response.text();
}

// project.json carries the recording's start time, so the sample lines up in any timezone.
export async function fetchSample(): Promise<{
  log: string;
  project: string;
  analysis: SampleAnalysis;
}> {
  const [log, project, analysis] = await Promise.all([
    text("/sample/session.jsonl"),
    text("/sample/project.json"),
    text("/sample/analysis.json"),
  ]);
  return { log, project, analysis: AnalysisSchema.parse(JSON.parse(analysis)) };
}
