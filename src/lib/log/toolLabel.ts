const EDIT_TOOLS = new Set(["Edit", "Write", "MultiEdit", "NotebookEdit"]);
const SHELL_TOOLS = new Set(["Bash", "PowerShell"]);
const READ_TOOLS = new Set(["Read", "Grep", "Glob"]);
// Agent bookkeeping (desktop task list and wrap-up, tool discovery) is not work a viewer would recognise.
const HIDDEN_TOOL = /^(mcp__ccd_|ToolSearch$|TodoWrite$)/;

export const isHiddenTool = (name: string) => HIDDEN_TOOL.test(name);
export const isReadTool = (name: string) => READ_TOOLS.has(name);

function stringField(input: Record<string, unknown>, key: string): string | undefined {
  const value = input[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function toolLabel(name: string, input: Record<string, unknown>): string {
  if (EDIT_TOOLS.has(name)) {
    const path = stringField(input, "file_path") ?? stringField(input, "notebook_path") ?? "";
    return `Edited ${path.split(/[\\/]/).pop()}`;
  }
  if (SHELL_TOOLS.has(name)) {
    const what = stringField(input, "description") ?? stringField(input, "command")?.slice(0, 40);
    return `Ran ${what ?? name}`;
  }
  if (name === "Agent" || name === "Task") return "Started a subagent";
  return name.split("__").pop() ?? name;
}

export function readLabel(count: number): string {
  return `Read ${count} ${count === 1 ? "file" : "files"}`;
}
