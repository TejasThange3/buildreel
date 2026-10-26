import { describe, expect, it } from "vitest";
import { parseClaudeLogs } from "@/lib/log/parseClaudeLog";

// Hand-written lines in the shape of claude-desktop v2.1.308 records, for cases today's real
// session does not contain (interrupts, CLI lines without origin, slash commands, bad lines).
let seq = 0;
const at = (s: number) => new Date(Date.UTC(2026, 9, 26, 9, 0, s)).toISOString();

function user(s: number, content: unknown, extra: Record<string, unknown> = {}) {
  return JSON.stringify({
    type: "user",
    uuid: `u${++seq}`,
    timestamp: at(s),
    sessionId: "s1",
    isSidechain: false,
    message: { role: "user", content },
    ...extra,
  });
}

const human = (s: number, text: string) => user(s, text, { origin: { kind: "human" } });

function assistant(s: number, content: unknown[]) {
  return JSON.stringify({
    type: "assistant",
    uuid: `a${++seq}`,
    timestamp: at(s),
    sessionId: "s1",
    isSidechain: false,
    message: { role: "assistant", content },
  });
}

const tool = (name: string, input: Record<string, unknown>) => ({ type: "tool_use", name, input });
const text = (t: string) => ({ type: "text", text: t });
const parse = (...lines: string[]) => parseClaudeLogs([lines.join("\n")]);

describe("parseClaudeLogs", () => {
  it("counts malformed lines and ignores other record types", () => {
    const { events, skippedLines } = parse(
      "{not json",
      JSON.stringify({ type: "user", uuid: "x" }),
      JSON.stringify({ type: "attachment", attachment: { type: "date" } }),
      JSON.stringify({ type: "api-request-blob", content: [text("copied prompt")] }),
      human(1, "real prompt"),
    );
    expect(skippedLines).toBe(2);
    expect(events.filter((e) => e.kind === "prompt")).toHaveLength(1);
  });

  it("counts a bad line repeated across overlapping files once", () => {
    const file = ["{not json", human(1, "prompt")].join("\n");
    expect(parseClaudeLogs([file, file, file]).skippedLines).toBe(1);
  });

  it("keeps human prompts and drops tool results, meta, sidechain and non-human origins", () => {
    const { events } = parse(
      human(1, "add a parser"),
      user(2, [{ type: "tool_result", tool_use_id: "t1", content: "ok" }]),
      user(3, [text("[Image: source: C:/tmp/1.webp]")], { isMeta: true }),
      user(4, "subagent prompt", { isSidechain: true }),
      user(5, "queued notification", { origin: { kind: "task-notification" } }),
      user(6, "cli prompt without origin"),
    );
    expect(events.flatMap((e) => (e.kind === "prompt" ? [e.text] : []))).toEqual([
      "add a parser",
      "cli prompt without origin",
    ]);
  });

  it("filters slash command noise and tidies prompt text", () => {
    const { events } = parse(
      user(1, "<command-name>/clear</command-name>"),
      user(2, "<local-command-stdout></local-command-stdout>"),
      user(3, "<local-command-caveat>Caveat: generated</local-command-caveat>"),
      human(
        4,
        '@"D:\\Hackathon\\Buildreel\\ARCHITECTURE.md" read <pasted_content id="ab">this</pasted_content id="ab">',
      ),
    );
    expect(events).toEqual([
      {
        kind: "prompt",
        at: Date.parse(at(4)),
        text: "@ARCHITECTURE.md read this",
        sessionId: "s1",
      },
    ]);
  });

  it("labels tools, hides bookkeeping and folds reads per turn", () => {
    const { events } = parse(
      human(1, "go"),
      assistant(2, [tool("Read", { file_path: "a.ts" }), tool("Grep", { pattern: "x" })]),
      assistant(3, [tool("Edit", { file_path: "D:\\proj\\src\\lib\\plan\\fit.ts" })]),
      assistant(4, [tool("Bash", { description: "Run tests", command: "npm test" })]),
      assistant(5, [
        tool("Bash", { command: "git status --short && git log --oneline -5 --decorate" }),
      ]),
      assistant(6, [
        tool("Agent", { prompt: "research" }),
        tool("mcp__Claude_Browser__navigate", {}),
      ]),
      assistant(7, [tool("mcp__ccd_turn__update_plan", {}), tool("ToolSearch", {}), text("done")]),
      human(8, "next"),
      assistant(9, [tool("Read", { file_path: "b.ts" })]),
    );
    expect(events.flatMap((e) => (e.kind === "tool" ? [e.label] : []))).toEqual([
      "Read 2 files",
      "Edited fit.ts",
      "Ran Run tests",
      "Ran git status --short && git log --oneline",
      "Started a subagent",
      "navigate",
      "Read 1 file",
    ]);
    expect(events.filter((e) => e.kind === "reply")).toHaveLength(1);
  });

  it("ends a turn at its last assistant record, before the next prompt or interrupt", () => {
    const { events } = parse(
      human(1, "first"),
      assistant(2, [text("working")]),
      assistant(3, [tool("Bash", { command: "ls" })]),
      user(4, [text("[Request interrupted by user for tool use]")]),
      human(5, "second"),
      assistant(6, [text("ok")]),
    );
    expect(events.map((e) => `${e.kind}@${(e.at - Date.parse(at(0))) / 1000}`)).toEqual([
      "prompt@1",
      "reply@2",
      "tool@3",
      "turnEnd@3",
      "interrupt@4",
      "prompt@5",
      "reply@6",
      "turnEnd@6",
    ]);
  });

  it("merges overlapping files by uuid and sorts by time", () => {
    const p1 = human(1, "shared prompt");
    const p2 = human(2, "main branch prompt");
    const p3 = human(3, "side question");
    const { events } = parseClaudeLogs([`${p1}\n${p3}`, `${p1}\n${p2}`]);
    expect(events.flatMap((e) => (e.kind === "prompt" ? [e.text] : []))).toEqual([
      "shared prompt",
      "main branch prompt",
      "side question",
    ]);
  });

  it("redacts prompts and tool labels", () => {
    const { events } = parse(
      human(1, "use key gsk_Ab12Cd34Ef56Gh78Ij90Kl12"),
      assistant(2, [tool("Bash", { description: "Send to someone.name@example.com" })]),
    );
    expect(
      events.flatMap((e) => (e.kind === "prompt" ? [e.text] : e.kind === "tool" ? [e.label] : [])),
    ).toEqual(["use key [redacted]", "Ran Send to [redacted]"]);
  });
});
