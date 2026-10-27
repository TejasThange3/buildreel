"use client";

import { useEffect, useRef, useState } from "react";

// True once the element has been at least `amount` visible. Reveals run once, so scrolling back
// up never replays them.
export function useInView<T extends Element>(amount = 0.35) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: amount },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [amount]);
  return [ref, inView] as const;
}
