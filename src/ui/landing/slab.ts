// The glass slab's box in CSS, for anything drawn over it (the reel, the no-WebGL fallback). It is
// glassRect in HeroGlass.tsx in container units: --hw is the half width, the height is
// --hw / 1.6 * 2 and the radius 22% of the half height. The parent must be a size container
// covering the hero, so the 1024px query sees the same width the shader does.
export const SLAB_CLASS =
  "absolute [--cx:50cqw] [--cy:22cqh] [--hw:min(42cqw,20cqh)] @min-[1024px]:[--cx:73cqw] @min-[1024px]:[--cy:50cqh] @min-[1024px]:[--hw:min(19cqw,40cqh)] left-[calc(var(--cx)_-_var(--hw))] top-[calc(var(--cy)_-_var(--hw)/1.6)] aspect-[1.6] w-[calc(var(--hw)*2)] rounded-[calc(var(--hw)*0.1375)]";
