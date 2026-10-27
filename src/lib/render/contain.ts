// The largest rectangle with the source's aspect ratio that fits the frame, centred: the same
// placement the <video> element uses, so keyframes and video line up in preview and export.
export function containRect(
  sourceW: number,
  sourceH: number,
  frameW: number,
  frameH: number,
): [number, number, number, number] {
  const scale = Math.min(frameW / sourceW, frameH / sourceH);
  const w = sourceW * scale;
  const h = sourceH * scale;
  return [(frameW - w) / 2, (frameH - h) / 2, w, h];
}
