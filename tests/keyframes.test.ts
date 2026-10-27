import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { formatTime } from "@/lib/format";
import type { PacketSize } from "@/lib/media/activity";
import { keyframeAt, keyframeTimes } from "@/lib/media/keyframes";

// The same 60 s of real OBS packet metadata as the activity tests.
const fixture = z
  .object({ packets: z.array(z.tuple([z.number(), z.number(), z.number()])) })
  .parse(JSON.parse(readFileSync("tests/fixtures/obs-packets-60s.json", "utf8")));
const real: PacketSize[] = fixture.packets.map(([ms, bytes, key]) => ({
  timestamp: ms / 1000,
  byteLength: bytes,
  type: key ? "key" : "delta",
}));

describe("keyframeTimes", () => {
  it("finds OBS keyframes about 8.3 s apart, in order", () => {
    const times = keyframeTimes(real);
    expect(times).toHaveLength(7);
    const gaps = times.slice(1).map((t, i) => t - (times[i] ?? 0));
    expect(gaps.every((g) => g > 8.2 && g < 8.4)).toBe(true);
  });
});

describe("keyframeAt", () => {
  const times = [0.03, 8.37, 16.7, 25.03];
  it.each([
    [0, 0.03],
    [0.03, 0.03],
    [8.36, 0.03],
    [8.37, 8.37],
    [20, 16.7],
    [99, 25.03],
  ])("picks the keyframe at or before %s s", (t, expected) => {
    expect(keyframeAt(times, t)).toBe(expected);
  });

  it("has nothing to give for a recording without keyframes", () => {
    expect(keyframeAt([], 5)).toBeUndefined();
  });
});

describe("formatTime", () => {
  it.each([
    [0, "0:00.0"],
    [20.32, "0:20.3"],
    [59.96, "1:00.0"],
    [1268.8, "21:08.8"],
    [-1, "0:00.0"],
  ])("formats %s s as %s", (s, expected) => {
    expect(formatTime(s)).toBe(expected);
  });
});
