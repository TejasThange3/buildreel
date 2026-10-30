import { DENOISE_RATE } from "@/lib/audio/cleanVoice";
import { loadRnnoise } from "@/lib/audio/rnnoise";
import { createStreamCleaner } from "@/lib/audio/streamCleaner";

export type PreviewSound = {
  setClean: (on: boolean) => void;
  resume: () => void;
  close: () => void;
};

// About 21 ms at 48 kHz: short enough that sound stays with the picture.
const BLOCK = 1024;

// Routes the preview's media elements through the same RNNoise model the export uses, so the
// preview sounds like the file it will make. This RNNoise build refuses to load inside an
// AudioWorklet (it checks for a window or worker scope), so the cleaning runs in a
// ScriptProcessorNode on the main thread; at about 0.1 ms a frame that is cheap. Until the model
// loads, and while cleaning is off, sound passes through unchanged.
export function connectPreviewSound(elements: HTMLMediaElement[]): PreviewSound {
  const context = new AudioContext({ sampleRate: DENOISE_RATE });
  // Two channels in and out: cleaning mixes them to one voice like the export does, and with
  // cleaning off a stereo recording plays as stereo.
  const node = context.createScriptProcessor(BLOCK, 2, 2);
  const mono = new Float32Array(BLOCK);
  for (const element of elements) context.createMediaElementSource(element).connect(node);
  node.connect(context.destination);

  let clean = true;
  let closed = false;
  let cleaner: ((input: Float32Array, output: Float32Array) => void) | undefined;
  let release = () => {};
  loadRnnoise().then((rnnoise) => {
    if (closed) return;
    const state = rnnoise.createDenoiseState();
    release = () => state.destroy();
    cleaner = createStreamCleaner(rnnoise.frameSize, (frame) => state.processFrame(frame));
  }, reportError);

  node.onaudioprocess = ({ inputBuffer, outputBuffer }) => {
    const [left, right] = [inputBuffer.getChannelData(0), inputBuffer.getChannelData(1)];
    const [outLeft, outRight] = [outputBuffer.getChannelData(0), outputBuffer.getChannelData(1)];
    if (!clean || !cleaner) {
      outLeft.set(left);
      outRight.set(right);
      return;
    }
    for (let i = 0; i < mono.length; i++) mono[i] = ((left[i] ?? 0) + (right[i] ?? 0)) / 2;
    cleaner(mono, outLeft);
    outRight.set(outLeft);
  };

  return {
    setClean: (on) => (clean = on),
    // Browsers start audio only after a click, so play resumes the context.
    resume: () => void context.resume(),
    close: () => {
      closed = true;
      node.onaudioprocess = null;
      release();
      void context.close();
    },
  };
}
