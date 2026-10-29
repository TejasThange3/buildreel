// RNNoise runs on 48 kHz audio in 480-sample frames scaled like 16-bit PCM.
export const DENOISE_RATE = 48_000;
const PCM_SCALE = 32_768;

// Linear interpolation is plenty for speech headed to a noise model and back; no output sample
// reads past the input.
export function resample(input: Float32Array, from: number, to: number): Float32Array {
  if (from === to) return input.slice();
  const output = new Float32Array(Math.max(1, Math.round((input.length * to) / from)));
  const step = from / to;
  const last = input.length - 1;
  for (let i = 0; i < output.length; i++) {
    const at = Math.min(i * step, last);
    const lo = Math.floor(at);
    const hi = Math.min(lo + 1, last);
    output[i] = (input[lo] ?? 0) + ((input[hi] ?? 0) - (input[lo] ?? 0)) * (at - lo);
  }
  return output;
}

// Denoises planes[c][start, end) in place: the channels mix to one voice track, run through the
// model frame by frame, and the clean voice goes back to every channel. A screen recording's
// sound is one microphone, so nothing stereo is lost.
export function cleanVoice(
  planes: Float32Array[],
  start: number,
  end: number,
  sampleRate: number,
  frameSize: number,
  processFrame: (frame: Float32Array) => void,
) {
  const length = end - start;
  if (length <= 0 || planes.length === 0) return;
  const mono = new Float32Array(length);
  for (const plane of planes)
    for (let i = 0; i < length; i++)
      mono[i] = (mono[i] ?? 0) + (plane[start + i] ?? 0) / planes.length;

  const voice = resample(mono, sampleRate, DENOISE_RATE);
  const frame = new Float32Array(frameSize);
  for (let at = 0; at < voice.length; at += frameSize) {
    // The last frame is padded with silence and only its real samples are kept.
    frame.fill(0);
    const take = Math.min(frameSize, voice.length - at);
    for (let i = 0; i < take; i++) frame[i] = (voice[at + i] ?? 0) * PCM_SCALE;
    processFrame(frame);
    for (let i = 0; i < take; i++) voice[at + i] = (frame[i] ?? 0) / PCM_SCALE;
  }

  const clean = resample(voice, DENOISE_RATE, sampleRate);
  for (const plane of planes) plane.set(clean.subarray(0, length), start);
}
