"use client";

import { useEffect, useRef, useState } from "react";
import { FRAGMENT_SHADER, VERTEX_SHADER } from "./heroShader";
import { SLAB_CLASS } from "./slab";

// The glass loop costs ten light evaluations per pixel inside the slab, so the density is capped.
const MAX_DPR = 1.5;
const FRAME_MS = 1000 / 60;
// With no pointer for this long the glass drifts on its own, so phones still see it move.
const IDLE_MS = 2500;

type Uniforms = Record<"res" | "time" | "tilt" | "glass" | "radius", WebGLUniformLocation | null>;

function compile(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("WebGL could not create a shader.");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
    throw new Error(gl.getShaderInfoLog(shader) ?? "");
  return shader;
}

function setup(gl: WebGLRenderingContext): Uniforms {
  const program = gl.createProgram();
  if (!program) throw new Error("WebGL could not create a program.");
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER));
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS))
    throw new Error(gl.getProgramInfoLog(program) ?? "");
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const pos = gl.getAttribLocation(program, "aPos");
  gl.enableVertexAttribArray(pos);
  gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
  const at = (name: string) => gl.getUniformLocation(program, name);
  return {
    res: at("uRes"),
    time: at("uTime"),
    tilt: at("uTilt"),
    glass: at("uGlass"),
    radius: at("uRadius"),
  };
}

// Matches the CSS lg breakpoint, where the hero text moves to the left column. The canvas width is
// read unrounded, as the container query in slab.ts sees it.
const WIDE_CSS_PX = 1024;

// The slab sits right of the headline on wide screens and above it on narrow ones.
// Coordinates are GL pixels, origin bottom-left. SLAB_CLASS in slab.ts is the same box in CSS.
function glassRect(w: number, h: number, wide: boolean): [number, number, number, number, number] {
  // Stacked layouts size the slab from the height too, so it clears the headline on short screens.
  const hw = wide ? Math.min(w * 0.19, h * 0.4) : Math.min(w * 0.42, h * 0.2);
  const hh = hw / 1.6;
  return wide ? [w * 0.73, h * 0.5, hw, hh, hh * 0.22] : [w * 0.5, h * 0.78, hw, hh, hh * 0.22];
}

// Compiling the shader is the page's longest task, so it waits for idle time: the headline (the
// LCP element) paints first and the glass fades in a beat later. Safari has no
// requestIdleCallback, hence the timer.
function whenIdle(run: () => void): () => void {
  if ("requestIdleCallback" in window) {
    const id = window.requestIdleCallback(run, { timeout: 1500 });
    return () => window.cancelIdleCallback(id);
  }
  const id = setTimeout(run, 200);
  return () => clearTimeout(id);
}

export function HeroGlass() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => whenIdle(() => setReady(true)), []);

  useEffect(() => {
    const c = canvas.current;
    if (!c || !ready) return;
    const gl = c.getContext("webgl", {
      antialias: false,
      alpha: false,
      failIfMajorPerformanceCaveat: true,
      powerPreference: "low-power",
    });
    // Flipping to the fallback waits a frame so the effect does not re-render synchronously.
    const fail = () => requestAnimationFrame(() => setFailed(true));
    if (!gl) {
      fail();
      return;
    }
    let uniforms: Uniforms;
    try {
      uniforms = setup(gl);
    } catch (error) {
      // A driver that cannot compile the shader is a capability gap, not a crash: free the
      // context, show the fallback, and report the error without unmounting the page.
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      fail();
      reportError(error);
      return;
    }

    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    const start = performance.now();
    const pointer = { x: 0, y: 0, at: 0 };
    const tilt = { x: 0, y: 0 };
    let frame = 0;
    let last = 0;
    let onScreen = true;

    const draw = (now: number) => {
      const scale = Math.min(window.devicePixelRatio, MAX_DPR);
      const w = Math.round(c.clientWidth * scale);
      const h = Math.round(c.clientHeight * scale);
      if (c.width !== w || c.height !== h) {
        c.width = w;
        c.height = h;
        gl.viewport(0, 0, w, h);
      }
      const t = still.matches ? 12 : (now - start) / 1000;
      const idle = now - pointer.at > IDLE_MS;
      const tx = idle ? 0.45 * Math.sin(t * 0.31) : pointer.x;
      const ty = idle ? 0.3 * Math.cos(t * 0.23) : pointer.y;
      tilt.x += (tx - tilt.x) * 0.06;
      tilt.y += (ty - tilt.y) * 0.06;
      const [gx, gy, hw, hh, r] = glassRect(w, h, c.getBoundingClientRect().width >= WIDE_CSS_PX);
      gl.uniform2f(uniforms.res, w, h);
      gl.uniform1f(uniforms.time, t);
      gl.uniform2f(uniforms.tilt, tilt.x, tilt.y);
      gl.uniform4f(uniforms.glass, gx, gy, hw, hh);
      gl.uniform1f(uniforms.radius, r);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      c.style.opacity = "1";
    };

    const loop = (now: number) => {
      frame = 0;
      if (!onScreen || document.hidden) return;
      // A still (reduced motion) frame is drawn whenever it is asked for; only animation is capped.
      if (still.matches || now - last >= FRAME_MS - 1) {
        last = now;
        draw(now);
      }
      if (!still.matches) frame = requestAnimationFrame(loop);
    };
    const resume = () => {
      if (!frame && onScreen && !document.hidden) frame = requestAnimationFrame(loop);
    };

    const onPointer = (e: PointerEvent) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
      pointer.at = performance.now();
    };
    const observer = new IntersectionObserver(([entry]) => {
      onScreen = entry?.isIntersecting ?? false;
      resume();
    });
    // With reduced motion only one frame is drawn, so a resize has to ask for a fresh one.
    const resized = new ResizeObserver(resume);
    const onLost = (e: Event) => {
      e.preventDefault();
      cancelAnimationFrame(frame);
      setFailed(true);
    };

    observer.observe(c);
    resized.observe(c);
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("pointermove", onPointer, { passive: true });
    still.addEventListener("change", resume);
    c.addEventListener("webglcontextlost", onLost);
    resume();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      resized.disconnect();
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("pointermove", onPointer);
      still.removeEventListener("change", resume);
      c.removeEventListener("webglcontextlost", onLost);
    };
  }, [ready]);

  if (failed) return <HeroGlassFallback />;
  return (
    <canvas
      ref={canvas}
      aria-hidden
      className="pointer-events-none absolute inset-0 size-full opacity-0 transition-opacity duration-700"
    />
  );
}

// Without WebGL (hardware acceleration off, blocklisted GPU, lost context) the same composition
// is drawn with CSS: soft light bands and a frosted slab in the same place.
function HeroGlassFallback() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden [container-type:size]"
    >
      <div className="absolute inset-x-0 top-[34%] h-px -rotate-6 bg-[linear-gradient(90deg,transparent,rgb(220_224_235/0.7)_45%,transparent)] shadow-[0_0_24px_4px_rgb(200_205_220/0.25)]" />
      <div className="absolute inset-x-0 top-[48%] h-px rotate-3 bg-[linear-gradient(90deg,transparent,rgb(220_224_235/0.5)_60%,transparent)] shadow-[0_0_20px_3px_rgb(200_205_220/0.18)]" />
      <div className="absolute inset-x-0 top-[60%] h-px -rotate-2 bg-[linear-gradient(90deg,transparent_20%,rgb(220_224_235/0.35),transparent)]" />
      <div
        className={`${SLAB_CLASS} border border-white/25 bg-[linear-gradient(160deg,rgb(255_255_255/0.10),rgb(255_255_255/0.02)_45%,rgb(255_255_255/0.06))] shadow-[inset_0_1px_0_rgb(255_255_255/0.35),0_24px_60px_rgb(0_0_0/0.45)] backdrop-blur-md`}
      />
    </div>
  );
}
