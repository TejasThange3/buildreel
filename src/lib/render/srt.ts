import type { EDL, Segment } from "@/shared/types";

type Cue = { start: number; end: number; text: string };

function timestamp(seconds: number): string {
  const ms = Math.round(seconds * 1000);
  const pad = (n: number, width = 2) => String(n).padStart(width, "0");
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor(ms / 60_000) % 60;
  const s = Math.floor(ms / 1000) % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms % 1000, 3)}`;
}

// A blank line ends an SRT cue, so overlay text keeps its line breaks but never an empty line.
function cueText(text: string): string {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

// Each tool chip runs from the moment the fast-forward passes it until the next chip or the end
// of the segment, matching what drawOverlay shows as the newest chip.
function toolCues(segment: Extract<Segment, { mode: "fast" }>, start: number): Cue[] {
  if (segment.overlay?.kind !== "tools") return [];
  const end = start + segment.outDur;
  const shown = segment.overlay.tools
    .filter((tool) => tool.t <= segment.src[1])
    .map((tool) => ({
      at: start + Math.max(0, tool.t - segment.src[0]) / segment.speed,
      label: tool.label,
    }));
  return shown.map((tool, i) => ({
    start: tool.at,
    end: Math.min(shown[i + 1]?.at ?? end, end),
    text: tool.label,
  }));
}

function segmentCues(segment: Segment, start: number): Cue[] {
  const overlay = segment.overlay;
  if (segment.mode === "fast") return toolCues(segment, start);
  if (!overlay || overlay.kind === "tools") return [];
  const text =
    overlay.kind === "title" && segment.mode !== "card" && segment.step !== undefined
      ? `Step ${segment.step}: ${overlay.text}`
      : overlay.text;
  return [{ start, end: start + segment.outDur, text }];
}

// Captions for every overlay the reel draws, on output time, as SubRip text.
export function buildSrt(edl: EDL): string {
  const cues: Cue[] = [];
  let at = 0;
  for (const segment of edl.segments) {
    if (segment.outDur > 0) cues.push(...segmentCues(segment, at));
    at += segment.outDur;
  }
  return cues
    .filter((cue) => cue.end > cue.start && cueText(cue.text))
    .map(
      (cue, i) =>
        `${i + 1}\n${timestamp(cue.start)} --> ${timestamp(cue.end)}\n${cueText(cue.text)}\n`,
    )
    .join("\n");
}
