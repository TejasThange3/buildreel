import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseClaudeLogs } from "@/lib/log/parseClaudeLog";

// Trimmed from the real Buildreel build session (claude-desktop v2.1.308, 26 Oct 2026): the
// main per-turn file plus a side-question branch that repeats its first three prompts.
// Long text is cut, tool output replaced with "…", and only three time windows are kept, so
// the turn ends at 09:26 and 10:01 are window edges, not real turn ends.
const fixture = (name: string) =>
  readFileSync(`tests/fixtures/desktop-session/${name}.jsonl`, "utf8");
const { events, skippedLines } = parseClaudeLogs([
  fixture("main-session"),
  fixture("side-question"),
]);
const prompts = events.flatMap((e) => (e.kind === "prompt" ? [e] : []));
const labels = events.flatMap((e) => (e.kind === "tool" ? [e.label] : []));

describe("real desktop session", () => {
  it("parses every line", () => {
    expect(skippedLines).toBe(0);
  });

  it("finds each prompt once, in submit order, including the side question", () => {
    expect(prompts.map((p) => p.text.replace(/\s+/g, " ").slice(0, 32))).toEqual([
      "@ARCHITECTURE.md @BUILDREEL.md G",
      "Once the OBS recording is runnin",
      "By OBS, do you mean this? Also, ",
      "Should I go with 60?",
      "You can start with phase zero. Y",
      "Okay, you can continue with phas",
    ]);
    expect(prompts.map((p) => p.sessionId.slice(0, 8))).toEqual([
      "d5193305",
      "d5193305",
      "d5193305",
      "02e5f2db",
      "d5193305",
      "d5193305",
    ]);
  });

  it("closes one turn per prompt", () => {
    expect(events.filter((e) => e.kind === "turnEnd")).toHaveLength(prompts.length);
  });

  it("labels real tool calls and hides the desktop task list", () => {
    expect(labels).toContain("Ran Check folder contents and installed tool versions");
    expect(labels).toContain("Edited settings.json");
    expect(labels).toContain("Read 4 files");
    expect(labels.filter((l) => l === "Started a subagent")).toHaveLength(3);
    expect(labels.some((l) => l.includes("update_plan"))).toBe(false);
  });

  it("keeps events in time order", () => {
    const times = events.map((e) => e.at);
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });
});
