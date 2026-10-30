import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/ui/Logo";
import { GlassLink } from "@/ui/landing/GlassLink";

type Step = { title: string; lead: string; points: ReactNode[] };

const Path = ({ children }: { children: string }) => (
  <code className="rounded-md bg-surface px-1.5 py-0.5 font-mono text-[13px] text-fg">
    {children}
  </code>
);

const STEPS: Step[] = [
  {
    title: "Record while you build",
    lead: "Start a screen recording before your first prompt and stop it when you are done.",
    points: [
      <>
        Any recorder that saves MP4 or MKV works. OBS names each file after the moment it started,
        like <Path>2026-10-29 13-20-48.mp4</Path>; keep that name, Buildreel lines up your session
        with it.
      </>,
      "Build with Claude Code as usual and dictate each prompt with Wispr Flow. Keep your microphone on: every prompt card plays the prompt as you said it.",
      "After each prompt, try the result on screen for a few seconds. Those moments play in real time in the reel.",
      "Close anything private first. Whatever is on screen can end up in the reel.",
    ],
  },
  {
    title: "Find your two files",
    lead: "The recording and the Claude Code log of the same session. They sit in different folders, so the editor takes them one at a time.",
    points: [
      "The recording is wherever your recorder saved it. OBS uses your Videos folder unless you changed it.",
      <>
        The log is a .jsonl file. On Windows open <Path>%USERPROFILE%\.claude\projects</Path> (paste
        it into the address bar of the file window); on a Mac press Cmd Shift G and open{" "}
        <Path>~/.claude/projects</Path> (on Linux, Ctrl L in the file window). Go into the folder
        named after your project and pick the newest file. If the session spans several files, add
        them all. If you set CLAUDE_CONFIG_DIR, the projects folder is inside that directory.
      </>,
      'Open the editor, press "Use your own files", add the recording, then the log, and press "Make my reel".',
    ],
  },
  {
    title: "Line them up",
    lead: "Buildreel matches the log to the video by time. You check it once.",
    points: [
      "The player opens where your first prompt should appear, with that prompt shown next to it.",
      'If the prompt shows up in the chat at that moment, press "Looks right".',
      'If not, move the slider to the frame where it appears, press "Prompt 1 is here", then "Looks right".',
    ],
  },
  {
    title: "Watch, adjust and export",
    lead: "Buildreel plans the reel straight away. Press play: each step is one prompt, shown as your prompt card with your voice, the agent's work fast-forwarded, then you checking the result.",
    points: [
      "Reel length picks 30, 60 or 90 seconds. The steps share the time by how much happened in each.",
      "Steps lists one row per prompt. Click a row to jump to it; switch it off to cut that step, and the others get its time. Name steps asks the AI for short titles from your prompts; review the prompt cards first if any hold something private.",
      'Steer by voice takes a sentence. Click the box, hold your Wispr Flow key and say a change, such as "make it a minute" or "give step 2 more time", then press Enter. Undo sits next to it.',
      "Prompt cards let you fix a word in any prompt, or hide a card, which also hides its voice.",
      "Export renders the mp4 in your browser, 16:9 or 9:16 for Shorts and Reels, with background noise taken out of your voice. SRT downloads the captions for YouTube or LinkedIn, and the post draft gives you text for X and LinkedIn to copy.",
      "Save downloads a small project file. Add it with the same two files next time to pick up where you left off.",
    ],
  },
];

export function Guide() {
  return (
    <div className="min-h-[100dvh]">
      <nav className="mx-auto flex h-16 w-full max-w-4xl items-center justify-between px-4 sm:px-6">
        <Link href="/">
          <Logo />
        </Link>
        {/* Plain links: a reading page has no use for the landing page's shader buttons. */}
        <GlassLink href="/editor" size="sm">
          Open the editor
        </GlassLink>
      </nav>
      <main className="mx-auto w-full max-w-4xl px-4 pt-10 pb-24 sm:px-6 sm:pt-16">
        <p className="font-mono text-xs tracking-wider text-fg-subtle uppercase">Guide</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          From a recorded session to a reel in four steps
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-pretty text-fg-muted">
          Nothing to install and no account. Your recording and log are read in your browser and
          never uploaded. The editor opens with a sample build, so you can try every control before
          you record your own.
        </p>
        <ol className="mt-14 space-y-12">
          {STEPS.map((step, i) => (
            <li
              key={step.title}
              className="grid gap-4 border-t border-line pt-8 sm:grid-cols-[4rem_1fr]"
            >
              <span className="font-mono text-sm text-fg-subtle tabular-nums">0{i + 1}</span>
              <div>
                <h2 className="text-xl font-semibold tracking-tight">{step.title}</h2>
                <p className="mt-2 leading-relaxed text-pretty text-fg">{step.lead}</p>
                <ul className="mt-4 space-y-3">
                  {step.points.map((point, j) => (
                    <li key={j} className="flex gap-3 leading-relaxed text-pretty text-fg-muted">
                      <span
                        aria-hidden
                        className="mt-2.5 size-1 shrink-0 rounded-full bg-fg-subtle"
                      />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-16 flex flex-wrap items-center gap-4 border-t border-line pt-10">
          <Link
            href="/editor"
            className="inline-flex h-12 items-center rounded-full bg-fg px-6 text-sm font-medium text-canvas transition-transform active:scale-[0.97]"
          >
            Try the sample build
          </Link>
          <p className="text-sm text-fg-muted">
            It opens in a second and plays a real 17 minute session.
          </p>
        </div>
      </main>
    </div>
  );
}
