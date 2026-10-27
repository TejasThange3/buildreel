"use client";

import { useEffect, useState } from "react";
import { useInView } from "./useInView";
import { useReducedMotion } from "./usePageState";

const DURATION_MS = 1400;

const FORMAT = {
  clock: (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`,
  min: (s: number) => `${Math.floor(s / 60)} min`,
  s: (s: number) => `${s.toFixed(1)} s`,
};

// Counts from zero to `seconds` with an ease-out the first time it scrolls into view. The final value
// is rendered on the server, so the number is right without JavaScript and for reduced motion.
export function CountUp({ seconds, unit }: { seconds: number; unit: keyof typeof FORMAT }) {
  const [ref, inView] = useInView<HTMLSpanElement>(0.6);
  const still = useReducedMotion();
  const [progress, setProgress] = useState(1);

  useEffect(() => {
    if (!inView || still) return;
    const start = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      const t = Math.min((now - start) / DURATION_MS, 1);
      setProgress(1 - (1 - t) ** 3);
      if (t < 1) frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [inView, still]);

  return (
    <span ref={ref} className="tabular-nums">
      {FORMAT[unit](seconds * progress)}
    </span>
  );
}
