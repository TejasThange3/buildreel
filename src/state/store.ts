import { create } from "zustand";
import { parseClaudeLogs } from "@/lib/log/parseClaudeLog";
import { activityTrack, readPacketSizes } from "@/lib/media/activity";
import { keyframeTimes } from "@/lib/media/keyframes";
import { probeVideo } from "@/lib/media/probe";
import { planReel } from "@/lib/plan/autoPlan";
import { alignEvents, offsetFor, syncPrompt } from "@/lib/timeline/align";
import { buildSteps } from "@/lib/timeline/steps";
import type {
  ActivityTrack,
  BuildEvent,
  Constraints,
  EDL,
  ParsedLog,
  Step,
  VideoProbe,
} from "@/shared/types";

export type Recording = {
  file: File;
  url: string;
  probe: VideoProbe;
  activity: ActivityTrack;
  keyTimes: number[];
};

type Derived = { steps: Step[]; droppedSteps: number; edl: EDL };

type Inputs = {
  recording?: Recording;
  log?: ParsedLog;
  offsetS: number;
  constraints: Constraints;
};

type ProjectState = Inputs &
  Derived & {
    // The prompt the sync panel marks; fixed per import (see syncPrompt).
    syncTarget?: Extract<BuildEvent, { kind: "prompt" }>;
    synced: boolean;
    importing: boolean;
    importError?: string;
    importFiles: (files: File[]) => Promise<void>;
    markPromptAt: (videoT: number) => void;
    confirmSync: () => void;
    reset: () => void;
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

// The object URL is created by the caller only once the whole import has succeeded.
async function readRecording(file: File): Promise<Omit<Recording, "url">> {
  const probe = await probeVideo(file);
  const packets = await readPacketSizes(file);
  return {
    file,
    probe,
    activity: activityTrack(packets, probe.durationS),
    keyTimes: keyframeTimes(packets),
  };
}

export const useProject = create<ProjectState>()((set, get) => {
  // Each import gets a number; a reset or a newer import makes older results stale, and stale
  // results are dropped before they touch the project.
  let generation = 0;

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
      if (get().importing) return;
      const current = ++generation;
      set({ importing: true, importError: undefined });
      try {
        const [read, texts] = await Promise.all([
          readRecording(video),
          Promise.all(logs.map((f) => f.text())),
        ]);
        if (current !== generation) return;
        const log = parseClaudeLogs(texts);
        const previous = get().recording;
        if (previous) URL.revokeObjectURL(previous.url);
        const recording = { ...read, url: URL.createObjectURL(read.file) };
        const { startedAt, durationS } = read.probe;
        set({ synced: false, syncTarget: syncPrompt(log.events, startedAt, durationS) });
        update({ recording, log, offsetS: 0, constraints: DEFAULT_CONSTRAINTS });
      } catch (error) {
        if (current === generation) {
          set({ importError: error instanceof Error ? error.message : String(error) });
        }
      } finally {
        if (current === generation) set({ importing: false });
      }
    },

    // The user says the sync prompt is sent at videoT; every event shifts by the same amount.
    markPromptAt: (videoT) => {
      const { syncTarget, recording } = get();
      if (syncTarget && recording) {
        update({ offsetS: offsetFor(syncTarget, recording.probe.startedAt, videoT) });
      }
    },
    confirmSync: () => set({ synced: true }),

    reset: () => {
      generation++;
      const { recording } = get();
      if (recording) URL.revokeObjectURL(recording.url);
      set({
        recording: undefined,
        log: undefined,
        syncTarget: undefined,
        synced: false,
        importing: false,
        importError: undefined,
        ...EMPTY,
      });
    },

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
