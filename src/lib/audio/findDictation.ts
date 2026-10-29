import { AudioSampleSink } from "mediabunny";
import { openVideo } from "@/lib/media/probe";
import type { Step } from "@/shared/types";
import { DENOISE_RATE, resample } from "./cleanVoice";
import { lastSpeech, voiceActivity } from "./dictation";
import { loadRnnoise } from "./rnnoise";

// Wispr types the words once you let go of the key, so a prompt is spoken in the half minute
// before it is sent, and never before the previous prompt.
const LOOKBACK_S = 30;

// The source audio of [from, to) mixed to one channel.
async function readMono(sink: AudioSampleSink, from: number, to: number, rate: number) {
  const mono = new Float32Array(Math.max(0, Math.ceil((to - from) * rate)));
  for await (const sample of sink.samples(from, to)) {
    try {
      const offset = Math.round((sample.timestamp - from) * rate);
      const plane = new Float32Array(sample.numberOfFrames);
      for (let c = 0; c < sample.numberOfChannels; c++) {
        sample.copyTo(plane, { planeIndex: c, format: "f32-planar" });
        plane.forEach((v, i) => {
          const at = offset + i;
          if (at >= 0 && at < mono.length) mono[at] = (mono[at] ?? 0) + v / sample.numberOfChannels;
        });
      }
    } finally {
      sample.close();
    }
  }
  return mono;
}

// Where each prompt was dictated, as source seconds; steps with no clear speech are left out.
export async function findDictation(
  file: File,
  steps: Step[],
): Promise<Record<number, [number, number]>> {
  const input = openVideo(file);
  try {
    const track = await input.getPrimaryAudioTrack();
    if (!track || !(await track.canDecode())) return {};
    const sink = new AudioSampleSink(track);
    const rnnoise = await loadRnnoise();
    const found: Record<number, [number, number]> = {};
    for (const [i, step] of steps.entries()) {
      const from = Math.max(0, step.promptT - LOOKBACK_S, steps[i - 1]?.promptT ?? 0);
      const mono = await readMono(sink, from, step.promptT, track.sampleRate);
      const state = rnnoise.createDenoiseState();
      try {
        const voice = resample(mono, track.sampleRate, DENOISE_RATE);
        const vad = voiceActivity(voice, rnnoise.frameSize, (frame) => state.processFrame(frame));
        const run = lastSpeech(vad, rnnoise.frameSize / DENOISE_RATE);
        if (run) found[step.index] = [from + run[0], from + run[1]];
      } finally {
        state.destroy();
      }
    }
    return found;
  } finally {
    input.dispose();
  }
}
