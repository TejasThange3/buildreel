import { GithubLogoIcon } from "@phosphor-icons/react/dist/ssr";
import { Logo } from "../Logo";
import { HeroGlass } from "./HeroGlass";
import { HeroReel } from "./HeroReel";
import { MetalLink } from "./MetalLink";
import { SLAB_CLASS } from "./slab";

const REPO_URL = "https://github.com/TejasThange3/buildreel";

export function Hero() {
  return (
    <section className="relative isolate flex min-h-[100dvh] flex-col overflow-hidden">
      <HeroGlass />
      {/* Keeps the headline legible where the light passes behind it. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,var(--color-canvas)_8%,transparent_55%)] lg:bg-[linear-gradient(to_right,rgb(10_10_12/0.85)_20%,transparent_58%)]"
      />
      {/* The reel plays on the glass face; it fades in after the shader's own idle-time start. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 [container-type:size]">
        <div
          className={`${SLAB_CLASS} [container-type:inline-size] animate-[fade-in_900ms_var(--ease-out-expo)_600ms_both]`}
        >
          <HeroReel />
        </div>
      </div>
      <nav className="relative mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <div className="flex items-center gap-2">
          <a
            href={REPO_URL}
            className="inline-flex h-9 items-center gap-2 rounded-full border border-line bg-white/[0.03] px-3.5 text-[13px] text-fg-muted backdrop-blur transition-colors hover:border-line-strong hover:text-fg"
          >
            <GithubLogoIcon aria-hidden className="size-4" />
            <span className="max-sm:sr-only">GitHub</span>
          </a>
          <MetalLink href="/editor" size="sm">
            Open the editor
          </MetalLink>
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
            <MetalLink href="/editor">Open the editor</MetalLink>
            <a
              href="#how"
              className="inline-flex h-12 items-center rounded-full px-5 text-sm font-medium text-fg-muted transition-colors hover:text-fg"
            >
              See how it works
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
