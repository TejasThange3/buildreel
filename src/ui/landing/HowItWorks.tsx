import { CutDiagram } from "./CutDiagram";

export function HowItWorks() {
  return (
    <section id="how" className="mx-auto max-w-5xl scroll-mt-8 px-4 py-24 sm:px-6 md:py-32">
      <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-balance md:text-4xl">
        29 minutes of building. 18 seconds of reel.
      </h2>
      <p className="mt-4 max-w-xl leading-relaxed text-pretty text-fg-muted">
        Every cut comes from your session log: when you prompted, how long the agent worked, and
        when you checked the result. This one is from the build of Buildreel.
      </p>
      <div className="mt-14">
        <CutDiagram />
      </div>
    </section>
  );
}
