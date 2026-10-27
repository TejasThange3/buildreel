"use client";

import { PauseIcon, PlayIcon } from "@phosphor-icons/react";
import { useEffect, useRef } from "react";
import { formatTime } from "@/lib/format";
import { keyframeAt, openKeyframes, type KeyframeReader } from "@/lib/media/keyframes";
import { remap, type Remapped } from "@/lib/plan/remap";
import { drawOverlay, type OverlayFonts } from "@/lib/render/drawOverlay";
import { usePlayback } from "@/state/playback";
import { useProject } from "@/state/store";

// Browsers cap playbackRate at 16; faster fast-forwards are drawn from keyframes instead.
const MAX_RATE = 16;
// Real-time playback re-seeks only when it drifts this far, so seeks do not stutter it.
const DRIFT_S = 0.25;
const KEYFRAME_WIDTH = 1280;

function readFonts(): OverlayFonts {
  const style = getComputedStyle(document.documentElement);
  return {
    sans: style.getPropertyValue("--font-geist-sans") || "sans-serif",
    mono: style.getPropertyValue("--font-geist-mono") || "monospace",
  };
}

// play() rejects with AbortError when a cut pauses or seeks the video before it starts; that is
// expected at every segment boundary. Anything else is a real failure.
function ignoreInterruptedPlay(error: unknown) {
  if (!(error instanceof DOMException && error.name === "AbortError")) throw error;
}

function seekIfFar(video: HTMLVideoElement, t: number, tolerance: number) {
  if (Math.abs(video.currentTime - t) > tolerance && !video.seeking) video.currentTime = t;
}

const isTimelapse = ({ segment }: Remapped) => segment.mode === "fast" && segment.speed > MAX_RATE;

// Points the video at the frame the remap asks for; on entering a segment it always seeks.
function steerVideo(video: HTMLVideoElement, r: Remapped, entered: boolean, playing: boolean) {
  const { segment, srcT } = r;
  if (srcT === undefined || isTimelapse(r)) return video.pause();
  const moving = playing && (segment.mode === "real" || segment.mode === "fast");
  video.muted = segment.mode !== "real";
  video.playbackRate = segment.mode === "fast" ? segment.speed : 1;
  if (entered || !moving) seekIfFar(video, srcT, entered ? 0 : 0.05);
  else if (segment.mode === "real") seekIfFar(video, srcT, DRIFT_S);
  if (moving && video.paused) void video.play().catch(ignoreInterruptedPlay);
  if (!moving && !video.paused) video.pause();
}

export function Player() {
  const recording = useProject((s) => s.recording);
  const edl = useProject((s) => s.edl);
  const playing = usePlayback((s) => s.playing);
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const clock = useRef<HTMLSpanElement>(null);
  const keyframes = useRef<KeyframeReader | undefined>(undefined);

  useEffect(() => {
    if (!recording) return;
    let open = true;
    void openKeyframes(recording.file, KEYFRAME_WIDTH).then((reader) => {
      if (open) keyframes.current = reader;
      else reader.dispose();
    });
    return () => {
      open = false;
      keyframes.current?.dispose();
      keyframes.current = undefined;
    };
  }, [recording]);

  useEffect(() => {
    const v = video.current;
    const c = canvas.current;
    const ctx = c?.getContext("2d");
    if (!v || !c || !ctx || !recording) return;
    const fonts = readFonts();
    let lastSegment = "";
    let last = performance.now();
    let frame = 0;
    // Timelapse state: the keyframe on screen and whether a decode is in flight. A new decode
    // starts only when the last one lands, so the hop rate follows the device's decoder.
    let image: CanvasImageSource | undefined;
    let shownKey: number | undefined;
    let decoding = false;

    const drawTimelapse = (srcT: number, w: number, h: number) => {
      const key = keyframeAt(recording.keyTimes, srcT);
      const reader = keyframes.current;
      if (key !== undefined && key !== shownKey && !decoding && reader) {
        decoding = true;
        void reader
          .frame(key)
          .then((next) => {
            image = next ?? image;
            shownKey = key;
          })
          .finally(() => (decoding = false));
      }
      if (image) ctx.drawImage(image, 0, 0, w, h);
    };

    const tick = (now: number) => {
      const { outT, playing, seek, setPlaying } = usePlayback.getState();
      let t = outT;
      if (playing) {
        t = Math.min(outT + (now - last) / 1000, edl.totalS);
        if (t >= edl.totalS) setPlaying(false);
        seek(t);
      }
      last = now;
      const r = remap(edl, t);
      if (r) {
        const entered = r.segment.id !== lastSegment;
        if (entered) image = undefined;
        steerVideo(v, r, entered, playing);
        lastSegment = r.segment.id;
        const scale = Math.min(window.devicePixelRatio, 2);
        const w = Math.round(c.clientWidth * scale);
        const h = Math.round(c.clientHeight * scale);
        if (c.width !== w || c.height !== h) Object.assign(c, { width: w, height: h });
        ctx.clearRect(0, 0, w, h);
        if (isTimelapse(r) && r.srcT !== undefined) drawTimelapse(r.srcT, w, h);
        // Until the first keyframe lands, the paused video keeps showing the last frame.
        const covered = r.segment.mode === "card" || (isTimelapse(r) && image !== undefined);
        v.style.visibility = covered ? "hidden" : "visible";
        drawOverlay(ctx, r.segment, r.local, r.srcT, fonts);
      }
      if (clock.current) clock.current.textContent = formatTime(t);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [edl, recording]);

  if (!recording) return null;
  const toggle = () => {
    const { outT, playing, seek, setPlaying } = usePlayback.getState();
    if (!playing && outT >= edl.totalS) seek(0);
    setPlaying(!playing);
  };

  return (
    <div>
      <div className="relative aspect-video overflow-hidden rounded-[var(--radius-panel)] bg-canvas outline outline-1 -outline-offset-1 outline-line">
        <video ref={video} src={recording.url} playsInline preload="auto" className="size-full" />
        <canvas ref={canvas} className="pointer-events-none absolute inset-0 size-full" />
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
      </div>
    </div>
  );
}
