"use client";

import { SteerDemo, useSteerTyping } from "./SteerDemo";
import { useInView } from "./useInView";

// Each sentence maps to one patch op the steer route returns (ARCHITECTURE.md, PatchOp). The demo
// sentence combines the first two, so those rows light up when it lands.
const EXAMPLES = [
  { said: "make it a minute", does: "Reel length 60 s", inDemo: true },
  { said: "keep the step where export worked", does: "Pins step 4", inDemo: true },
  { said: "skip the setup steps", does: "Drops steps 1 and 2", inDemo: false },
  { said: "linger on the tests passing", does: "More real time on that step", inDemo: false },
  { said: "call step 3 the sync fix", does: "Retitles that step", inDemo: false },
];

export function SteerSection() {
  const { ref, typed, done } = useSteerTyping();
  const [listRef, listShown] = useInView<HTMLUListElement>(0.3);

  return (
    <section ref={ref} className="border-y border-line bg-surface/40">
      <div className="mx-auto grid max-w-7xl gap-x-16 gap-y-14 px-4 py-24 sm:px-6 md:py-36 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="font-mono text-xs tracking-wider text-voice uppercase">Steer by voice</p>
          <h2 className="mt-5 text-4xl leading-[1.05] font-semibold tracking-tighter text-balance md:text-5xl">
            Change the cut by saying so.
          </h2>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-pretty text-fg-muted">
            Hold your Wispr Flow key and talk. Your sentence lands in the steer box, and the reel
            re-plans around it. Every change can be undone.
          </p>
          <ul ref={listRef} className="mt-10 border-t border-line">
            {EXAMPLES.map(({ said, does, inDemo }, i) => {
              const lit = inDemo && done;
              return (
                <li
                  key={said}
                  style={{
                    opacity: listShown ? 1 : 0,
                    transform: listShown ? "none" : "translateY(12px)",
                    transition: `opacity 600ms var(--ease-out-expo) ${i * 90}ms, transform 600ms var(--ease-out-expo) ${i * 90}ms`,
                  }}
                  className="border-b border-line"
                >
                  <div
                    data-lit={lit}
                    className="group -mx-3 flex flex-col gap-1 rounded-lg px-3 py-4 transition-colors duration-300 hover:bg-white/[0.03] sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
                  >
                    <span className="font-mono text-sm text-fg-muted transition-[color,transform] duration-300 ease-[var(--ease-out-expo)] group-hover:translate-x-1.5 group-hover:text-fg group-data-[lit=true]:text-fg">
                      &ldquo;{said}&rdquo;
                    </span>
                    <span className="flex items-center gap-2 text-sm text-fg-subtle transition-colors duration-300 group-data-[lit=true]:text-voice">
                      <span
                        aria-hidden
                        className="size-1.5 rounded-full bg-voice opacity-0 transition-opacity duration-300 group-data-[lit=true]:opacity-100 max-sm:hidden"
                      />
                      {does}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
        <SteerDemo typed={typed} done={done} />
      </div>
    </section>
  );
}
