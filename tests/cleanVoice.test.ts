import { describe, expect, it } from "vitest";
import { cleanVoice, DENOISE_RATE, resample } from "@/lib/audio/cleanVoice";

describe("resample", () => {
  it("keeps a ramp a ramp, and the length in proportion", () => {
    const ramp = Float32Array.from({ length: 441 }, (_, i) => i / 440);
    const up = resample(ramp, 44_100, 48_000);
    expect(up).toHaveLength(480);
    expect(up[0]).toBe(0);
    expect(up[240]).toBeCloseTo(240 * (44_100 / 48_000) * (1 / 440), 6);
    expect(Math.max(...up)).toBeLessThanOrEqual(1);
  });

  it("copies when the rates match", () => {
    const input = Float32Array.of(0.1, 0.2);
    const output = resample(input, 48_000, 48_000);
    expect([...output]).toEqual([...input]);
    expect(output).not.toBe(input);
  });
});

describe("cleanVoice", () => {
  // A stand-in model that, like RNNoise, answers each frame with the previous one, halved, and
  // records the loudest sample of each frame it saw.
  const halving = () => {
    const seen: number[] = [];
    let previous = new Float32Array(0);
    const process = (frame: Float32Array) => {
      seen.push(Math.max(...frame.map(Math.abs)));
      const input = frame.slice();
      frame.fill(0);
      previous.forEach((v, i) => (frame[i] = v / 2));
      previous = input;
    };
    return { seen, process };
  };

  it("feeds 16-bit scaled frames, flushes the model's lag, and writes every channel", () => {
    const left = new Float32Array(1200).fill(0.5);
    const right = new Float32Array(1200).fill(0.1);
    const model = halving();
    cleanVoice([left, right], 100, 1100, DENOISE_RATE, 480, model.process);
    // 1000 samples make two full frames and one padded frame, then one silent flush frame.
    expect(model.seen).toEqual(
      [0.3 * 32_768, 0.3 * 32_768, 0.3 * 32_768, 0].map((v) => Math.fround(v)),
    );
    expect(left[100]).toBeCloseTo(0.15, 6);
    expect(right[1099]).toBeCloseTo(0.15, 6);
    expect(left[99]).toBeCloseTo(0.5, 6);
    expect(right[1100]).toBeCloseTo(0.1, 6);
  });

  it("returns the window at its own sample rate", () => {
    const plane = new Float32Array(44_100).fill(0.2);
    cleanVoice([plane], 0, 44_100, 44_100, 480, halving().process);
    expect(plane[0]).toBeCloseTo(0.1, 6);
    expect(plane[44_099]).toBeCloseTo(0.1, 6);
  });
});
