import { CountUp } from "./CountUp";
import { CutDiagram } from "./CutDiagram";
import { SectionHeader } from "./SectionHeader";

const STATS = [
  { seconds: 1752, unit: "clock", label: "recorded" },
  { seconds: 1596, unit: "min", label: "of agent work" },
  { seconds: 17.7, unit: "s", label: "of reel" },
] as const;

export function HowItWorks() {
  return (
    <section id="how" className="mx-auto max-w-7xl scroll-mt-8 px-4 py-24 sm:px-6 md:py-36">
      <SectionHeader
        eyebrow="How it works"
        title={
          <>
            <span className="block">29 minutes of building.</span>
            <span className="block">18 seconds of reel.</span>
          </>
        }
      >
        Buildreel reads your Claude Code log to learn when you prompted, how long the agent worked
        and when you checked the result, then cuts the recording around those moments. This cut is a
        real one, from the build of Buildreel.
      </SectionHeader>

      <dl className="mt-16 grid grid-cols-3 border-y border-line">
        {STATS.map(({ seconds, unit, label }) => (
          <div
            key={label}
            className="flex flex-col-reverse border-line py-7 pl-4 not-first:border-l first:pl-0 sm:pl-8"
          >
            <dt className="mt-1 text-sm text-fg-subtle">{label}</dt>
            <dd className="text-2xl font-semibold tracking-tight sm:text-5xl">
              <CountUp seconds={seconds} unit={unit} />
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
