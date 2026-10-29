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

// Tool chips keep their source time so a renderer can show each one as the fast-forward passes it.
export type Overlay =
  { kind: "prompt" | "title" | "stats"; text: string } | { kind: "tools"; tools: Step["tools"] };

// One stretch of the output reel. Source times are seconds on the video timeline; a "cut" never
// appears, because the planner simply leaves that footage out.
export type Segment = { id: string; step?: number; outDur: number; overlay?: Overlay } & (
  | { mode: "card" }
  | { mode: "hold"; srcT: number }
  | { mode: "real"; src: [number, number] }
  | { mode: "fast"; src: [number, number]; speed: number }
);

export type EDL = { segments: Segment[]; totalS: number };

// The editing intent. Steering changes Constraints and the planner recomputes the EDL from them,
// so every edit stays within the target and undo is a stack of Constraints.
export type Constraints = {
  targetS: number;
  pinned: number[];
  dropped: number[];
  emphasis: Record<number, number>; // step -> extra real-time seconds
  speed: Record<number, number>; // step -> forced fast-forward factor
  titles: Record<number, string>;
  prompts: Record<number, string>; // step -> prompt text as edited for the card
  hiddenPrompts: number[]; // steps shown without their prompt card
  intro?: string;
  outro?: string;
};
