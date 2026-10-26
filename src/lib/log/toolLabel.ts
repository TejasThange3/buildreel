import { redact } from "./redact";

const EDIT_TOOLS = new Set(["Edit", "Write", "MultiEdit", "NotebookEdit"]);
const SHELL_TOOLS = new Set(["Bash", "PowerShell"]);
const READ_TOOLS = new Set(["Read", "Grep", "Glob"]);
// Agent bookkeeping (desktop task list and wrap-up, tool discovery) is not work a viewer would recognise.
const HIDDEN_TOOL = /^(mcp__ccd_|ToolSearch$|TodoWrite$)/;

export const isHiddenTool = (name: string) => HIDDEN_TOOL.test(name);
export const isReadTool = (name: string) => READ_TOOLS.has(name);

function stringField(input: Record<string, unknown>, key: string): string | undefined {
  const value = input[key];
  // Redact the raw value first: truncation can cut a key below the length its pattern needs,
  // and env lines are only recognised at the start of a line. Then collapse to one line.
  const text = typeof value === "string" ? redact(value).replace(/\s+/g, " ").trim() : "";
  return text || undefined;
}

export function toolLabel(name: string, input: Record<string, unknown>): string {
  if (EDIT_TOOLS.has(name)) {
    const path = stringField(input, "file_path") ?? stringField(input, "notebook_path");
    return path ? `Edited ${path.split(/[\\/]/).pop()}` : "Edited a file";
  }
  if (SHELL_TOOLS.has(name)) {
    const what =
      stringField(input, "description") ?? stringField(input, "command")?.slice(0, 40).trimEnd();
    return `Ran ${what ?? name}`;
  }
  if (name === "Agent" || name === "Task") return "Started a subagent";
  return name.split("__").pop() ?? name;
}

export function readLabel(count: number): string {
  return `Read ${count} ${count === 1 ? "file" : "files"}`;
}
