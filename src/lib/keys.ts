type Shortcut = "play" | "back" | "forward" | "previousStep" | "nextStep" | "undo" | "redo";

type Keypress = {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
};

export const SEEK_S = 5;

// Editor keys, as in most video editors: Space or K plays, arrows move 5 s, Shift and an arrow
// jumps a step, and Ctrl or Cmd with Z undoes (with Shift, or Ctrl Y, redoes).
export function shortcutFor({
  key,
  ctrlKey,
  metaKey,
  shiftKey,
  altKey,
}: Keypress): Shortcut | undefined {
  if (altKey) return undefined;
  const command = ctrlKey || metaKey;
  const lower = key.toLowerCase();
  if (command) {
    if (lower === "z") return shiftKey ? "redo" : "undo";
    if (lower === "y" && ctrlKey && !shiftKey) return "redo";
    return undefined;
  }
  if (key === " " || lower === "k") return shiftKey ? undefined : "play";
  if (key === "ArrowLeft") return shiftKey ? "previousStep" : "back";
  if (key === "ArrowRight") return shiftKey ? "nextStep" : "forward";
  return undefined;
}

// The step start to jump to from outT. Going back from just after a step's start lands on the
// step before, so a second press keeps moving instead of sticking at one start.
export function adjacentStart(starts: number[], outT: number, direction: 1 | -1) {
  const sorted = [...starts].sort((a, b) => a - b);
  if (direction === 1) return sorted.find((s) => s > outT + 0.05);
  return sorted.findLast((s) => s < outT - 0.5);
}
