import { EncodedPacketSink } from "mediabunny";
import { openVideo } from "./probe";

export type PacketSize = { timestamp: number; byteLength: number; type: "key" | "delta" };

// Metadata only: no decoding, so a 16 min 1080p recording scans in about 0.1 s.
export async function readPacketSizes(file: File): Promise<PacketSize[]> {
  const input = openVideo(file);
  try {
    const track = await input.getPrimaryVideoTrack();
    if (!track) throw new Error(`${file.name} has no video track.`);
    const sizes: PacketSize[] = [];
    const packets = new EncodedPacketSink(track).packets(undefined, undefined, {
      metadataOnly: true,
    });
    for await (const p of packets) {
      sizes.push({ timestamp: p.timestamp, byteLength: p.byteLength, type: p.type });
    }
    return sizes;
  } finally {
    input.dispose();
  }
}
