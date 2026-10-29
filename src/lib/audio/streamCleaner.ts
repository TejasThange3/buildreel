import { PCM_SCALE } from "./cleanVoice";

// Cleans live audio that arrives in blocks of any size with a model that works in fixed frames.
// Samples queue until a frame is full; one frame of silence is queued first, so every block can be
// answered in full. The model's own one-frame lag comes on top: about 20 ms at 48 kHz.
export function createStreamCleaner(
  frameSize: number,
  processFrame: (frame: Float32Array) => void,
): (input: Float32Array, output: Float32Array) => void {
  const frame = new Float32Array(frameSize);
  let filled = 0;
  let queue = new Float32Array(frameSize * 4);
  let head = 0;
  let size = frameSize;

  const push = (samples: Float32Array) => {
    if (head + size + samples.length > queue.length) {
      const next = new Float32Array(Math.max(queue.length, (size + samples.length) * 2));
      next.set(queue.subarray(head, head + size));
      queue = next;
      head = 0;
    }
    queue.set(samples, head + size);
    size += samples.length;
  };

  return (input, output) => {
    for (const sample of input) {
      frame[filled++] = sample * PCM_SCALE;
      if (filled < frameSize) continue;
      processFrame(frame);
      push(frame.map((v) => v / PCM_SCALE));
      filled = 0;
    }
    const take = Math.min(size, output.length);
    output.set(queue.subarray(head, head + take));
    output.fill(0, take);
    head += take;
    size -= take;
  };
}
