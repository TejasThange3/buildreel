import { create } from "zustand";
import { parseClaudeLogs } from "@/lib/log/parseClaudeLog";
import { activityTrack, readPacketSizes } from "@/lib/media/activity";
import { probeVideo } from "@/lib/media/probe";
import { planReel } from "@/lib/plan/autoPlan";
import { alignEvents } from "@/lib/timeline/align";
import { buildSteps } from "@/lib/timeline/steps";
import type { ActivityTrack, Constraints, EDL, ParsedLog, Step, VideoProbe } from "@/shared/types";

export type Recording = { file: File; url: string; probe: VideoProbe; activity: ActivityTrack };

type Derived = { steps: Step[]; droppedSteps: number; edl: EDL };

type Inputs = {
  recording?: Recording;
  log?: ParsedLog;
  offsetS: number;
  constraints: Constraints;
};

type ProjectState = Inputs &
  Derived & {
    synced: boolean;
    importing: boolean;
    importError?: string;
    importFiles: (files: File[]) => Promise<void>;
    setOffset: (offsetS: number) => void;
    confirmSync: () => void;
    toggleStep: (index: number) => void;
    setTarget: (seconds: number) => void;
  };

const DEFAULT_CONSTRAINTS: Constraints = {
  targetS: 90,
  pinned: [],
  dropped: [],
  emphasis: {},
  speed: {},
  titles: {},
};

const EMPTY: Derived = { steps: [], droppedSteps: 0, edl: { segments: [], totalS: 0 } };

function derive({ recording, log, offsetS, constraints }: Inputs): Derived {
  if (!recording || !log) return EMPTY;
  const { probe, activity } = recording;
  const events = alignEvents(log.events, probe.startedAt, offsetS);
  const { steps, droppedSteps } = buildSteps(events, probe.durationS, activity);
  return { steps, droppedSteps, edl: planReel(steps, activity, constraints, probe.durationS) };
}

const isLog = (file: File) => file.name.toLowerCase().endsWith(".jsonl");

async function readRecording(file: File): Promise<Recording> {
  const probe = await probeVideo(file);
  const activity = activityTrack(await readPacketSizes(file), probe.durationS);
  return { file, url: URL.createObjectURL(file), probe, activity };
}

export const useProject = create<ProjectState>()((set, get) => {
  // Every input change re-plans, so the EDL never goes stale.
  const update = (patch: Partial<Inputs>) => {
    const next = { ...get(), ...patch };
    set({ ...patch, ...derive(next) });
  };

  return {
    offsetS: 0,
    constraints: DEFAULT_CONSTRAINTS,
    ...EMPTY,
    synced: false,
    importing: false,

    importFiles: async (files) => {
      const logs = files.filter(isLog);
      const videos = files.filter((f) => !isLog(f));
      const [video] = videos;
      if (!video || videos.length > 1 || logs.length === 0) {
        set({ importError: "Drop one screen recording and at least one Claude Code .jsonl log." });
        return;
      }
      set({ importing: true, importError: undefined });
      try {
        const [recording, texts] = await Promise.all([
          readRecording(video),
          Promise.all(logs.map((f) => f.text())),
        ]);
        const log = parseClaudeLogs(texts);
        const previous = get().recording;
        if (previous) URL.revokeObjectURL(previous.url);
        set({ synced: false });
        update({ recording, log, offsetS: 0, constraints: DEFAULT_CONSTRAINTS });
      } catch (error) {
        set({ importError: error instanceof Error ? error.message : String(error) });
      } finally {
        set({ importing: false });
      }
    },

    setOffset: (offsetS) => update({ offsetS }),
    confirmSync: () => set({ synced: true }),

    toggleStep: (index) => {
      const { dropped } = get().constraints;
      const next = dropped.includes(index)
        ? dropped.filter((i) => i !== index)
        : [...dropped, index];
      update({ constraints: { ...get().constraints, dropped: next } });
    },

    setTarget: (seconds) => update({ constraints: { ...get().constraints, targetS: seconds } }),
  };
});
