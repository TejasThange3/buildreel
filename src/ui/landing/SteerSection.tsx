import { SteerDemo } from "./SteerDemo";

export function SteerSection() {
  return (
    <section className="border-y border-line bg-surface/40 px-4 py-24 sm:px-6 md:py-32">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-balance md:text-4xl">
          Change the cut by saying so.
        </h2>
        <p className="mx-auto mt-4 max-w-lg leading-relaxed text-pretty text-fg-muted">
          Hold your Wispr Flow key and talk. Your sentence lands in the steer box and the reel
          re-plans around it.
        </p>
      </div>
      <div className="mt-14">
        <SteerDemo />
      </div>
    </section>
  );
}
