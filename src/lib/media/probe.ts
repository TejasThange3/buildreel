import { ALL_FORMATS, BlobSource, Input, UnsupportedInputFormatError, UrlSource } from "mediabunny";
import type { VideoProbe } from "@/shared/types";
import { recordingStart } from "./startTime";

// A dropped file, or the bundled sample by URL. Both are read in byte ranges on demand, so an
// hour-long file is never loaded whole and the sample opens without downloading its video.
export type VideoSource = File | URL;

export function openVideo(source: VideoSource): Input {
  return new Input({
    formats: ALL_FORMATS,
    source: source instanceof File ? new BlobSource(source) : new UrlSource(source),
  });
}

async function primaryVideoTrack(input: Input, name: string) {
  try {
    return await input.getPrimaryVideoTrack();
  } catch (error) {
    if (!(error instanceof UnsupportedInputFormatError)) throw error;
    throw new Error(`${name} is not a video this app can read. Record MP4 or MKV in OBS.`);
  }
}

// name and lastModified feed the start-time guess; a URL has no mtime, so its caller passes one.
export async function probeVideo(
  source: VideoSource,
  file: { name: string; lastModified: number },
): Promise<VideoProbe> {
  const input = openVideo(source);
  try {
    const track = await primaryVideoTrack(input, file.name);
    if (!track) throw new Error(`${file.name} has no video track.`);
    if (!(await track.canDecode())) {
      throw new Error(
        `This browser cannot decode the ${track.codec ?? "unknown"} video in ${file.name}. Use Chrome or Edge.`,
      );
    }
    const durationS = await input.computeDuration();
    if (!Number.isFinite(durationS) || durationS <= 0) {
      throw new Error(`${file.name} has no readable length. In OBS, use File > Remux Recordings.`);
    }
    return {
      durationS,
      width: await track.getDisplayWidth(),
      height: await track.getDisplayHeight(),
      startedAt: recordingStart(file, durationS),
    };
  } finally {
    input.dispose();
  }
}
