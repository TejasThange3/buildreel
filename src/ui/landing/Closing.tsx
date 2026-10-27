import Link from "next/link";
import { Logo } from "../Logo";
import { FooterWordmark } from "./FooterWordmark";
import { REPO_URL } from "./Hero";
import { MetalLink } from "./MetalLink";
import { PrivacyFlow } from "./PrivacyFlow";
import { SectionHeader } from "./SectionHeader";

const LINKS = [
  { label: "Editor", href: "/editor" },
  { label: "How it works", href: "#how" },
  { label: "Source on GitHub", href: REPO_URL },
];

export function Closing() {
  return (
    <>
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 md:py-36">
        <SectionHeader
          eyebrow="Private by default"
          title={
            <>
              <span className="block">Your recording never</span>
              <span className="block">leaves your browser.</span>
            </>
          }
        >
          Buildreel decodes, plans and encodes on your machine. The only thing that travels is a
          little cleaned-up text, so the planner can understand what you asked for.
        </SectionHeader>

        <div className="mt-16">
          <PrivacyFlow />
        </div>

        <div className="mt-24 grid items-center gap-8 rounded-[var(--radius-panel)] border border-line bg-[radial-gradient(120%_140%_at_100%_0%,rgb(255_255_255/0.06),transparent_60%)] p-8 sm:p-12 md:grid-cols-[1fr_auto]">
          <div>
            <h2 className="text-3xl font-semibold tracking-tighter text-balance md:text-4xl">
              Turn your last session into a reel.
            </h2>
            <p className="mt-3 text-lg text-fg-muted">
              You need a screen recording and the logs in ~/.claude/projects.
            </p>
          </div>
          <MetalLink href="/editor">Open the editor</MetalLink>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 pt-16 pb-12 sm:px-6 md:grid-cols-[2fr_1fr_1fr]">
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
        <div className="mx-auto max-w-7xl px-4 pb-8 sm:px-6">
          <FooterWordmark />
        </div>
      </footer>
    </>
  );
}
