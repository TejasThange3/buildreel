"use client";

import { useEffect, useRef, useState } from "react";

// Whether the element is at least `amount` visible. With `once`, it stays true after the first
// time, so reveals never replay; without it, loops can pause while scrolled away.
export function useInView<T extends Element>(amount = 0.35, once = true) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = entry?.isIntersecting ?? false;
        if (once && !visible) return;
        setInView(visible);
        if (once) observer.disconnect();
      },
      { threshold: amount },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [amount, once]);
  return [ref, inView] as const;
}
