import type { AlignedEvent, Step } from "@/shared/types";

type Draft = {
  prompt: Extract<AlignedEvent, { kind: "prompt" }>;
  turnEnd?: number;
  tools: Step["tools"];
};

const TITLE_MAX = 48;

// Fallback title, and the only one until LLM titles exist: the first sentence, cut at a word.
function titleOf(prompt: string): string {
  const sentence = prompt.split(/(?<=[.!?])\s|\n/)[0]?.trim() ?? "";
  if (sentence.length <= TITLE_MAX) return sentence;
  return `${sentence.slice(0, TITLE_MAX).replace(/\s+\S*$/, "")}…`;
}

function drafts(events: AlignedEvent[]): Draft[] {
  const out: Draft[] = [];
  for (const e of events) {
    if (e.kind === "prompt") {
      out.push({ prompt: e, tools: [] });
      continue;
    }
    // Work logged before the first prompt belongs to no step.
    const draft = out.at(-1);
    if (draft && e.kind === "turnEnd") draft.turnEnd = e.t;
    if (draft && e.kind === "tool") draft.tools.push({ t: e.t, label: e.label });
  }
  return out;
}

export function buildSteps(
  events: AlignedEvent[],
  durationS: number,
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
    });
  });
  return { steps, droppedSteps };
}
