type SortedFiles = { videos: File[]; logs: File[]; projects: File[] };

const extension = (file: File) => file.name.toLowerCase().split(".").pop() ?? "";

// Claude Code logs are .jsonl, a saved Buildreel project is .json, anything else is taken as the
// recording and probed; a file that is not a video fails there with a clear message.
export function sortFiles(files: File[]): SortedFiles {
  const sorted: SortedFiles = { videos: [], logs: [], projects: [] };
  for (const file of files) {
    const kind = extension(file);
    if (kind === "jsonl") sorted.logs.push(file);
    else if (kind === "json") sorted.projects.push(file);
    else sorted.videos.push(file);
  }
  return sorted;
}

// Logs and projects are read whole and parsed on the page, so their size is capped before any of
// it is read. Long real sessions run to about 20 MB of log.
const MB = 1024 * 1024;
const MAX_LOG = 100 * MB;
const MAX_LOGS = 300 * MB;
const MAX_PROJECT = MB;

export function sizeProblem({ logs, projects }: SortedFiles): string | undefined {
  const big = logs.find((f) => f.size > MAX_LOG);
  if (big) return `${big.name} is over 100 MB. Pick the log of this session only.`;
  if (logs.reduce((sum, f) => sum + f.size, 0) > MAX_LOGS)
    return "These logs add up to over 300 MB. Pick only the ones from this session.";
  const project = projects.find((f) => f.size > MAX_PROJECT);
  if (project) return `${project.name} is too large to be a Buildreel project file.`;
  return undefined;
}
