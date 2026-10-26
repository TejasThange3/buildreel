import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { activityTrack, type PacketSize } from "@/lib/media/activity";

// 60 s of real video packet metadata from an OBS recording of this build (see the file's
// "source"). Bin 72 is 916 s into the original recording, where the screen switched windows.
const fixture = z
  .object({ packets: z.array(z.tuple([z.number(), z.number(), z.number()])) })
  .parse(JSON.parse(readFileSync("tests/fixtures/obs-packets-60s.json", "utf8")));
const real: PacketSize[] = fixture.packets.map(([ms, bytes, key]) => ({
  timestamp: ms / 1000,
  byteLength: bytes,
  type: key ? "key" : "delta",
}));

const delta = (timestamp: number, byteLength: number): PacketSize => ({
  timestamp,
  byteLength,
  type: "delta",
});

describe("activityTrack", () => {
  const track = activityTrack(real, 60);

  it("gives one score in 0..1 per half second", () => {
    expect(track).toHaveLength(120);
    expect(track.every((s) => s >= 0 && s <= 1)).toBe(true);
  });

  it("peaks where the screen visibly changed", () => {
    const peak = track.indexOf(Math.max(...track));
    expect(peak).toBeGreaterThanOrEqual(70);
    expect(peak).toBeLessThanOrEqual(74);
  });

  it("keeps a static screen near zero", () => {
    const sorted = [...track].sort((a, b) => a - b);
    expect(sorted[60]).toBeLessThan(0.15);
  });

  it("ignores key packets", () => {
    const bigKeys = real.map((p) => (p.type === "key" ? { ...p, byteLength: 1e7 } : p));
    expect(activityTrack(bigKeys, 60)).toEqual(track);
  });

  it("returns zeros for an unchanging screen and drops packets past the end", () => {
    const flat = Array.from({ length: 40 }, (_, i) => delta(i * 0.25, 7000));
    expect(activityTrack([...flat, delta(30, 1e6)], 10)).toEqual(new Array(20).fill(0));
  });
});
