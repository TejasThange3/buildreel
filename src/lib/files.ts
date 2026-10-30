export type SortedFiles = { videos: File[]; logs: File[]; projects: File[] };

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
