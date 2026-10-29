import { AudioSample, type AudioSampleSink } from "mediabunny";
import type { EDL } from "@/shared/types";

export type RealWindow = { src: [number, number]; outStart: number };

// Only real-time segments carry sound: the reviewer's own voice and clicks. Prompt cards, title
// cards and fast-forwards are silent, since sped-up audio is noise.
export function realWindows(edl: EDL): RealWindow[] {
  const windows: RealWindow[] = [];
  let at = 0;
  for (const segment of edl.segments) {
    if (segment.mode === "real" && segment.outDur > 0)
      windows.push({ src: segment.src, outStart: at });
    at += segment.outDur;
  }
  return windows;
}

const FADE_S = 0.012;

// A short linear ramp at both ends of a cut, so sound starts and stops without a click.
export function fadeEdges(channel: Float32Array, start: number, end: number, sampleRate: number) {
  const ramp = Math.min(Math.round(FADE_S * sampleRate), Math.floor((end - start) / 2));
  for (let i = 0; i < ramp; i++) {
    const gain = i / ramp;
    channel[start + i] = (channel[start + i] ?? 0) * gain;
    channel[end - 1 - i] = (channel[end - 1 - i] ?? 0) * gain;
  }
}

// Rewrites planes[c][start, end) in place, such as removing background noise from a window.
export type WindowFilter = (planes: Float32Array[], start: number, end: number) => void;

// The reel's whole soundtrack as one plane per channel: silence, with each real-time window's
// source audio written at its output time, filtered, and faded at the cuts.
export async function renderReelAudio(
  sink: AudioSampleSink,
  edl: EDL,
  sampleRate: number,
  channels: number,
  signal: AbortSignal,
  filter?: WindowFilter,
): Promise<Float32Array[]> {
  const length = Math.ceil(edl.totalS * sampleRate);
  const planes = Array.from({ length: channels }, () => new Float32Array(length));
  for (const { src, outStart } of realWindows(edl)) {
    const start = Math.round(outStart * sampleRate);
    const end = Math.min(start + Math.round((src[1] - src[0]) * sampleRate), length);
    // Fades go where audio was actually written, which is shorter than the window when the
    // source audio ends early.
    let first = end;
    let last = start;
    for await (const sample of sink.samples(src[0], src[1])) {
      try {
        signal.throwIfAborted();
        const offset = start + Math.round((sample.timestamp - src[0]) * sampleRate);
        const from = Math.max(start - offset, 0);
        const to = Math.min(sample.numberOfFrames, end - offset);
        if (to <= from) continue;
        const frames = new Float32Array(sample.numberOfFrames);
        planes.forEach((plane, c) => {
          // A mono source fills both channels of a stereo reel.
          sample.copyTo(frames, {
            planeIndex: Math.min(c, sample.numberOfChannels - 1),
            format: "f32-planar",
          });
          plane.set(frames.subarray(from, to), offset + from);
        });
        first = Math.min(first, offset + from);
        last = Math.max(last, offset + to);
      } finally {
        sample.close();
      }
    }
    if (last <= first) continue;
    filter?.(planes, first, last);
    for (const plane of planes) fadeEdges(plane, first, last, sampleRate);
  }
  return planes;
}

// The soundtrack cut into one-second samples for the encoder.
export function* audioSamples(planes: Float32Array[], sampleRate: number): Generator<AudioSample> {
  const length = planes[0]?.length ?? 0;
  for (let start = 0; start < length; start += sampleRate) {
    const frames = Math.min(sampleRate, length - start);
    const data = new Float32Array(frames * planes.length);
    planes.forEach((plane, c) => data.set(plane.subarray(start, start + frames), c * frames));
    yield new AudioSample({
      data,
      format: "f32-planar",
      numberOfChannels: planes.length,
      sampleRate,
      timestamp: start / sampleRate,
    });
  }
}
