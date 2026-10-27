import { describe, expect, it } from "vitest";
import { wrapText } from "@/lib/render/wrapText";

// One unit per character, like a monospace font.
const mono = (s: string) => Array.from(s).length;

describe("wrapText", () => {
  it("wraps at words and keeps paragraph breaks", () => {
    expect(wrapText(mono, "make it a minute\nkeep step four", 10, 10)).toEqual([
      "make it a",
      "minute",
      "keep step",
      "four",
    ]);
  });

  it("splits a token wider than the line so nothing overflows", () => {
    const lines = wrapText(mono, "see src/lib/render/drawOverlay.ts now", 12, 10);
    expect(lines).toEqual(["see", "src/lib/rend", "er/drawOverl", "ay.ts now"]);
    expect(lines.every((l) => mono(l) <= 12)).toBe(true);
  });

  it("clamps with an ellipsis that still fits the line", () => {
    const lines = wrapText(mono, "aaaa bbbb cccc dddd eeee ffff", 9, 2);
    expect(lines).toEqual(["aaaa bbbb", "cccc…"]);
    expect(wrapText(mono, "abcdefghijklmnop", 5, 1)).toEqual(["abcd…"]);
  });

  it("keeps astral characters whole when splitting", () => {
    const lines = wrapText(mono, "\u{10400}".repeat(7), 3, 5);
    expect(lines).toEqual(["\u{10400}".repeat(3), "\u{10400}".repeat(3), "\u{10400}"]);
  });
});
