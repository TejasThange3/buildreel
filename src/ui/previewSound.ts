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
  const node = context.createScriptProcessor(BLOCK, 1, 1);
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
    const input = inputBuffer.getChannelData(0);
    const output = outputBuffer.getChannelData(0);
    if (clean && cleaner) cleaner(input, output);
    else output.set(input);
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
