"use client";

import { PauseIcon, PlayIcon } from "@phosphor-icons/react";
import { useCallback, useEffect, useRef } from "react";
import { formatTime } from "@/lib/format";
import {
  keyframeAt,
  openKeyframes,
  TIMELAPSE_RATE,
  type KeyframeReader,
} from "@/lib/media/keyframes";
import { remap, type Remapped } from "@/lib/plan/remap";
import { containRect } from "@/lib/render/contain";
import { drawOverlay } from "@/lib/render/drawOverlay";
import { usePlayback } from "@/state/playback";
import { useProject } from "@/state/store";
import { readFonts } from "./overlayFonts";
import { connectPreviewSound, type PreviewSound } from "./previewSound";
import { useShortcuts } from "./useShortcuts";

// Browsers cap playbackRate at 16; faster fast-forwards are drawn from keyframes instead.
// Real-time playback re-seeks only when it drifts this far, so seeks do not stutter it.
const DRIFT_S = 0.25;
const KEYFRAME_WIDTH = 1280;

// play() rejects with AbortError when a cut pauses or seeks the video before it starts; that is
// expected at every segment boundary. Anything else is a real failure.
function ignoreInterruptedPlay(error: unknown) {
  if (!(error instanceof DOMException && error.name === "AbortError")) throw error;
}

function seekIfFar(video: HTMLMediaElement, t: number, tolerance: number) {
  if (Math.abs(video.currentTime - t) > tolerance && !video.seeking) video.currentTime = t;
}

// Points the video at the frame the remap asks for. A required seek (a new segment, or the clock
// jumping because the user scrubbed) that cannot start while another seek runs is reported back
// as still pending, so the next frame retries it. Returns whether a seek is still pending.
function steerVideo(
  video: HTMLVideoElement,
  r: Remapped,
  mustSeek: boolean,
  playing: boolean,
  timelapse: boolean,
): boolean {
  const { segment, srcT } = r;
  if (srcT === undefined || timelapse) {
    video.pause();
    return false;
  }
  // Without keyframes, a fast-forward faster than the browser can play hops: the video pauses
  // and seeks to each new source time as soon as the previous seek lands.
  const hopping = segment.mode === "fast" && segment.speed > TIMELAPSE_RATE;
  const moving = playing && (segment.mode === "real" || segment.mode === "fast") && !hopping;
  video.muted = segment.mode !== "real";
  video.playbackRate = segment.mode === "fast" && !hopping ? segment.speed : 1;
  let pending = false;
  if (mustSeek) {
    if (video.seeking) pending = true;
    else video.currentTime = srcT;
  } else if (hopping || !moving) seekIfFar(video, srcT, 0.05);
  else if (segment.mode === "real") seekIfFar(video, srcT, DRIFT_S);
  if (moving && video.paused) void video.play().catch(ignoreInterruptedPlay);
  if (!moving && !video.paused) video.pause();
  return pending;
}

function notReady(media: HTMLMediaElement): boolean {
  return media.error === null && (media.seeking || media.readyState < media.HAVE_FUTURE_DATA);
}

// Real time needs the video playing; a dictated card needs its clip. A media error never blocks.
function waitingForMedia(
  { segment, local }: Remapped,
  video: HTMLVideoElement,
  voice: HTMLAudioElement,
) {
  if (segment.mode === "real") return notReady(video);
  if (segment.mode === "hold" && segment.voice && segment.voice[0] + local < segment.voice[1])
    return notReady(voice);
  return false;
}

// A prompt card holds one frame while its dictation plays from a second element, since the
// video cannot show one moment and sound another.
function steerVoice(voice: HTMLAudioElement, r: Remapped, entered: boolean, playing: boolean) {
  const clip = r.segment.mode === "hold" ? r.segment.voice : undefined;
  const t = clip ? clip[0] + r.local : undefined;
  if (!clip || t === undefined || t >= clip[1] || !playing) {
    if (!voice.paused) voice.pause();
    return;
  }
  if (entered) voice.currentTime = t;
  else seekIfFar(voice, t, DRIFT_S);
  if (voice.paused) void voice.play().catch(ignoreInterruptedPlay);
}

function Key({ children }: { children: string }) {
  return (
    <kbd className="rounded border border-line px-1 py-0.5 font-mono text-[11px] text-fg-muted">
      {children}
    </kbd>
  );
}

export function Player() {
  const recording = useProject((s) => s.recording);
  const edl = useProject((s) => s.edl);
  const playing = usePlayback((s) => s.playing);
  const video = useRef<HTMLVideoElement>(null);
  const voice = useRef<HTMLAudioElement>(null);
  const sound = useRef<PreviewSound | undefined>(undefined);
  const canvas = useRef<HTMLCanvasElement>(null);
  const clock = useRef<HTMLSpanElement>(null);
  const keyframes = useRef<KeyframeReader | undefined>(undefined);
  // Set when keyframes cannot be read; fast-forwards then play the video at up to 16x instead.
  const keyframesFailed = useRef(false);

  useEffect(() => {
    if (!recording) return;
    let open = true;
    keyframesFailed.current = false;
    openKeyframes(recording.source, KEYFRAME_WIDTH).then(
      (reader) => {
        if (open) keyframes.current = reader;
        else reader.dispose();
      },
      (error: unknown) => {
        if (!open) return;
        keyframesFailed.current = true;
        reportError(error);
      },
    );
    return () => {
      open = false;
      keyframes.current?.dispose();
      keyframes.current = undefined;
    };
  }, [recording]);

  useEffect(() => () => sound.current?.close(), []);

  useEffect(() => {
    const v = video.current;
    const a = voice.current;
    const c = canvas.current;
    const ctx = c?.getContext("2d");
    if (!v || !a || !c || !ctx || !recording) return;
    const fonts = readFonts();
    const quiet = edl.quiet ?? [];
    let lastSegment = "";
    let last = performance.now();
    let lastSeekId = usePlayback.getState().seekId;
    let pendingSeek = false;
    let frame = 0;
    // Timelapse state: the keyframe on screen and whether a decode is in flight. A new decode
    // starts only when the last one lands, so the hop rate follows the device's decoder. Each
    // segment entry bumps the epoch, so a decode started for an earlier segment is discarded.
    let image: HTMLCanvasElement | OffscreenCanvas | undefined;
    let shownKey: number | undefined;
    let decoding = false;
    let epoch = 0;

    const isTimelapse = ({ segment }: Remapped) =>
      segment.mode === "fast" && segment.speed > TIMELAPSE_RATE && !keyframesFailed.current;

    const drawTimelapse = (srcT: number, w: number, h: number) => {
      const key = keyframeAt(recording.keyTimes, srcT);
      const reader = keyframes.current;
      if (key !== undefined && key !== shownKey && !decoding && reader) {
        decoding = true;
        const requested = epoch;
        reader
          .frame(key)
          .then(
            (next) => {
              if (requested !== epoch) return;
              image = next ?? image;
              shownKey = key;
            },
            (error: unknown) => {
              // A reader replaced by a newer recording may still reject; only the current one counts.
              if (keyframes.current !== reader) return;
              keyframesFailed.current = true;
              reportError(error);
            },
          )
          .finally(() => (decoding = false));
      }
      if (image) ctx.drawImage(image, ...containRect(image.width, image.height, w, h));
    };

    const tick = (now: number) => {
      const { outT, playing, seekId, advance, setPlaying } = usePlayback.getState();
      let t = outT;
      // Streamed media can lag the clock; the reel holds still until the frame or clip it needs is
      // playable, so a slow connection never skips past a moment before it is seen or heard.
      const at = remap(edl, outT);
      if (playing && !(at && waitingForMedia(at, v, a))) {
        t = Math.min(outT + (now - last) / 1000, edl.totalS);
        if (t >= edl.totalS) setPlaying(false);
        advance(t);
      }
      // A seek made by a person (not this clock) means the video must follow, however small.
      const jumped = seekId !== lastSeekId;
      lastSeekId = seekId;
      last = now;
      const r = remap(edl, t);
      if (r) {
        const entered = r.segment.id !== lastSegment;
        if (entered) {
          epoch++;
          image = undefined;
          shownKey = undefined;
        }
        const timelapse = isTimelapse(r);
        pendingSeek = steerVideo(v, r, entered || jumped || pendingSeek, playing, timelapse);
        // Dictation is heard only under its own card, as in the export (see EDL.quiet).
        const srcT = r.srcT;
        if (srcT !== undefined && quiet.some(([from, to]) => srcT >= from && srcT < to))
          v.muted = true;
        steerVoice(a, r, entered || jumped, playing);
        sound.current?.setClean(useProject.getState().cleanVoice);
        lastSegment = r.segment.id;
        const scale = Math.min(window.devicePixelRatio, 2);
        const w = Math.round(c.clientWidth * scale);
        const h = Math.round(c.clientHeight * scale);
        if (c.width !== w || c.height !== h) Object.assign(c, { width: w, height: h });
        ctx.clearRect(0, 0, w, h);
        if (timelapse && r.srcT !== undefined) drawTimelapse(r.srcT, w, h);
        // Until the first keyframe lands, the paused video keeps showing the last frame.
        const covered = r.segment.mode === "card" || (timelapse && image !== undefined);
        v.style.visibility = covered ? "hidden" : "visible";
        drawOverlay(ctx, r.segment, r.local, r.srcT, fonts);
      }
      if (clock.current) clock.current.textContent = formatTime(t);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [edl, recording]);

  // Audio may start only from a click or key, so the sound graph is built on the first play.
  const toggle = useCallback(() => {
    if (!sound.current && video.current && voice.current)
      sound.current = connectPreviewSound([video.current, voice.current]);
    sound.current?.resume();
    const { outT, playing, seek, setPlaying } = usePlayback.getState();
    if (!playing && outT >= edl.totalS) seek(0);
    setPlaying(!playing);
  }, [edl.totalS]);
  useShortcuts(toggle);

  if (!recording) return null;

  return (
    <div>
      <div className="relative aspect-video overflow-hidden rounded-[var(--radius-panel)] bg-canvas outline outline-1 -outline-offset-1 outline-line">
        <video ref={video} src={recording.url} playsInline preload="auto" className="size-full" />
        {/* Only seeks for each clip; a second full download would compete with the video. */}
        <audio ref={voice} src={recording.url} preload="metadata" />
        {/* The overlays repeat what the step list and prompt cards already say in text. */}
        <canvas
          ref={canvas}
          aria-hidden
          className="pointer-events-none absolute inset-0 size-full"
        />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? "Pause" : "Play"}
          className="grid size-10 place-items-center rounded-full bg-fg text-canvas active:scale-[0.97]"
        >
          {playing ? <PauseIcon size={16} weight="fill" /> : <PlayIcon size={16} weight="fill" />}
        </button>
        <span className="font-mono text-sm text-fg-muted tabular-nums">
          <span ref={clock}>0:00.0</span> / {formatTime(edl.totalS)}
        </span>
        <p className="ml-auto hidden text-xs text-fg-subtle md:block">
          <Key>Space</Key> play <Key>←</Key> <Key>→</Key> 5 s <Key>Shift</Key> + arrow step{" "}
          <Key>Ctrl</Key> <Key>Z</Key> undo
        </p>
      </div>
    </div>
  );
}
