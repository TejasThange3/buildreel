// The sample build: the recording of three Buildreel features dictated with Wispr Flow, its
// trimmed and redacted session log, and the project that syncs them. The video is not fetched
// here: it is read by URL in byte ranges and streamed by the player, so the editor opens on a
// few kilobytes instead of waiting for 19 MB.
export const SAMPLE_NAME = "buildreel-sample.mp4";
export const SAMPLE_VIDEO = "/sample/recording.mp4";

async function text(path: string): Promise<string> {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`The sample could not be loaded (${response.status}).`);
  return response.text();
}

// project.json carries the recording's start time, so the sample lines up in any timezone.
export async function fetchSampleTexts(): Promise<{ log: string; project: string }> {
  const [log, project] = await Promise.all([
    text("/sample/session.jsonl"),
    text("/sample/project.json"),
  ]);
  return { log, project };
}
