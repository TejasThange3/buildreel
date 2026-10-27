import type { ReactNode } from "react";

// Every landing section opens the same way: the eyebrow on its own row, then the heading and its
// copy on two equal columns with their tops aligned, so the sections share one grid.
export function SectionHeader({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-x-16 gap-y-5 lg:grid-cols-2">
      <p className="font-mono text-xs tracking-wider text-fg-subtle uppercase lg:col-span-2">
        {eyebrow}
      </p>
      <h2 className="text-4xl leading-[1.05] font-semibold tracking-tighter text-balance md:text-5xl">
        {title}
      </h2>
      <p className="max-w-xl text-lg leading-relaxed text-pretty text-fg-muted lg:pt-1">
        {children}
      </p>
    </div>
  );
}
