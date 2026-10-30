import { describe, expect, it } from "vitest";
import { FPS, frameCount, outputFrames } from "@/lib/render/frames";
import { audible, fadeEdges, soundWindows } from "@/lib/render/reelAudio";
import type { EDL, Segment } from "@/shared/types";

// 1 s title card, 1 s prompt hold at 10 s, 2 s timelapse of 10..330 s (160x), 3 s real time at
// 330 s, a 1 s fast-forward slow enough to play every frame, and a 1 s stats card: 9 s in all.
const segments: Segment[] = [
  { id: "intro", mode: "card", outDur: 1 },
  { id: "1-hold", step: 1, mode: "hold", srcT: 10, outDur: 1 },
  { id: "1-fast", step: 1, mode: "fast", src: [10, 330], speed: 160, outDur: 2 },
  { id: "1-real", step: 1, mode: "real", src: [330, 333], outDur: 3 },
  { id: "2-fast", step: 2, mode: "fast", src: [400, 408], speed: 8, outDur: 1 },
  { id: "outro", mode: "card", outDur: 1 },
];
const edl: EDL = { segments, totalS: 9 };
// OBS writes a keyframe about every 8.3 s.
const keyTimes = Array.from({ length: 60 }, (_, i) => i * 8.3);

describe("outputFrames", () => {
  const frames = [...outputFrames(edl, keyTimes)];
  const at = (t: number) => frames[Math.round(t * FPS)];

  it("yields one frame per thirtieth of a second, ignoring float noise", () => {
    expect(frames).toHaveLength(9 * FPS);
    expect(frameCount({ segments, totalS: 17.7 })).toBe(531);
  });

  it("leaves card frames without a source", () => {
    expect(at(0.5)?.frameT).toBeUndefined();
    expect(at(8.5)?.frameT).toBeUndefined();
  });

  it("holds the prompt frame", () => {
    expect(at(1.5)?.frameT).toBe(10);
  });

  it("snaps a timelapse to keyframes but keeps the exact time for overlays", () => {
    const frame = at(3);
    expect(frame?.srcT).toBeCloseTo(170);
    expect(frame?.frameT).toBeCloseTo(8.3 * 20);
  });

  it("plays real time and slow fast-forwards frame by frame", () => {
    expect(at(5.5)?.frameT).toBeCloseTo(331.5);
    expect(at(7.5)?.frameT).toBeCloseTo(404);
  });
});

describe("soundWindows", () => {
  it("places each real-time segment at its output time", () => {
    expect(soundWindows(edl)).toEqual([{ src: [330, 333], outStart: 4 }]);
  });

  it("plays a dictated prompt under its card", () => {
    const spoken: Segment[] = [
      { id: "1-hold", step: 1, mode: "hold", srcT: 40, voice: [33.9, 39.1], outDur: 5.2 },
      { id: "1-real", step: 1, mode: "real", src: [90, 95], outDur: 5 },
    ];
    expect(soundWindows({ segments: spoken, totalS: 10.2 })).toEqual([
      { src: [33.9, 39.1], outStart: 0 },
      { src: [90, 95], outStart: 5.2 },
    ]);
  });
});

describe("fadeEdges", () => {
  it("ramps both ends of a cut and leaves the middle alone", () => {
    // 3000 samples at 48 kHz; each ramp is 12 ms, 576 samples.
    const channel = new Float32Array(4000).fill(1);
    fadeEdges(channel, 500, 3500, 48000);
    expect(channel[499]).toBe(1);
    expect(channel[500]).toBe(0);
    expect(channel[788]).toBeCloseTo(0.5);
    expect(channel[2000]).toBe(1);
    expect(channel[3499]).toBe(0);
    expect(channel[3500]).toBe(1);
  });
});

describe("audible", () => {
  it("cuts quiet intervals out of a range", () => {
    expect(audible([49, 60], [[54, 59]])).toEqual([
      [49, 54],
      [59, 60],
    ]);
    expect(
      audible(
        [10, 20],
        [
          [0, 5],
          [25, 30],
        ],
      ),
    ).toEqual([[10, 20]]);
    expect(audible([10, 20], [[5, 25]])).toEqual([]);
  });

  it("keeps the next prompt's dictation out of the review before it", () => {
    const review: Segment[] = [{ id: "1-real", step: 1, mode: "real", src: [49, 60], outDur: 11 }];
    expect(soundWindows({ segments: review, totalS: 11, quiet: [[54, 59]] })).toEqual([
      { src: [49, 54], outStart: 0 },
      { src: [59, 60], outStart: 10 },
    ]);
  });
});
