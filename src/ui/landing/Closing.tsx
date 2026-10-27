import Link from "next/link";
import { Logo } from "../Logo";
import { REPO_URL } from "./Hero";
import { MetalLink } from "./MetalLink";

// ARCHITECTURE.md section 11: media never leaves the browser; only short redacted text reaches
// our own /api routes.
const DATA = [
  {
    title: "Stays in your browser",
    items: ["Your screen recording", "Your Claude Code logs", "Every frame and the exported mp4"],
  },
  {
    title: "Reaches our server",
    items: ["The sentence you dictate", "Step titles and short prompt excerpts"],
  },
  {
    title: "Removed before anything is sent",
    items: ["API keys and tokens", "Email addresses", "KEY=value lines from .env files"],
  },
];

const LINKS = [
  { label: "Editor", href: "/editor" },
  { label: "How it works", href: "#how" },
  { label: "Source on GitHub", href: REPO_URL },
];

export function Closing() {
  return (
    <>
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 md:py-36">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr] lg:items-end lg:gap-16">
          <div>
            <p className="font-mono text-xs tracking-wider text-fg-subtle uppercase">
              Private by default
            </p>
            <h2 className="mt-4 text-4xl leading-[1.05] font-semibold tracking-tighter text-balance md:text-5xl">
              Your recording never leaves your browser.
            </h2>
          </div>
          <p className="max-w-lg leading-relaxed text-pretty text-fg-muted lg:pb-1">
            Buildreel decodes, plans and encodes on your machine. The only thing that travels is a
            little text, so the planner can understand what you asked for.
          </p>
        </div>

        <div className="mt-14 grid overflow-hidden rounded-[var(--radius-panel)] border border-line md:grid-cols-3">
          {DATA.map(({ title, items }, i) => (
            <div
              key={title}
              className="border-line bg-surface/60 p-6 max-md:border-t max-md:first:border-t-0 md:border-l md:first:border-l-0"
            >
              <p className="font-mono text-xs text-fg-subtle tabular-nums">0{i + 1}</p>
              <h3 className="mt-6 text-lg font-semibold tracking-tight">{title}</h3>
              <ul className="mt-4 space-y-2 text-sm text-fg-muted">
                {items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-24 flex flex-col items-start gap-8 rounded-[var(--radius-panel)] border border-line bg-[radial-gradient(120%_140%_at_100%_0%,rgb(255_255_255/0.06),transparent_60%)] p-8 sm:p-12 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl font-semibold tracking-tighter text-balance md:text-4xl">
              Turn your last session into a reel.
            </h2>
            <p className="mt-3 text-fg-muted">
              You need a screen recording and the logs in ~/.claude/projects.
            </p>
          </div>
          <MetalLink href="/editor">Open the editor</MetalLink>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-fg-subtle">
              Hours of building, cut to ninety seconds. Built hands-free with Wispr Flow and Claude
              Code.
            </p>
          </div>
          <nav aria-label="Footer">
            <p className="font-mono text-xs tracking-wider text-fg-subtle uppercase">Product</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              {LINKS.map(({ label, href }) => (
                <li key={label}>
                  <Link href={href} className="text-fg-muted transition-colors hover:text-fg">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div>
            <p className="font-mono text-xs tracking-wider text-fg-subtle uppercase">Made for</p>
            <p className="mt-4 text-sm leading-relaxed text-fg-muted">
              No Hands: The Wispr Challenge, by WeMakeDevs and Wispr Flow.
            </p>
          </div>
        </div>
        <div className="mx-auto flex max-w-7xl flex-col gap-2 border-t border-line px-4 py-6 text-xs text-fg-subtle sm:flex-row sm:justify-between sm:px-6">
          <p>Built by Tejas Thange, 2026.</p>
          <p>Your video and logs stay on your device.</p>
        </div>
      </footer>
    </>
  );
}
