import { CanvasSink } from "mediabunny";
import type { PacketSize } from "./activity";
import { openVideo } from "./probe";

// A keyframe decodes on its own, so a fast-forward too fast to play (OBS writes one every
// ~8.3 s; a 26 min turn in 3 s is 532x) is drawn from consecutive keyframes: a timelapse.
export function keyframeTimes(packets: PacketSize[]): number[] {
  return packets
    .filter((p) => p.type === "key")
    .map((p) => p.timestamp)
    .sort((a, b) => a - b);
}

// The last keyframe at or before t (the first one for earlier times).
export function keyframeAt(times: number[], t: number): number | undefined {
  let lo = 0;
  let hi = times.length - 1;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if ((times[mid] ?? 0) <= t) lo = mid;
    else hi = mid - 1;
  }
  return times[lo];
}

export type KeyframeReader = {
  frame: (keyT: number) => Promise<CanvasImageSource | undefined>;
  dispose: () => void;
};

// Decoded keyframes at preview size are about 2 MB each; 24 of them cover a few seconds of
// hopping without holding a whole recording in memory.
const CACHE_SIZE = 24;

export async function openKeyframes(file: File, width: number): Promise<KeyframeReader> {
  const input = openVideo(file);
  const track = await input.getPrimaryVideoTrack();
  if (!track) throw new Error(`${file.name} has no video track.`);
  const sink = new CanvasSink(track, { width });
  const cache = new Map<number, CanvasImageSource>();
  return {
    frame: async (keyT) => {
      const hit = cache.get(keyT);
      if (hit) return hit;
      const wrapped = await sink.getCanvas(keyT);
      if (!wrapped) return undefined;
      cache.set(keyT, wrapped.canvas);
      if (cache.size > CACHE_SIZE) cache.delete(cache.keys().next().value ?? keyT);
      return wrapped.canvas;
    },
    dispose: () => input.dispose(),
  };
}
