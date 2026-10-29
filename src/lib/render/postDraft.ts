import { formatDuration, wordCount } from "@/lib/plan/autoPlan";
import type { Constraints, EDL, Step } from "@/shared/types";

export type PostDraft = { x: string; linkedin: string };

const X_LIMIT = 280;

// X's weighting (twitter-text config v3): these code points count 1, every other one 2, so CJK
// titles fill a post twice as fast. An emoji sequence counts 2 on X but more here, which only
// errs short.
const LIGHT: [number, number][] = [
  [0, 4351],
  [8192, 8205],
  [8208, 8223],
  [8242, 8247],
];

export function xLength(text: string): number {
  let length = 0;
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    length += LIGHT.some(([lo, hi]) => code >= lo && code <= hi) ? 1 : 2;
  }
  return length;
}

// Steps are dropped from the end until the post fits.
function fitX(head: string, steps: string[], tail: string): string {
  for (let n = steps.length; n >= 0; n--) {
    const text = [head, steps.slice(0, n).join("\n"), tail].filter(Boolean).join("\n\n");
    if (xLength(text) <= X_LIMIT) return text;
  }
  let cut = "";
  for (const char of head) {
    if (xLength(cut + char) > X_LIMIT - 1) break;
    cut += char;
  }
  return `${cut}…`;
}

// Drafts list the steps in the reel, whether dropped by hand or cut to fit the length, under the
// titles the reel shows; the stats count the whole session, as the outro card does.
export function postDraft(
  steps: Step[],
  constraints: Constraints,
  edl: EDL,
  rawS: number,
): PostDraft {
  const inReel = new Set(edl.segments.flatMap((s) => (s.outDur > 0 && s.step ? [s.step] : [])));
  const titles = steps
    .filter((s) => inReel.has(s.index))
    .map((s) => constraints.titles[s.index] ?? s.title);
  const words = steps.reduce((sum, s) => sum + wordCount(s.prompt), 0);
  const prompts = `${steps.length} prompt${steps.length === 1 ? "" : "s"}`;
  const stats = `${prompts}, ${words} words dictated with Wispr Flow. ${formatDuration(rawS)} of building cut to a ${formatDuration(edl.totalS)} reel.`;
  const numbered = titles.map((title, i) => `${i + 1}. ${title}`);

  const x = fitX(
    `Built this with Claude Code, by voice. ${stats}`,
    numbered,
    "Reel made with Buildreel.",
  );
  const linkedin = [
    "I built this with Claude Code, by voice.",
    stats,
    `What happened, step by step:\n${numbered.join("\n")}`,
    "The reel was cut automatically from my screen recording and the session log with Buildreel.",
  ].join("\n\n");
  return { x, linkedin };
}
