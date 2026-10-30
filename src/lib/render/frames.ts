import { keyframeAt, TIMELAPSE_RATE } from "@/lib/media/keyframes";
import { remap, type Remapped } from "@/lib/plan/remap";
import type { EDL } from "@/shared/types";

export const FPS = 30;

// The epsilon keeps float noise in totalS (17.7 * 30 = 531.0000001) from adding a frame.
export function frameCount(edl: EDL): number {
  return Math.ceil(edl.totalS * FPS - 1e-6);
}

// srcT is the exact source time (overlays use it, as in the preview); frameT is the frame to
// decode, which differs only in a timelapse.
type OutputFrame = Remapped & { frameT?: number; outT: number; index: number };

// Every output frame of the reel in order, with the source moment it shows. Fast-forwards above
// the timelapse rate snap to the keyframe at or before their source time, exactly as the preview
// draws them, so export decodes keyframes only there.
export function* outputFrames(edl: EDL, keyTimes: number[]): Generator<OutputFrame> {
  const count = frameCount(edl);
  for (let index = 0; index < count; index++) {
    const outT = index / FPS;
    const r = remap(edl, outT);
    if (!r) return;
    const { segment, srcT } = r;
    const timelapse = segment.mode === "fast" && segment.speed > TIMELAPSE_RATE;
    yield {
      ...r,
      frameT: timelapse && srcT !== undefined ? (keyframeAt(keyTimes, srcT) ?? srcT) : srcT,
      outT,
      index,
    };
  }
}
