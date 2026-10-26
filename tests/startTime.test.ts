import { describe, expect, it } from "vitest";
import { recordingStart, startFromFilename } from "@/lib/media/startTime";

// File names and mtimes of real OBS recordings from the Buildreel build, 26 Oct 2026.
const local = (h: number, m: number, s: number) => new Date(2026, 9, 26, h, m, s).getTime();

describe("startFromFilename", () => {
  it.each([
    ["2026-10-26 14-54-50.mp4", local(14, 54, 50)],
    ["2026-10-26 15-28-26.mkv", local(15, 28, 26)],
    ["Replay 2026-10-26_16-35-40.mp4", local(16, 35, 40)],
    ["capture 2026-10-26T09-05-00.webm", local(9, 5, 0)],
  ])("reads %s as local time", (name, expected) => {
    expect(startFromFilename(name)).toBe(expected);
  });

  it.each(["recording.mp4", "2026-10-26.mp4", "26-10-2026 14-54-50.mp4"])(
    "returns undefined for %s",
    (name) => {
      expect(startFromFilename(name)).toBeUndefined();
    },
  );
});

describe("recordingStart", () => {
  it("prefers the filename over the file time", () => {
    const file = { name: "2026-10-26 14-54-50.mp4", lastModified: local(15, 16, 0) };
    expect(recordingStart(file, 1268.8)).toBe(local(14, 54, 50));
  });

  it("falls back to last-modified minus duration for renamed files", () => {
    // The real 14-54-50 recording, renamed: mtime 15:16:00 minus 1268.8 s is 1.2 s after 14:54:50.
    const file = { name: "phase-0.mp4", lastModified: local(15, 16, 0) };
    expect(recordingStart(file, 1268.8)).toBe(local(14, 54, 51) + 200);
  });
});
