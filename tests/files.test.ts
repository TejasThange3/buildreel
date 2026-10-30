import { describe, expect, it } from "vitest";
import { sizeProblem, sortFiles } from "@/lib/files";

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

describe("sizeProblem", () => {
  const sized = (name: string, mb: number) => {
    const f = file(name);
    Object.defineProperty(f, "size", { value: mb * 1024 * 1024 });
    return f;
  };

  it("accepts real session sizes", () => {
    expect(sizeProblem(sortFiles([sized("a.jsonl", 20), sized("p.json", 0.01)]))).toBeUndefined();
  });

  it("refuses an oversized log, too many logs, or an oversized project", () => {
    expect(sizeProblem(sortFiles([sized("huge.jsonl", 150)]))).toContain("huge.jsonl");
    const many = [1, 2, 3, 4].map((i) => sized(`${i}.jsonl`, 90));
    expect(sizeProblem(sortFiles(many))).toContain("300 MB");
    expect(sizeProblem(sortFiles([sized("p.json", 5)]))).toContain("p.json");
  });
});
