import { create } from "zustand";
import { parseClaudeLogs } from "@/lib/log/parseClaudeLog";
import { activityTrack, readPacketSizes } from "@/lib/media/activity";
import { keyframeTimes } from "@/lib/media/keyframes";
import { probeVideo, type VideoSource } from "@/lib/media/probe";
import { redact } from "@/lib/log/redact";
import { applyOps, describeOps } from "@/lib/plan/applyOps";
import { planReel } from "@/lib/plan/autoPlan";
import { alignEvents, offsetFor, syncPrompt } from "@/lib/timeline/align";
import { findDictation } from "@/lib/audio/findDictation";
import { sortFiles } from "@/lib/files";
import { buildSteps, shownTitle } from "@/lib/timeline/steps";
import { openProject, PROMPT_MAX } from "@/shared/project";
import type {
  ActivityTrack,
  BuildEvent,
  Constraints,
  EDL,
  ParsedLog,
  Step,
  VideoProbe,
} from "@/shared/types";
import { requestSteer, steerRequest } from "./steerClient";
import { fetchSample, SAMPLE_NAME, SAMPLE_VIDEO, type SampleAnalysis } from "./sample";
import { requestTitles, titlesRequest } from "./titlesClient";

// url is what the player streams: an object URL for a dropped file, the sample's own path.
type Recording = {
  source: VideoSource;
  name: string;
  url: string;
  probe: VideoProbe;
  activity: ActivityTrack;
  keyTimes: number[];
};

type Derived = { steps: Step[]; droppedSteps: number; edl: EDL };

export type SteerOutcome =
  { ok: true; summary: string; note: string | null } | { ok: false; message: string };

type Inputs = {
  recording?: Recording;
  log?: ParsedLog;
  offsetS: number;
  constraints: Constraints;
  // Step titles the model wrote; user titles in constraints.titles still win over them.
  autoTitles: Record<number, string>;
  // Where each prompt was spoken, found in the recording's audio once steps are final.
  dictation: Record<number, [number, number]>;
};

type ProjectState = Inputs &
  Derived & {
    // The prompt the sync panel marks; fixed per import (see syncPrompt).
    syncTarget?: Extract<BuildEvent, { kind: "prompt" }>;
    synced: boolean;
    importing: boolean;
    importError?: string;
    importFiles: (files: File[]) => Promise<void>;
    openSample: () => Promise<void>;
    // True from page load until the sample has opened or failed, so a first visit never flashes
    // the drop zone; a reset turns it off for good.
    openingSample: boolean;
    markPromptAt: (videoT: number) => void;
    confirmSync: () => void;
    reset: () => void;
    // Every constraint change goes through history, so undo covers toggles as well as steering.
    past: Constraints[];
    future: Constraints[];
    toggleStep: (index: number) => void;
    setTarget: (seconds: number) => void;
    editPrompt: (index: number, text: string) => void;
    togglePrompt: (index: number) => void;
    steer: (instruction: string) => Promise<SteerOutcome>;
    undo: () => void;
    redo: () => void;
    // Shared by the preview and the export, so what plays is what gets rendered.
    cleanVoice: boolean;
    setCleanVoice: (on: boolean) => void;
  };

const DEFAULT_CONSTRAINTS: Constraints = {
  targetS: 90,
  pinned: [],
  dropped: [],
  emphasis: {},
  speed: {},
  titles: {},
  prompts: {},
  hiddenPrompts: [],
};

const EMPTY: Derived = { steps: [], droppedSteps: 0, edl: { segments: [], totalS: 0 } };
const HISTORY = 50;
// Matches the request schema's cap; longer sessions are steered with the toggles.
const MAX_STEER_STEPS = 80;

function derive({ recording, log, offsetS, constraints, autoTitles, dictation }: Inputs): Derived {
  if (!recording || !log) return EMPTY;
  const { probe, activity } = recording;
  const events = alignEvents(log.events, probe.startedAt, offsetS);
  const built = buildSteps(events, probe.durationS, activity);
  const steps = built.steps.map((s) => ({
    ...s,
    title: shownTitle(s, constraints, autoTitles),
    dictation: dictation[s.index],
  }));
  return {
    steps,
    droppedSteps: built.droppedSteps,
    edl: planReel(steps, activity, constraints, probe.durationS),
  };
}

// A project file is user-supplied text like a log, and its text reaches captions and the model.
const redactTexts = (titles: Record<number, string>) =>
  Object.fromEntries(Object.entries(titles).map(([step, text]) => [step, redact(text)]));

function redactConstraints(constraints: Constraints): Constraints {
  const { intro, outro } = constraints;
  return {
    ...constraints,
    titles: redactTexts(constraints.titles),
    prompts: redactTexts(constraints.prompts),
    intro: intro === undefined ? undefined : redact(intro),
    outro: outro === undefined ? undefined : redact(outro),
  };
}

// One import: the recording, the log texts and an optional saved project.
type Import = {
  source: VideoSource;
  file: { name: string; lastModified: number };
  logs: Promise<string[]>;
  project?: Promise<string>;
  // Shipped with the sample, so it opens without reading its video.
  analysis?: Promise<SampleAnalysis>;
};

async function readRecording({ source, file, analysis }: Import): Promise<Omit<Recording, "url">> {
  const known = await analysis;
  if (known) {
    const { durationS, width, height, activity, keyTimes } = known;
    const startedAt = file.lastModified - durationS * 1000;
    return {
      source,
      name: file.name,
      probe: { durationS, width, height, startedAt },
      activity,
      keyTimes,
    };
  }
  const probe = await probeVideo(source, file);
  const packets = await readPacketSizes(source);
  return {
    source,
    name: file.name,
    probe,
    activity: activityTrack(packets, probe.durationS),
    keyTimes: keyframeTimes(packets),
  };
}

const streamUrl = (source: VideoSource) =>
  source instanceof File ? URL.createObjectURL(source) : source.href;

const release = (recording: Recording | undefined) => {
  if (recording?.source instanceof File) URL.revokeObjectURL(recording.url);
};

export const useProject = create<ProjectState>()((set, get) => {
  // Each import gets a number; a reset or a newer import makes older results stale, and stale
  // results are dropped before they touch the project.
  let generation = 0;

  // Bumped on every project change; a steer answer computed for an older project is dropped.
  let revision = 0;

  // Every input change re-plans, so the EDL never goes stale.
  const update = (patch: Partial<Inputs>) => {
    revision++;
    const next = { ...get(), ...patch };
    set({ ...patch, ...derive(next) });
  };

  // Steps are named once they are final, after sync. Titles arriving for an older import are
  // dropped; titles the user typed meanwhile still win, as they always do.
  const nameSteps = async () => {
    const asked = generation;
    const request = titlesRequest(get().steps, get().constraints);
    if (!request) return;
    const titles = await requestTitles(request);
    if (titles && asked === generation) update({ autoTitles: titles });
  };

  // Hearing the prompt is a bonus: a recording with no microphone or no clear speech keeps silent
  // cards, so a failure is reported and the reel stays as it is.
  const listenForPrompts = async () => {
    const asked = generation;
    const { recording, steps } = get();
    if (!recording) return;
    const found = await findDictation(recording.source, steps).catch((error: unknown) => {
      reportError(error);
      return undefined;
    });
    if (found && asked === generation) update({ dictation: found });
  };

  // Once steps are final (after sync, or straight away for a saved project) they are named and
  // their dictation is found.
  const finishSteps = (named: boolean, heard: boolean) => {
    if (!named) void nameSteps();
    if (!heard) void listenForPrompts();
  };

  // Reads a recording and its logs into a fresh project. A newer import or a reset makes this
  // one stale, and a stale result never touches the project.
  const load = async (job: Import) => {
    if (get().importing) return;
    const current = ++generation;
    set({ importing: true, importError: undefined });
    try {
      const [read, texts, projectText, analysis] = await Promise.all([
        readRecording(job),
        job.logs,
        job.project,
        job.analysis,
      ]);
      if (current !== generation) return;
      const opened =
        projectText === undefined ? undefined : openProject(projectText, read.probe.durationS);
      if (opened && !opened.ok) {
        set({ importError: opened.message });
        return;
      }
      const log = parseClaudeLogs(texts);
      release(get().recording);
      const probe = { ...read.probe, startedAt: opened?.startedAt ?? read.probe.startedAt };
      const recording = { ...read, probe, url: streamUrl(read.source) };
      const { startedAt, durationS } = probe;
      // A saved project was synced when it was saved, so it opens straight into editing.
      set({
        synced: opened !== undefined,
        syncTarget: syncPrompt(log.events, startedAt, durationS),
        past: [],
        future: [],
      });
      update({
        recording,
        log,
        offsetS: opened?.offsetS ?? 0,
        constraints: opened ? redactConstraints(opened.constraints) : DEFAULT_CONSTRAINTS,
        autoTitles: opened ? redactTexts(opened.autoTitles) : {},
        dictation: analysis?.dictation ?? {},
      });
      if (opened) finishSteps(Object.keys(opened.autoTitles).length > 0, analysis !== undefined);
    } catch (error) {
      if (current === generation) {
        set({ importError: error instanceof Error ? error.message : String(error) });
      }
    } finally {
      if (current === generation) set({ importing: false });
    }
  };

  // A change that changes nothing keeps the redo stack intact.
  const commit = (constraints: Constraints) => {
    const { constraints: current, past } = get();
    if (JSON.stringify(constraints) === JSON.stringify(current)) return;
    set({ past: [...past, current].slice(-HISTORY), future: [] });
    update({ constraints });
  };

  return {
    offsetS: 0,
    constraints: DEFAULT_CONSTRAINTS,
    autoTitles: {},
    dictation: {},
    ...EMPTY,
    synced: false,
    importing: false,
    cleanVoice: true,
    setCleanVoice: (on) => set({ cleanVoice: on }),
    past: [],
    future: [],

    importFiles: async (files) => {
      const { videos, logs, projects } = sortFiles(files);
      const [video] = videos;
      const [project] = projects;
      if (!video || videos.length > 1 || logs.length === 0 || projects.length > 1) {
        set({
          importError:
            "Drop one screen recording and at least one Claude Code .jsonl log, plus a saved project if you have one.",
        });
        return;
      }
      await load({
        source: video,
        file: video,
        logs: Promise.all(logs.map((f) => f.text())),
        project: project?.text(),
      });
    },

    openingSample: true,
    openSample: async () => {
      // React runs effects twice in development; the second call finds the first one importing.
      if (get().importing) return;
      const sample = fetchSample();
      try {
        await load({
          source: new URL(SAMPLE_VIDEO, window.location.href),
          // The sample's project pins its start time, so no real mtime is needed.
          file: { name: SAMPLE_NAME, lastModified: Date.now() },
          logs: sample.then(({ log }) => [log]),
          project: sample.then(({ project }) => project),
          analysis: sample.then(({ analysis }) => analysis),
        });
      } finally {
        set({ openingSample: false });
      }
    },

    // The user says the sync prompt is sent at videoT; every event shifts by the same amount.
    markPromptAt: (videoT) => {
      const { syncTarget, recording } = get();
      if (syncTarget && recording) {
        update({ offsetS: offsetFor(syncTarget, recording.probe.startedAt, videoT) });
      }
    },
    confirmSync: () => {
      set({ synced: true });
      finishSteps(false, false);
    },

    reset: () => {
      generation++;
      revision++;
      release(get().recording);
      set({
        recording: undefined,
        openingSample: false,
        log: undefined,
        syncTarget: undefined,
        synced: false,
        importing: false,
        importError: undefined,
        past: [],
        future: [],
        ...EMPTY,
      });
    },

    toggleStep: (index) => {
      const { dropped } = get().constraints;
      const next = dropped.includes(index)
        ? dropped.filter((i) => i !== index)
        : [...dropped, index];
      commit({ ...get().constraints, dropped: next });
    },

    setTarget: (seconds) => commit({ ...get().constraints, targetS: seconds }),

    // Typed text can carry a pasted key, so it is redacted like a parsed prompt. Clearing the
    // box, or typing the original back, returns to the prompt from the log.
    editPrompt: (index, text) => {
      const { constraints, steps } = get();
      const clean = redact(text.trim()).slice(0, PROMPT_MAX);
      const prompts = { ...constraints.prompts };
      delete prompts[index];
      const original = steps.find((s) => s.index === index)?.prompt;
      if (clean && clean !== original) prompts[index] = clean;
      commit({ ...constraints, prompts });
    },

    togglePrompt: (index) => {
      const { constraints } = get();
      const hidden = constraints.hiddenPrompts;
      const next = hidden.includes(index) ? hidden.filter((i) => i !== index) : [...hidden, index];
      commit({ ...constraints, hiddenPrompts: next });
    },

    steer: async (instruction) => {
      const { steps, edl, constraints } = get();
      if (steps.length > MAX_STEER_STEPS)
        return {
          ok: false,
          message: `Steering works on sessions of up to ${MAX_STEER_STEPS} prompts. Use the step toggles here.`,
        };
      const sent = revision;
      const reply = await requestSteer(steerRequest(instruction, steps, edl, constraints));
      if (!reply.ok) return reply;
      if (revision !== sent)
        return { ok: false, message: "The reel changed while that was planning. Say it again." };
      // Text the model wrote is shown and exported, so it is redacted like any prompt.
      const ops = reply.ops.map((op) => ("text" in op ? { ...op, text: redact(op.text) } : op));
      const result = applyOps(constraints, ops, steps.length);
      if (result.applied.length === 0)
        return { ok: false, message: reply.note ?? "Nothing to change for that." };
      commit(result.constraints);
      return { ok: true, summary: describeOps(result.applied), note: reply.note };
    },

    undo: () => {
      const { past, future, constraints } = get();
      const previous = past.at(-1);
      if (!previous) return;
      set({ past: past.slice(0, -1), future: [constraints, ...future] });
      update({ constraints: previous });
    },

    redo: () => {
      const { past, future, constraints } = get();
      const [next, ...rest] = future;
      if (!next) return;
      set({ past: [...past, constraints], future: rest });
      update({ constraints: next });
    },
  };
});
