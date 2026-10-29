import { describe, expect, it } from "vitest";
import { createStreamCleaner } from "@/lib/audio/streamCleaner";

describe("createStreamCleaner", () => {
  it("answers every block in full, one frame behind, through the model", () => {
    const frames: number[] = [];
    const clean = createStreamCleaner(4, (frame) => {
      frames.push(frame[0] ?? 0);
      for (let i = 0; i < frame.length; i++) frame[i] = (frame[i] ?? 0) / 2;
    });
    // Ten samples counting up, fed in uneven blocks of 3, 3, 3 and 1.
    const out: number[] = [];
    let n = 0;
    for (const size of [3, 3, 3, 1]) {
      const input = Float32Array.from({ length: size }, () => ++n / 100);
      const output = new Float32Array(size).fill(9);
      clean(input, output);
      out.push(...output);
    }
    // Two full frames reached the model, scaled like 16-bit audio.
    expect(frames.map((v) => Math.round(v))).toEqual([328, 1638]);
    // Four samples of queued silence, then the first frame halved.
    expect(out.map((v) => +v.toFixed(3))).toEqual([
      0, 0, 0, 0, 0.005, 0.01, 0.015, 0.02, 0.025, 0.03,
    ]);
  });

  it("fills with silence rather than stale samples if the model falls behind", () => {
    const clean = createStreamCleaner(4, () => {});
    const output = new Float32Array(8).fill(9);
    clean(new Float32Array(2), output);
    expect([...output]).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
  });
});
