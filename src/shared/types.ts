// `at` is epoch milliseconds (UTC), taken from the log line's timestamp. Every event keeps its
// session, so work from overlapping sessions stays with the prompt that started it.
export type BuildEvent = { at: number; sessionId: string } & (
  | { kind: "prompt"; text: string }
  | { kind: "tool"; tool: string; label: string }
  | { kind: "reply" }
  | { kind: "turnEnd" }
  | { kind: "interrupt" }
);

export type ParsedLog = { events: BuildEvent[]; skippedLines: number };

export const ACTIVITY_BIN_S = 0.5;

// One 0..1 score per ACTIVITY_BIN_S of video: how much the screen changed.
export type ActivityTrack = number[];

// startedAt: epoch ms at media time 0, the same clock as BuildEvent.at. Video times everywhere
// are media timestamps, as the <video> element and Mediabunny report them.
export type VideoProbe = { durationS: number; width: number; height: number; startedAt: number };

// t: seconds on the video's media timeline.
export type AlignedEvent = BuildEvent & { t: number };

// Times are seconds on the video timeline. Work runs [promptT, workEnd], review [workEnd, reviewEnd].
export type Step = {
  index: number; // 1-based, shown to the user and to the LLM
  prompt: string;
  title: string;
  promptT: number;
  workEnd: number;
  reviewEnd: number;
  tools: { t: number; label: string }[];
  reviewActivity: number; // 0..1 mean activity during review
};
