import Link from "next/link";
import { HeroGlass } from "./HeroGlass";

export function Hero() {
  return (
    <section className="relative isolate flex min-h-[100dvh] flex-col overflow-hidden">
      <HeroGlass />
      {/* Keeps the headline legible where the light passes behind it. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,var(--color-canvas)_8%,transparent_55%)] lg:bg-[linear-gradient(to_right,rgb(10_10_12/0.85)_20%,transparent_58%)]"
      />
      <nav className="relative mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
        <span className="text-sm font-semibold tracking-tight">Buildreel</span>
        <div className="flex items-center gap-5 text-sm">
          <a
            href="https://github.com/TejasThange3/buildreel"
            className="text-fg-muted transition-colors hover:text-fg"
          >
            GitHub
          </a>
          <Link
            href="/editor"
            className="rounded-full border border-line-strong px-4 py-1.5 font-medium transition-colors hover:bg-white/5"
          >
            Open the editor
          </Link>
        </div>
      </nav>
      <div className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col justify-end px-4 pb-14 sm:px-6 lg:justify-center lg:pb-0">
        <div className="max-w-xl lg:max-w-[30rem] xl:max-w-xl">
          <h1 className="text-4xl leading-[1.05] font-semibold tracking-tighter text-balance sm:text-5xl xl:text-6xl">
            Hours of building, cut to ninety seconds.
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-pretty text-fg-muted">
            Drop your recording and Claude Code logs. Buildreel captions every step with the prompt
            you dictated and fast-forwards the rest.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/editor"
              className="inline-flex h-11 items-center rounded-full bg-fg px-6 text-sm font-medium text-canvas transition-transform duration-150 active:scale-[0.97]"
            >
              Open the editor
            </Link>
            <a
              href="#how"
              className="inline-flex h-11 items-center rounded-full px-5 text-sm font-medium text-fg-muted transition-colors hover:text-fg"
            >
              See how it works
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
