// `at` is epoch milliseconds (UTC), taken from the log line's timestamp.
export type BuildEvent =
  | { kind: "prompt"; at: number; text: string; sessionId: string }
  | { kind: "tool"; at: number; tool: string; label: string }
  | { kind: "reply"; at: number }
  | { kind: "turnEnd"; at: number }
  | { kind: "interrupt"; at: number };

export type ParsedLog = { events: BuildEvent[]; skippedLines: number };

// One 0..1 score per ACTIVITY_BIN_S (0.5 s) of video: how much the screen changed.
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
};
