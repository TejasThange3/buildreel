import { EncodedPacketSink } from "mediabunny";
import { ACTIVITY_BIN_S, type ActivityTrack } from "@/shared/types";
import { openVideo, type VideoSource } from "./probe";

export type PacketSize = { timestamp: number; byteLength: number; type: "key" | "delta" };

function quantile(sorted: number[], q: number): number {
  return sorted[Math.floor(q * (sorted.length - 1))] ?? 0;
}

// Key packets are skipped: their size marks a GOP boundary (every ~8.3 s in OBS), not change.
// Scaling runs from the 10th to the 99th percentile because a static screen still costs about
// 7 KB per bin and a single window switch can be 20x the busiest typing. The range is at least
// the floor itself, so on a mostly static recording encoder jitter stays near 0 instead of
// being stretched to fill 0..1; using the floor keeps that threshold free of bitrate settings.
export function activityTrack(packets: PacketSize[], durationS: number): ActivityTrack {
  const bins = new Array<number>(Math.ceil(durationS / ACTIVITY_BIN_S)).fill(0);
  for (const p of packets) {
    const i = Math.floor(p.timestamp / ACTIVITY_BIN_S);
    if (p.type === "delta" && i >= 0 && i < bins.length) bins[i] = (bins[i] ?? 0) + p.byteLength;
  }
  const at = (i: number) => bins[Math.min(Math.max(i, 0), bins.length - 1)] ?? 0;
  const smooth = bins.map((_, i) => (at(i - 1) + at(i) + at(i + 1)) / 3);
  const sorted = [...smooth].sort((a, b) => a - b);
  const floor = quantile(sorted, 0.1);
  const range = Math.max(quantile(sorted, 0.99) - floor, floor);
  if (range <= 0) return smooth.map(() => 0);
  return smooth.map((v) => Math.min(Math.max((v - floor) / range, 0), 1));
}

// Metadata only: no decoding, so a 16 min 1080p recording scans in about 0.1 s.
export async function readPacketSizes(source: VideoSource): Promise<PacketSize[]> {
  const input = openVideo(source);
  try {
    const track = await input.getPrimaryVideoTrack();
    if (!track) throw new Error("The recording has no video track.");
    const sizes: PacketSize[] = [];
    const packets = new EncodedPacketSink(track).packets(undefined, undefined, {
      metadataOnly: true,
    });
    for await (const p of packets) {
      sizes.push({ timestamp: p.timestamp, byteLength: p.byteLength, type: p.type });
    }
    return sizes;
  } finally {
    input.dispose();
  }
}
