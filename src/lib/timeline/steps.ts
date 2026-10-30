import type { ActivityTrack, AlignedEvent, Constraints, Step } from "@/shared/types";
import { meanActivity } from "./activityWindow";

type Draft = {
  prompt: Extract<AlignedEvent, { kind: "prompt" }>;
  turnEnd?: number;
  tools: Step["tools"];
};

const TITLE_MAX = 48;
// A sentence ends at . ! or ? before whitespace, except after common abbreviations.
const SENTENCE_END = /(?<!\b(?:e\.g|i\.e|etc|vs|dr|mr|mrs|ms|st)\.)(?<=[.!?])\s+|\n/i;

// Fallback title, and the only one until LLM titles exist: the first sentence, cut at a word.
// Lengths count code points (ellipsis included) so a cut never splits a surrogate pair.
function titleOf(prompt: string): string {
  const sentence = prompt.split(SENTENCE_END)[0]?.trim() ?? "";
  const chars = Array.from(sentence);
  if (chars.length <= TITLE_MAX) return sentence;
  const cut = chars.slice(0, TITLE_MAX - 1).join("");
  return `${cut.replace(/\s+\S*$/, "")}…`;
}

// Work attaches to the latest prompt of its own session, so overlapping sessions keep their
// tools and turn ends; buildSteps then clamps each step at the next prompt of any session.
function drafts(events: AlignedEvent[]): Draft[] {
  const out: Draft[] = [];
  const open = new Map<string, Draft>();
  for (const e of events) {
    if (e.kind === "prompt") {
      const draft: Draft = { prompt: e, tools: [] };
      out.push(draft);
      open.set(e.sessionId, draft);
      continue;
    }
    // Work logged before its session's first prompt belongs to no step.
    const draft = open.get(e.sessionId);
    if (draft && e.kind === "turnEnd") draft.turnEnd = e.t;
    if (draft && e.kind === "tool") draft.tools.push({ t: e.t, label: e.label });
  }
  return out;
}

export function buildSteps(
  events: AlignedEvent[],
  durationS: number,
  activity: ActivityTrack,
): { steps: Step[]; droppedSteps: number } {
  const all = drafts(events);
  const steps: Step[] = [];
  let droppedSteps = 0;
  all.forEach((draft, i) => {
    const promptT = draft.prompt.t;
    if (promptT < 0 || promptT > durationS) {
      droppedSteps++;
      return;
    }
    const reviewEnd = Math.min(all[i + 1]?.prompt.t ?? durationS, durationS);
    // A turn with no logged end (cut off by the next prompt) ends at its last tool call.
    const workEnd = Math.min(draft.turnEnd ?? draft.tools.at(-1)?.t ?? promptT, reviewEnd);
    steps.push({
      index: steps.length + 1,
      prompt: draft.prompt.text,
      title: titleOf(draft.prompt.text),
      promptT,
      workEnd,
      reviewEnd,
      tools: draft.tools.filter((tool) => tool.t <= workEnd),
      reviewActivity: meanActivity(activity, workEnd, reviewEnd),
    });
  });
  return { steps, droppedSteps };
}

// A title never says more than its card: a hidden prompt is "Step N" and an edited one is named
// from the edit, so wording taken out in review cannot come back as a title, caption or post.
// Otherwise the model's title, if any, else the first sentence.
export function shownTitle(
  step: Step,
  constraints: Constraints,
  autoTitles: Record<number, string>,
): string {
  if (constraints.hiddenPrompts.includes(step.index)) return `Step ${step.index}`;
  const edited = constraints.prompts[step.index];
  return edited !== undefined ? titleOf(edited) : (autoTitles[step.index] ?? step.title);
}
