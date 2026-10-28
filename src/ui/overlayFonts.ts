import type { OverlayFonts } from "@/lib/render/drawOverlay";

// The page fonts, as canvas font families, so preview and export draw overlays alike.
export function readFonts(): OverlayFonts {
  const style = getComputedStyle(document.documentElement);
  return {
    sans: style.getPropertyValue("--font-geist-sans") || "sans-serif",
    mono: style.getPropertyValue("--font-geist-mono") || "monospace",
  };
}
