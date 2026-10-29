// The sample build: the recording of three Buildreel features dictated with Wispr Flow, its
// trimmed and redacted session log, and the project that syncs them.
export const SAMPLE_NAME = "buildreel-sample.mp4";

const FILES = [
  { path: "/sample/recording.mp4", name: SAMPLE_NAME, type: "video/mp4" },
  { path: "/sample/session.jsonl", name: "session.jsonl", type: "application/jsonl" },
  { path: "/sample/project.json", name: "project.json", type: "application/json" },
];

// OBS named the recording by local wall-clock time, which only means the right instant in the
// recorder's timezone. Giving the file an mtime of start plus duration lets recordingStart fall
// back to it, so the sample lines up in any visitor's timezone.
const STARTED_AT = Date.parse("2026-10-29T07:50:48Z");
const DURATION_MS = 1_023_933;

export async function fetchSample(): Promise<File[]> {
  return Promise.all(
    FILES.map(async ({ path, name, type }) => {
      const response = await fetch(path);
      if (!response.ok) throw new Error(`The sample could not be loaded (${response.status}).`);
      return new File([await response.blob()], name, {
        type,
        lastModified: STARTED_AT + DURATION_MS,
      });
    }),
  );
}
