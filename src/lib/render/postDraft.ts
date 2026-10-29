import { formatDuration, wordCount } from "@/lib/plan/autoPlan";
import type { Constraints, Step } from "@/shared/types";

export type PostDraft = { x: string; linkedin: string };

const X_LIMIT = 280;

// Steps are dropped from the end until the post fits. X weighs links and emoji differently, but
// drafts carry neither, so a plain length check is exact.
function fitX(head: string, steps: string[], tail: string): string {
  for (let n = steps.length; n >= 0; n--) {
    const text = [head, steps.slice(0, n).join("\n"), tail].filter(Boolean).join("\n\n");
    if (text.length <= X_LIMIT) return text;
  }
  return `${head.slice(0, X_LIMIT - 1)}…`;
}

// Drafts list the steps that made the cut, under the titles the reel shows; the stats count the
// whole session, as the outro card does.
export function postDraft(
  steps: Step[],
  constraints: Constraints,
  rawS: number,
  reelS: number,
): PostDraft {
  const kept = steps.filter((s) => !constraints.dropped.includes(s.index));
  const titles = kept.map((s) => constraints.titles[s.index] ?? s.title);
  const words = steps.reduce((sum, s) => sum + wordCount(s.prompt), 0);
  const prompts = `${steps.length} prompt${steps.length === 1 ? "" : "s"}`;
  const stats = `${prompts}, ${words} words dictated with Wispr Flow. ${formatDuration(rawS)} of building cut to a ${formatDuration(reelS)} reel.`;
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
