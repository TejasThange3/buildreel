import { describe, expect, it } from "vitest";
import { adjacentStart, shortcutFor } from "@/lib/keys";

const press = (
  key: string,
  mods: Partial<Record<"ctrl" | "meta" | "shift" | "alt", boolean>> = {},
) =>
  shortcutFor({
    key,
    ctrlKey: mods.ctrl ?? false,
    metaKey: mods.meta ?? false,
    shiftKey: mods.shift ?? false,
    altKey: mods.alt ?? false,
  });

describe("shortcutFor", () => {
  it("plays with Space or K and moves with the arrows", () => {
    expect(press(" ")).toBe("play");
    expect(press("K")).toBe("play");
    expect(press("ArrowLeft")).toBe("back");
    expect(press("ArrowRight", { shift: true })).toBe("nextStep");
  });

  it("undoes and redoes with Ctrl or Cmd", () => {
    expect(press("z", { ctrl: true })).toBe("undo");
    expect(press("Z", { meta: true, shift: true })).toBe("redo");
    expect(press("y", { ctrl: true })).toBe("redo");
    expect(press("y", { meta: true })).toBeUndefined();
  });

  it("leaves other keys and browser shortcuts alone", () => {
    expect(press("a")).toBeUndefined();
    expect(press("ArrowLeft", { alt: true })).toBeUndefined();
    expect(press("r", { ctrl: true })).toBeUndefined();
  });
});

describe("adjacentStart", () => {
  const starts = [2.5, 31.1, 58.5];

  it("jumps to the next step start", () => {
    expect(adjacentStart(starts, 0, 1)).toBe(2.5);
    expect(adjacentStart(starts, 31.1, 1)).toBe(58.5);
    expect(adjacentStart(starts, 70, 1)).toBeUndefined();
  });

  it("goes back past a start it is sitting on", () => {
    expect(adjacentStart(starts, 40, -1)).toBe(31.1);
    expect(adjacentStart(starts, 31.3, -1)).toBe(2.5);
    expect(adjacentStart(starts, 2.6, -1)).toBeUndefined();
  });
});
