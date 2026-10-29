import type { Segment } from "@/shared/types";
import { wrapText } from "./wrapText";

export type OverlayFonts = { sans: string; mono: string };

// u is the frame's short side. Sizes follow it, so a 9:16 frame gets the same type as 16:9 at
// the same resolution instead of type scaled to its tall side.
type Frame = {
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
  u: number;
  fonts: OverlayFonts;
};

const INK = "#ededef";
const MUTED = "#a1a1aa";
const PANEL = "rgba(10, 10, 12, 0.78)";
const EDGE = "rgba(255, 255, 255, 0.12)";
// The one accent marks voice: every prompt card is something the builder dictated.
const VOICE = "#ff7a59";
const FADE_S = 0.25;
const MAX_PROMPT_LINES = 5;
const VISIBLE_CHIPS = 3;

// Overlays ease in and out on output time, so preview and export draw identical frames.
function fadeAlpha(local: number, outDur: number): number {
  return Math.min(1, local / FADE_S, (outDur - local) / FADE_S);
}

function panel(f: Frame, x: number, y: number, w: number, h: number, r: number) {
  f.ctx.beginPath();
  f.ctx.roundRect(x, y, w, h, r);
  f.ctx.fillStyle = PANEL;
  f.ctx.fill();
  f.ctx.lineWidth = Math.max(1, f.u / 900);
  f.ctx.strokeStyle = EDGE;
  f.ctx.stroke();
}

function drawPrompt(f: Frame, text: string) {
  const { ctx, w, h, u, fonts } = f;
  ctx.fillStyle = "rgba(10, 10, 12, 0.45)";
  ctx.fillRect(0, 0, w, h);
  const size = Math.round(u * 0.036);
  const pad = size * 1.2;
  const width = Math.min(w * 0.88, size * 30);
  ctx.font = `600 ${size}px ${fonts.sans}`;
  const measure = (s: string) => ctx.measureText(s).width;
  const lines = wrapText(measure, text, width - pad * 2, MAX_PROMPT_LINES);
  const lineH = size * 1.32;
  const tag = size * 0.5;
  const height = pad * 2 + tag * 2.2 + lines.length * lineH;
  const x = (w - width) / 2;
  const y = h - height - u * 0.09;
  panel(f, x, y, width, height, size * 0.6);
  ctx.font = `500 ${tag}px ${fonts.mono}`;
  ctx.fillStyle = VOICE;
  ctx.textBaseline = "top";
  ctx.fillText("DICTATED", x + pad, y + pad);
  ctx.font = `600 ${size}px ${fonts.sans}`;
  ctx.fillStyle = INK;
  lines.forEach((line, i) => ctx.fillText(line, x + pad, y + pad + tag * 2.2 + i * lineH));
}

function drawTools(f: Frame, segment: Extract<Segment, { mode: "fast" }>, srcT: number) {
  const { ctx, w, h, u, fonts } = f;
  const size = Math.round(u * 0.022);
  const pad = size * 0.7;
  ctx.textBaseline = "middle";
  ctx.font = `500 ${size}px ${fonts.mono}`;
  const speed = `${Math.round(segment.speed)}x`;
  const speedW = ctx.measureText(speed).width + pad * 2;
  panel(f, w - speedW - u * 0.04, u * 0.04, speedW, size * 2, size);
  ctx.fillStyle = INK;
  ctx.fillText(speed, w - speedW - u * 0.04 + pad, u * 0.04 + size);
  // Chips appear as the fast-forward passes each tool call; the newest sits at the bottom.
  const seen =
    segment.overlay?.kind === "tools" ? segment.overlay.tools.filter((t) => t.t <= srcT) : [];
  seen.slice(-VISIBLE_CHIPS).forEach((tool, i, shown) => {
    const label = tool.label.length > 48 ? `${tool.label.slice(0, 47)}…` : tool.label;
    const chipW = ctx.measureText(label).width + pad * 2;
    const y = h - u * 0.06 - (shown.length - i) * size * 2.5;
    panel(f, u * 0.04, y, chipW, size * 2, size * 0.5);
    ctx.fillStyle = i === shown.length - 1 ? INK : MUTED;
    ctx.fillText(label, u * 0.04 + pad, y + size);
  });
}

function drawTitle(f: Frame, step: number | undefined, title: string) {
  const { ctx, w, h, u, fonts } = f;
  const size = Math.round(u * 0.026);
  const pad = size * 0.8;
  const label = step === undefined ? "" : `STEP ${step}`;
  ctx.textBaseline = "middle";
  ctx.font = `500 ${size * 0.7}px ${fonts.mono}`;
  const labelW = label ? ctx.measureText(label).width + pad : 0;
  ctx.font = `600 ${size}px ${fonts.sans}`;
  const x = u * 0.04;
  const titleW = Math.min(ctx.measureText(title).width, w - x * 2 - labelW - pad * 2);
  const y = h - u * 0.06 - size * 2.2;
  panel(f, x, y, labelW + titleW + pad * 2, size * 2.2, size * 1.1);
  ctx.font = `500 ${size * 0.7}px ${fonts.mono}`;
  ctx.fillStyle = MUTED;
  ctx.fillText(label, x + pad, y + size * 1.1);
  ctx.font = `600 ${size}px ${fonts.sans}`;
  ctx.fillStyle = INK;
  ctx.fillText(title, x + pad + labelW, y + size * 1.1, titleW);
}

function drawCard(f: Frame, kind: "title" | "stats", text: string) {
  const { ctx, w, h, u, fonts } = f;
  ctx.fillStyle = "#0a0a0c";
  ctx.fillRect(0, 0, w, h);
  const size = Math.round(u * (kind === "title" ? 0.07 : 0.04));
  ctx.font = `600 ${size}px ${fonts.sans}`;
  ctx.fillStyle = INK;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const lines = wrapText((s) => ctx.measureText(s).width, text, w * 0.7, Infinity);
  const lineH = size * 1.3;
  lines.forEach((line, i) => {
    ctx.fillStyle = i === 0 ? INK : MUTED;
    ctx.fillText(line, w / 2, h / 2 + (i - (lines.length - 1) / 2) * lineH);
  });
  ctx.textAlign = "start";
}

// Draws the overlay for one output moment over a frame already on the canvas (cards paint
// their own background). Shared by preview and export.
export function drawOverlay(
  ctx: CanvasRenderingContext2D,
  segment: Segment,
  local: number,
  srcT: number | undefined,
  fonts: OverlayFonts,
) {
  const { width: w, height: h } = ctx.canvas;
  const f: Frame = { ctx, w, h, u: Math.min(w, h), fonts };
  const overlay = segment.overlay;
  ctx.save();
  if (segment.mode === "card") {
    if (overlay && overlay.kind !== "tools" && overlay.kind !== "prompt")
      drawCard(f, overlay.kind, overlay.text);
    ctx.restore();
    return;
  }
  ctx.globalAlpha = fadeAlpha(local, segment.outDur);
  if (overlay?.kind === "prompt") drawPrompt(f, overlay.text);
  if (segment.mode === "fast" && srcT !== undefined) drawTools(f, segment, srcT);
  if (overlay?.kind === "title") drawTitle(f, segment.step, overlay.text);
  ctx.restore();
}
