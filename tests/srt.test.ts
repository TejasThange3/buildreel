import { describe, expect, it } from "vitest";
import { buildSrt } from "@/lib/render/srt";
import type { EDL } from "@/shared/types";

// A 2 s title card, a 1.5 s prompt hold, a 2 s timelapse of 10..330 s (160x) that passes two
// tool calls, 3 s of titled real time and a 1 s stats card.
const edl: EDL = {
  totalS: 9.5,
  segments: [
    { id: "intro", mode: "card", outDur: 2, overlay: { kind: "title", text: "Buildreel" } },
    {
      id: "1-hold",
      step: 1,
      mode: "hold",
      srcT: 10,
      outDur: 1.5,
      overlay: { kind: "prompt", text: "Add SRT export." },
    },
    {
      id: "1-fast",
      step: 1,
      mode: "fast",
      src: [10, 330],
      speed: 160,
      outDur: 2,
      overlay: {
        kind: "tools",
        tools: [
          { t: 5, label: "Read ExportPanel.tsx" },
          { t: 170, label: "Write srt.ts" },
          { t: 400, label: "Bash npm test" },
        ],
      },
    },
    { id: "1-skip", step: 1, mode: "real", src: [330, 330], outDur: 0 },
    {
      id: "1-real",
      step: 1,
      mode: "real",
      src: [330, 333],
      outDur: 3,
      overlay: { kind: "title", text: "SRT export" },
    },
    {
      id: "outro",
      mode: "card",
      outDur: 1,
      overlay: { kind: "stats", text: "3 prompts\n\n9 min" },
    },
  ],
};

describe("buildSrt", () => {
  const cues = buildSrt(edl).split("\n\n");

  it("numbers one cue per shown overlay, chips that never appear left out", () => {
    expect(cues).toHaveLength(6);
    expect(cues.map((cue) => cue.split("\n")[0])).toEqual(["1", "2", "3", "4", "5", "6"]);
  });

  it("times cards and prompts by their segment on output time", () => {
    expect(cues[0]).toBe("1\n00:00:00,000 --> 00:00:02,000\nBuildreel");
    expect(cues[1]).toBe("2\n00:00:02,000 --> 00:00:03,500\nAdd SRT export.");
  });

  it("starts each tool chip when the fast-forward passes it", () => {
    expect(cues[2]).toBe("3\n00:00:03,500 --> 00:00:04,500\nRead ExportPanel.tsx");
    expect(cues[3]).toBe("4\n00:00:04,500 --> 00:00:05,500\nWrite srt.ts");
  });

  it("labels step titles and drops empty lines from card text", () => {
    expect(cues[4]).toBe("5\n00:00:05,500 --> 00:00:08,500\nStep 1: SRT export");
    expect(cues[5]).toBe("6\n00:00:08,500 --> 00:00:09,500\n3 prompts\n9 min\n");
  });
});
