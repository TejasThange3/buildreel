// The mark is a cut B: the coral bar is the dictated prompt, the two pills are reel segments.
// app/icon.svg draws the same shapes for the browser tab.
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden className={className}>
      <rect x="1" y="1" width="62" height="62" rx="16" fill="#18181c" stroke="#3a3a42" />
      <rect x="18" y="15" width="6" height="34" rx="3" fill="var(--color-voice)" />
      <rect x="27" y="15" width="18" height="15" rx="7.5" fill="var(--color-fg)" />
      <rect x="27" y="34" width="21" height="15" rx="7.5" fill="var(--color-fg-muted)" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark className="size-7" />
      <span className="text-[15px] font-semibold tracking-tight">Buildreel</span>
    </span>
  );
}
