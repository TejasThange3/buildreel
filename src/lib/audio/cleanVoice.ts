// RNNoise runs on 48 kHz audio in 480-sample frames scaled like 16-bit PCM.
export const DENOISE_RATE = 48_000;
export const PCM_SCALE = 32_768;

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
  // RNNoise answers each frame with the one before it, so one frame of silence goes in after the
  // voice to flush its tail, and the output is read one frame late. Frames past the end are silent.
  const frames = Math.ceil(voice.length / frameSize) + 1;
  const output = new Float32Array(frames * frameSize);
  const frame = new Float32Array(frameSize);
  for (let k = 0; k < frames; k++) {
    for (let i = 0; i < frameSize; i++) frame[i] = (voice[k * frameSize + i] ?? 0) * PCM_SCALE;
    processFrame(frame);
    for (let i = 0; i < frameSize; i++) output[k * frameSize + i] = (frame[i] ?? 0) / PCM_SCALE;
  }

  const clean = resample(
    output.subarray(frameSize, frameSize + voice.length),
    DENOISE_RATE,
    sampleRate,
  );
  for (const plane of planes) plane.set(clean.subarray(0, length), start);
}
