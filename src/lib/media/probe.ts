import { ALL_FORMATS, BlobSource, Input, UnsupportedInputFormatError } from "mediabunny";
import type { VideoProbe } from "@/shared/types";
import { recordingStart } from "./startTime";

// BlobSource reads byte ranges on demand, so an hour-long recording is never loaded whole.
export function openVideo(file: File): Input<BlobSource> {
  return new Input({ formats: ALL_FORMATS, source: new BlobSource(file) });
}

async function primaryVideoTrack(input: Input<BlobSource>, name: string) {
  try {
    return await input.getPrimaryVideoTrack();
  } catch (error) {
    if (!(error instanceof UnsupportedInputFormatError)) throw error;
    throw new Error(`${name} is not a video this app can read. Record MP4 or MKV in OBS.`);
  }
}

export async function probeVideo(file: File): Promise<VideoProbe> {
  const input = openVideo(file);
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
