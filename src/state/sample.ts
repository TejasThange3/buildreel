// The sample build: the recording of three Buildreel features dictated with Wispr Flow, its
// trimmed and redacted session log, and the project that syncs them.
export const SAMPLE_NAME = "buildreel-sample.mp4";

const FILES = [
  { path: "/sample/recording.mp4", name: SAMPLE_NAME, type: "video/mp4" },
  { path: "/sample/session.jsonl", name: "session.jsonl", type: "application/jsonl" },
  { path: "/sample/project.json", name: "project.json", type: "application/json" },
];

export async function fetchSample(): Promise<File[]> {
  return Promise.all(
    FILES.map(async ({ path, name, type }) => {
      const response = await fetch(path);
      if (!response.ok) throw new Error(`The sample could not be loaded (${response.status}).`);
      // project.json carries the recording's start time, so the sample lines up in any timezone.
      return new File([await response.blob()], name, { type });
    }),
  );
}
