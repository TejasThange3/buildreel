"use client";

import { LiquidMetal } from "@paper-design/shaders-react";
import { Suspense, useEffect, useState } from "react";
import { useInView } from "./useInView";
import { useReducedMotion, useWebGL2 } from "./usePageState";

const WORD = "Buildreel";
const PX = 360;
const TRACKING = -0.05;
// The word's box, measured from Geist 600 at this tracking and cropped to the glyphs. The wrapper
// holds this ratio from the first paint, so nothing below it moves when the shader takes over.
const ASPECT = 5.05;
const METAL_GRADIENT =
  "bg-[linear-gradient(100deg,#6b6b72,#d8d8de_30%,var(--color-voice)_55%,#9a9aa2_80%)]";

// Paper's LiquidMetal flows inside the alpha of an image, so the word is drawn once, in the page's
// own font, onto a transparent canvas cropped to the glyphs and handed over as a PNG.
async function wordImage(): Promise<string> {
  const font = `600 ${PX}px ${getComputedStyle(document.body).fontFamily}`;
  await document.fonts.load(font, WORD);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas is unavailable.");
  const setFont = () => {
    ctx.font = font;
    ctx.letterSpacing = `${TRACKING * PX}px`;
  };
  setFont();
  const m = ctx.measureText(WORD);
  const pad = PX * 0.01;
  canvas.width = Math.ceil(m.actualBoundingBoxLeft + m.actualBoundingBoxRight + pad * 2);
  canvas.height = Math.ceil(m.actualBoundingBoxAscent + m.actualBoundingBoxDescent + pad * 2);
  // Resizing a canvas resets its context state.
  setFont();
  ctx.fillStyle = "#fff";
  ctx.fillText(WORD, pad + m.actualBoundingBoxLeft, pad + m.actualBoundingBoxAscent);
  return canvas.toDataURL("image/png");
}

// The work starts only once the footer is on screen. Until then, and without WebGL2, the word is
// CSS text with a metal gradient; while Paper processes the image, the same gradient is masked by
// the word image itself, so the shape never jumps.
export function FooterWordmark() {
  const [ref, near] = useInView<HTMLDivElement>(0.01);
  const metal = useWebGL2();
  const still = useReducedMotion();
  const [image, setImage] = useState<string>();

  useEffect(() => {
    if (!metal || !near) return;
    let live = true;
    wordImage().then((url) => live && setImage(url), reportError);
    return () => {
      live = false;
    };
  }, [metal, near]);

  return (
    <div
      ref={ref}
      aria-hidden
      style={{ aspectRatio: ASPECT }}
      className="relative w-full select-none [container-type:inline-size]"
    >
      {image ? (
        <Suspense
          fallback={
            <div
              style={{ maskImage: `url(${image})`, maskSize: "100% 100%" }}
              className={`size-full opacity-85 ${METAL_GRADIENT}`}
            />
          }
        >
          <LiquidMetal
            suspendWhenProcessingImage
            className="size-full opacity-85 animate-[fade-in_900ms_var(--ease-out-expo)_both]"
            image={image}
            fit="contain"
            colorBack="#00000000"
            colorTint="#ffc8b4"
            repetition={2.5}
            softness={0.6}
            shiftRed={0.15}
            shiftBlue={0}
            distortion={0.08}
            contour={0.25}
            angle={70}
            scale={1}
            speed={still ? 0 : 0.4}
          />
        </Suspense>
      ) : (
        <p
          className={`absolute inset-0 flex items-center justify-center bg-clip-text text-[26.3cqw] leading-none font-semibold tracking-[-0.05em] text-transparent ${METAL_GRADIENT}`}
        >
          {WORD}
        </p>
      )}
    </div>
  );
}
