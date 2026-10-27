import type { ReactNode } from "react";

const SIZE = {
  sm: "h-9 gap-2 px-4 text-[13px]",
  md: "h-12 gap-2.5 px-6 text-sm",
};

// The quieter partner of MetalLink: a frosted pill with a lit top edge, for secondary links.
export function GlassLink({
  href,
  children,
  size = "md",
}: {
  href: string;
  children: ReactNode;
  size?: keyof typeof SIZE;
}) {
  return (
    <a
      href={href}
      className={`group inline-flex items-center justify-center rounded-full border border-white/12 bg-[linear-gradient(180deg,rgb(255_255_255/0.09),rgb(255_255_255/0.03))] font-medium whitespace-nowrap text-fg/85 shadow-[inset_0_1px_0_rgb(255_255_255/0.16),inset_0_-1px_0_rgb(0_0_0/0.3),0_8px_24px_-12px_rgb(0_0_0/0.8)] backdrop-blur-xl transition-[border-color,background-color,color,transform] duration-200 hover:border-white/25 hover:bg-white/[0.08] hover:text-fg active:scale-[0.97] ${SIZE[size]}`}
    >
      {children}
    </a>
  );
}
