import { ALL_FORMATS, BlobSource, Input } from "mediabunny";
import type { VideoProbe } from "@/shared/types";

// BlobSource reads byte ranges on demand, so an hour-long recording is never loaded whole.
export function openVideo(file: File): Input<BlobSource> {
  return new Input({ formats: ALL_FORMATS, source: new BlobSource(file) });
}

export async function probeVideo(file: File): Promise<VideoProbe> {
  const input = openVideo(file);
  try {
    const track = await input.getPrimaryVideoTrack();
    if (!track) throw new Error(`${file.name} has no video track.`);
    if (!(await track.canDecode())) {
      throw new Error(
        `This browser cannot decode the ${track.codec ?? "unknown"} video in ${file.name}. Use Chrome or Edge.`,
      );
    }
    return {
      durationS: await input.computeDuration(),
      width: await track.getDisplayWidth(),
      height: await track.getDisplayHeight(),
    };
  } finally {
    input.dispose();
  }
}
