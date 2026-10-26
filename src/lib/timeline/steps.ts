import { ACTIVITY_BIN_S, type ActivityTrack, type AlignedEvent, type Step } from "@/shared/types";

type Draft = {
  prompt: Extract<AlignedEvent, { kind: "prompt" }>;
  turnEnd?: number;
  tools: Step["tools"];
};

const TITLE_MAX = 48;
// A sentence ends at . ! or ? before whitespace, except after common abbreviations.
const SENTENCE_END = /(?<!\b(?:e\.g|i\.e|etc|vs|Dr|Mr|Mrs|Ms|St)\.)(?<=[.!?])\s+|\n/;

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

// Each bin counts by how much of it the window covers, so a window clipping a busy bin's edge
// does not inherit the whole bin's score.
function meanActivity(activity: ActivityTrack, from: number, to: number): number {
  if (to <= from) return 0;
  let sum = 0;
  for (let i = Math.floor(from / ACTIVITY_BIN_S); i < Math.ceil(to / ACTIVITY_BIN_S); i++) {
    const overlap = Math.min(to, (i + 1) * ACTIVITY_BIN_S) - Math.max(from, i * ACTIVITY_BIN_S);
    sum += (activity[i] ?? 0) * overlap;
  }
  return sum / (to - from);
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
