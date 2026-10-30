import { describe, expect, it } from "vitest";
import { sortFiles } from "@/lib/files";

const file = (name: string) => new File([""], name);

describe("sortFiles", () => {
  it("sorts logs, projects and recordings by extension, in any case", () => {
    const sorted = sortFiles([
      file("2026-10-29 13-20-48.mp4"),
      file("a39f267d.JSONL"),
      file("b42d0962.jsonl"),
      file("reel-project.json"),
      file("clip.MKV"),
    ]);
    expect(sorted.logs.map((f) => f.name)).toEqual(["a39f267d.JSONL", "b42d0962.jsonl"]);
    expect(sorted.projects.map((f) => f.name)).toEqual(["reel-project.json"]);
    expect(sorted.videos.map((f) => f.name)).toEqual(["2026-10-29 13-20-48.mp4", "clip.MKV"]);
  });
});
