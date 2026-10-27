import { CutDiagram } from "./CutDiagram";

const STATS = [
  { value: "29:12", label: "recorded" },
  { value: "26 min", label: "of agent work" },
  { value: "17.7 s", label: "of reel" },
];

export function HowItWorks() {
  return (
    <section id="how" className="mx-auto max-w-7xl scroll-mt-8 px-4 py-24 sm:px-6 md:py-36">
      <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr] lg:items-end lg:gap-16">
        <div>
          <p className="font-mono text-xs tracking-wider text-fg-subtle uppercase">How it works</p>
          <h2 className="mt-4 text-4xl leading-[1.05] font-semibold tracking-tighter text-balance md:text-5xl">
            <span className="block">29 minutes of building.</span>
            <span className="block">18 seconds of reel.</span>
          </h2>
        </div>
        <p className="max-w-lg leading-relaxed text-pretty text-fg-muted lg:pb-1">
          Buildreel reads your Claude Code log to learn when you prompted, how long the agent worked
          and when you checked the result, then cuts the recording around those moments. This cut is
          a real one, from the build of Buildreel.
        </p>
      </div>

      <dl className="mt-14 grid grid-cols-3 divide-x divide-line border-y border-line">
        {STATS.map(({ value, label }) => (
          <div key={label} className="px-3 py-6 first:pl-0 sm:px-6 sm:first:pl-0">
            <dt className="sr-only">{label}</dt>
            <dd className="text-2xl font-semibold tracking-tight tabular-nums sm:text-4xl">
              {value}
            </dd>
            <dd aria-hidden className="mt-1 text-sm text-fg-subtle">
              {label}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-16">
        <CutDiagram />
      </div>
    </section>
  );
}
