import Link from "next/link";

export function Closing() {
  return (
    <footer className="mx-auto max-w-5xl px-4 pt-24 pb-10 sm:px-6 md:pt-32">
      <h2 className="max-w-xl text-3xl font-semibold tracking-tight text-balance md:text-4xl">
        Your recording never leaves your browser.
      </h2>
      <p className="mt-4 max-w-xl leading-relaxed text-pretty text-fg-muted">
        Buildreel decodes, plans and encodes on your machine. Only step titles and your typed
        instruction reach the server, with keys and emails removed first.
      </p>
      <Link
        href="/editor"
        className="mt-10 inline-flex h-11 items-center rounded-full bg-fg px-6 text-sm font-medium text-canvas transition-transform duration-150 active:scale-[0.97]"
      >
        Open the editor
      </Link>
      <div className="mt-24 flex flex-col gap-3 border-t border-line pt-6 text-sm text-fg-subtle sm:flex-row sm:items-center sm:justify-between">
        <p>Built for No Hands: The Wispr Challenge, by WeMakeDevs and Wispr Flow.</p>
        <a
          href="https://github.com/TejasThange3/buildreel"
          className="transition-colors hover:text-fg"
        >
          Source on GitHub
        </a>
      </div>
    </footer>
  );
}
