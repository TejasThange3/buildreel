"use client";

import { LiquidMetal } from "@paper-design/shaders-react";
import Link from "next/link";
import { type ReactNode, useEffect, useState } from "react";

const SIZE = {
  sm: "h-9 px-4 text-[13px]",
  md: "h-12 px-7 text-sm",
};

// A pill whose rim is liquid metal (Paper Shaders) with a dark face over it. The gradient under
// the shader is what shows when WebGL2 is missing, since Paper Shaders then never draws.
export function MetalLink({
  href,
  children,
  size = "md",
}: {
  href: string;
  children: ReactNode;
  size?: keyof typeof SIZE;
}) {
  const [hover, setHover] = useState(false);
  const [still, setStill] = useState(true);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setStill(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return (
    <Link
      href={href}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      className={`group relative isolate inline-flex items-center justify-center rounded-full font-medium whitespace-nowrap transition-transform duration-150 active:scale-[0.97] ${SIZE[size]}`}
    >
      <span
        aria-hidden
        className="absolute inset-0 -z-20 overflow-hidden rounded-full bg-[linear-gradient(120deg,#6b6b72,#e8e8ec_35%,#8a8a92_55%,#f4f4f6_75%,#77777e)]"
      >
        <LiquidMetal
          className="size-full"
          colorBack="#8e8e94"
          colorTint="#ffffff"
          shape="none"
          repetition={4}
          softness={0.45}
          shiftRed={0.3}
          shiftBlue={0.3}
          distortion={0.12}
          contour={0.2}
          angle={70}
          scale={1}
          speed={still ? 0 : hover ? 1.6 : 0.6}
        />
      </span>
      <span
        aria-hidden
        className="absolute inset-[2.5px] -z-10 rounded-full bg-[linear-gradient(180deg,#26262c,#101013)] shadow-[inset_0_1px_0_rgb(255_255_255/0.14)] transition-colors group-hover:bg-[linear-gradient(180deg,#2e2e35,#141418)]"
      />
      {children}
    </Link>
  );
}
