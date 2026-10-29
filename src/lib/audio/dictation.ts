import { PCM_SCALE } from "./cleanVoice";

// RNNoise reports, for every frame it cleans, how likely the frame is speech. Keyboard clicks
// and fans score low, so its voice activity finds a dictated prompt where loudness alone would
// also find typing.
export function voiceActivity(
  samples: Float32Array,
  frameSize: number,
  processFrame: (frame: Float32Array) => number,
): Float32Array {
  const vad = new Float32Array(Math.ceil(samples.length / frameSize));
  const frame = new Float32Array(frameSize);
  for (let k = 0; k < vad.length; k++) {
    for (let i = 0; i < frameSize; i++) frame[i] = (samples[k * frameSize + i] ?? 0) * PCM_SCALE;
    vad[k] = processFrame(frame);
  }
  return vad;
}

// Tuned on real Wispr dictations: a 50 ms average rides over the gaps between syllables, pauses
// up to 0.7 s stay inside one prompt, and anything with under 0.6 s of speech is a cough or a
// word to someone else. Clips keep a little air before and after and at most 15 s.
const SMOOTH_FRAMES = 5;
const SPEECH = 0.5;
const MAX_GAP_S = 0.7;
const MIN_SPEECH_S = 0.6;
const PAD_BEFORE_S = 0.15;
const PAD_AFTER_S = 0.3;
const MAX_CLIP_S = 15;

type Run = { start: number; end: number; speech: number };

// The last stretch of speech in a window, in seconds from the window's start.
export function lastSpeech(vad: ArrayLike<number>, frameS: number): [number, number] | undefined {
  // A centred average, so smoothing neither delays a clip's start nor stretches its end.
  const sums = [0];
  for (let k = 0; k < vad.length; k++) sums.push((sums[k] ?? 0) + (vad[k] ?? 0));
  const half = Math.floor(SMOOTH_FRAMES / 2);
  const runs: Run[] = [];
  for (let k = 0; k < vad.length; k++) {
    const lo = Math.max(0, k - half);
    const hi = Math.min(vad.length, k + half + 1);
    if (((sums[hi] ?? 0) - (sums[lo] ?? 0)) / (hi - lo) < SPEECH) continue;
    const last = runs.at(-1);
    if (last && (k - last.end) * frameS <= MAX_GAP_S) {
      last.end = k + 1;
      last.speech++;
    } else runs.push({ start: k, end: k + 1, speech: 1 });
  }
  const run = runs.findLast((r) => r.speech * frameS >= MIN_SPEECH_S);
  if (!run) return undefined;
  const end = Math.min(vad.length * frameS, run.end * frameS + PAD_AFTER_S);
  const start = Math.max(0, run.start * frameS - PAD_BEFORE_S, end - MAX_CLIP_S);
  return [start, end];
}
