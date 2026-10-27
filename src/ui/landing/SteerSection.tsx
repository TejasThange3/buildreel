import { SteerDemo } from "./SteerDemo";

// Each sentence maps to one patch op the steer route returns (ARCHITECTURE.md, PatchOp).
const EXAMPLES = [
  { said: "make it a minute", does: "Reel length 60 s" },
  { said: "keep the step where export worked", does: "Pins step 4" },
  { said: "skip the setup steps", does: "Drops steps 1 and 2" },
  { said: "linger on the tests passing", does: "More real time on that step" },
  { said: "call step 3 the sync fix", does: "Retitles that step" },
];

export function SteerSection() {
  return (
    <section className="border-y border-line bg-surface/40">
      <div className="mx-auto grid max-w-7xl gap-14 px-4 py-24 sm:px-6 md:py-36 lg:grid-cols-[1fr_1.35fr] lg:items-center lg:gap-16">
        <div>
          <p className="font-mono text-xs tracking-wider text-voice uppercase">Steer by voice</p>
          <h2 className="mt-4 text-4xl leading-[1.05] font-semibold tracking-tighter text-balance md:text-5xl">
            Change the cut by saying so.
          </h2>
          <p className="mt-5 max-w-md leading-relaxed text-pretty text-fg-muted">
            Hold your Wispr Flow key and talk. Your sentence lands in the steer box, and the reel
            re-plans around it. Every change can be undone.
          </p>
          <ul className="mt-10 divide-y divide-line border-y border-line">
            {EXAMPLES.map(({ said, does }) => (
              <li
                key={said}
                className="flex flex-col gap-1 py-3.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
              >
                <span className="font-mono text-sm text-fg">&ldquo;{said}&rdquo;</span>
                <span className="text-sm text-fg-subtle sm:text-right">{does}</span>
              </li>
            ))}
          </ul>
        </div>
        <SteerDemo />
      </div>
    </section>
  );
}
