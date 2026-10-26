// OBS default file names ("2026-10-26 14-54-50.mp4") hold the local wall-clock start time.
const FILENAME_STAMP = /(\d{4})-(\d{2})-(\d{2})[ _T](\d{2})-(\d{2})-(\d{2})/;

export function startFromFilename(name: string): number | undefined {
  const m = FILENAME_STAMP.exec(name);
  if (!m) return undefined;
  const n = (i: number) => Number(m[i]);
  return new Date(n(1), n(2) - 1, n(3), n(4), n(5), n(6)).getTime();
}

// A recorder finalises the file when recording stops, so its mtime marks the end. On three
// real OBS recordings this landed within 1.2 s of the filename time.
export function recordingStart(file: { name: string; lastModified: number }, durationS: number) {
  return startFromFilename(file.name) ?? file.lastModified - durationS * 1000;
}
