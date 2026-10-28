import {
  AudioSampleSink,
  AudioSampleSource,
  BufferTarget,
  CanvasSink,
  CanvasSource,
  getFirstEncodableAudioCodec,
  getFirstEncodableVideoCodec,
  Mp4OutputFormat,
  Output,
  QUALITY_HIGH,
} from "mediabunny";
import { openVideo } from "@/lib/media/probe";
import type { EDL } from "@/shared/types";
import { drawOverlay, type OverlayFonts } from "./drawOverlay";
import { FPS, outputFrames } from "./frames";
import { audioSamples, renderReelAudio } from "./reelAudio";

// The browser cannot encode a format this export needs; the UI shows it as a capability message.
export class ExportUnsupportedError extends Error {}

export type ExportOptions = {
  file: File;
  edl: EDL;
  keyTimes: number[];
  fonts: OverlayFonts;
  maxHeight: number;
  onProgress: (fraction: number) => void;
  signal: AbortSignal;
};

// The loop runs on the main thread, so it hands control back to the page every few frames to keep
// progress and the cancel button responsive. A message, unlike setTimeout, is not throttled to
// once a second when the tab is in the background, so switching tabs does not stall the export.
const YIELD_EVERY = 8;
const yieldToPage = () =>
  new Promise<void>((resolve) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = () => resolve();
    channel.port2.postMessage(null);
  });

const even = (n: number) => Math.max(2, Math.round(n / 2) * 2);

// ARCHITECTURE.md 6.9: every output frame is remapped to its source moment, decoded in order,
// drawn with the same overlay as the preview and encoded; sound comes only from real-time parts.
export async function exportMp4({
  file,
  edl,
  keyTimes,
  fonts,
  maxHeight,
  onProgress,
  signal,
}: ExportOptions): Promise<Blob> {
  const input = openVideo(file);
  try {
    const video = await input.getPrimaryVideoTrack();
    if (!video) throw new Error(`${file.name} has no video track.`);
    const height = even(Math.min(maxHeight, video.displayHeight));
    const width = even((height * video.displayWidth) / video.displayHeight);
    const videoCodec = await getFirstEncodableVideoCodec(["avc", "vp9", "av1"], {
      width,
      height,
    });
    if (!videoCodec)
      throw new ExportUnsupportedError(
        "This browser cannot encode video. Export works in a recent Chrome or Edge.",
      );

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new ExportUnsupportedError("This browser cannot draw the export canvas.");

    const output = new Output({
      format: new Mp4OutputFormat({ fastStart: "in-memory" }),
      target: new BufferTarget(),
    });
    const videoSource = new CanvasSource(canvas, { codec: videoCodec, bitrate: QUALITY_HIGH });
    output.addVideoTrack(videoSource, { frameRate: FPS });

    const audio = await input.getPrimaryAudioTrack();
    const channels = audio ? Math.min(audio.numberOfChannels, 2) : 0;
    const audioCodec =
      audio &&
      (await getFirstEncodableAudioCodec(["aac", "opus"], {
        numberOfChannels: channels,
        sampleRate: audio.sampleRate,
      }));
    const audioSource = audioCodec
      ? new AudioSampleSource({ codec: audioCodec, bitrate: QUALITY_HIGH })
      : undefined;
    if (audioSource) output.addAudioTrack(audioSource);

    await output.start();
    try {
      // The soundtrack is small, so it goes in whole before the video.
      if (audio && audioSource) {
        const planes = await renderReelAudio(
          new AudioSampleSink(audio),
          edl,
          audio.sampleRate,
          channels,
          signal,
        );
        for (const sample of audioSamples(planes, audio.sampleRate)) {
          await audioSource.add(sample);
          sample.close();
        }
      }

      const frames = [...outputFrames(edl, keyTimes)];
      const sink = new CanvasSink(video, { width, height, fit: "contain" });
      const decoded = sink.canvasesAtTimestamps(
        frames.flatMap((f) => (f.frameT === undefined ? [] : [f.frameT])),
      );
      for (const frame of frames) {
        signal.throwIfAborted();
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, width, height);
        if (frame.frameT !== undefined) {
          const { value } = await decoded.next();
          if (value) ctx.drawImage(value.canvas, 0, 0);
        }
        drawOverlay(ctx, frame.segment, frame.local, frame.srcT, fonts);
        await videoSource.add(frame.outT, 1 / FPS);
        if (frame.index % YIELD_EVERY === 0) {
          onProgress(frame.index / frames.length);
          await yieldToPage();
        }
      }
      await decoded.return();
      await output.finalize();
    } catch (error) {
      await output.cancel();
      throw error;
    }
    onProgress(1);
    const buffer = output.target.buffer;
    if (!buffer) throw new Error("The export finished without a file.");
    return new Blob([buffer], { type: output.format.mimeType });
  } finally {
    input.dispose();
  }
}
