"use client";

import { LiquidMetal } from "@paper-design/shaders-react";
import { useEffect, useState } from "react";
import { useReducedMotion, useWebGL2 } from "./usePageState";

const WORD = "Buildreel";
const PX = 360;

// Paper's LiquidMetal flows inside the alpha of an image, so the word is drawn once, in the page's
// own font, onto a transparent canvas and handed over as a PNG.
async function wordImage(): Promise<{ url: string; aspect: number }> {
  const family = getComputedStyle(document.body).fontFamily;
  const font = `600 ${PX}px ${family}`;
  await document.fonts.load(font, WORD);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas is unavailable.");
  ctx.font = font;
  ctx.letterSpacing = `${-0.05 * PX}px`;
  const metrics = ctx.measureText(WORD);
  // Cropped to the glyphs, plus a hair for the shader's edge, so the word spans the grid exactly.
  const pad = PX * 0.01;
  canvas.width = Math.ceil(
    metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight + pad * 2,
  );
  canvas.height = Math.ceil(
    metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent + pad * 2,
  );
  ctx.font = font;
  ctx.letterSpacing = `${-0.05 * PX}px`;
  ctx.fillStyle = "#fff";
  ctx.fillText(WORD, pad + metrics.actualBoundingBoxLeft, pad + metrics.actualBoundingBoxAscent);
  return { url: canvas.toDataURL("image/png"), aspect: canvas.width / canvas.height };
}

// Until the shader is ready, and without WebGL2, the word is CSS text with a metal gradient.
export function FooterWordmark() {
  const metal = useWebGL2();
  const still = useReducedMotion();
  const [image, setImage] = useState<{ url: string; aspect: number }>();

  useEffect(() => {
    if (!metal) return;
    let live = true;
    wordImage().then((word) => live && setImage(word), reportError);
    return () => {
      live = false;
    };
  }, [metal]);

  if (!image)
    return (
      <p
        aria-hidden
        className="bg-[linear-gradient(100deg,#6b6b72,#d8d8de_30%,var(--color-voice)_55%,#9a9aa2_80%)] bg-clip-text text-center text-[21cqw] leading-[0.95] font-semibold tracking-[-0.05em] text-transparent select-none"
      >
        {WORD}
      </p>
    );
  return (
    <LiquidMetal
      aria-hidden
      style={{ aspectRatio: image.aspect }}
      className="w-full animate-[fade-in_900ms_var(--ease-out-expo)_both]"
      image={image.url}
      fit="contain"
      colorBack="#00000000"
      colorTint="#ffc2ab"
      repetition={3}
      softness={0.35}
      shiftRed={0.35}
      shiftBlue={0}
      distortion={0.1}
      contour={0.35}
      angle={70}
      scale={1}
      speed={still ? 0 : 0.5}
    />
  );
}
