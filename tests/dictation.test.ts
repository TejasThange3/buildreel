import { describe, expect, it } from "vitest";
import { lastSpeech, voiceActivity } from "@/lib/audio/dictation";

// Voice probability per 10 ms frame, built from [seconds, probability] stretches.
const vad = (...parts: [number, number][]) =>
  parts.flatMap(([seconds, p]) => Array<number>(Math.round(seconds * 100)).fill(p));

describe("lastSpeech", () => {
  it("finds the dictation before the prompt was sent, with a little air around it", () => {
    const run = lastSpeech(vad([8, 0.02], [4, 0.95], [3, 0.03]), 0.01);
    expect(run?.[0]).toBeCloseTo(7.85, 2);
    expect(run?.[1]).toBeCloseTo(12.3, 2);
  });

  it("keeps short pauses inside one prompt and splits at long ones", () => {
    const run = lastSpeech(vad([2, 0.9], [3, 0.05], [1.5, 0.9], [0.5, 0.05], [1.5, 0.9]), 0.01);
    expect(run?.[0]).toBeCloseTo(4.85, 2);
    // The speech runs to the window's end, so the clip stops there.
    expect(run?.[1]).toBeCloseTo(8.5, 2);
  });

  it("skips a click or a cough after the dictation", () => {
    const run = lastSpeech(vad([1, 0.02], [3, 0.95], [2, 0.02], [0.2, 0.99], [1, 0.02]), 0.01);
    expect(run?.[1]).toBeCloseTo(4.3, 2);
  });

  it("finds nothing in a quiet or noisy window without speech", () => {
    expect(lastSpeech(vad([10, 0.1]), 0.01)).toBeUndefined();
    expect(lastSpeech([], 0.01)).toBeUndefined();
  });

  it("keeps the last 15 s of a long dictation", () => {
    const run = lastSpeech(vad([1, 0.02], [25, 0.9], [1, 0.02]), 0.01);
    expect(run?.[1]).toBeCloseTo(26.3, 2);
    expect(run?.[0]).toBeCloseTo(11.3, 2);
  });
});

describe("voiceActivity", () => {
  it("scores each frame scaled like 16-bit audio, padding the last one", () => {
    const seen: number[] = [];
    const scores = voiceActivity(new Float32Array(1000).fill(0.5), 480, (frame) => {
      seen.push(frame[0] ?? 0, frame[479] ?? 0);
      return 0.7;
    });
    expect([...scores].map((s) => +s.toFixed(2))).toEqual([0.7, 0.7, 0.7]);
    expect(seen).toEqual([16_384, 16_384, 16_384, 16_384, 16_384, 0]);
  });
});
