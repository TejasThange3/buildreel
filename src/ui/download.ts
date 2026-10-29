export function download(url: string, name: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
}

// A data URL needs no revoking, and text exports are a few kilobytes at most.
export function downloadText(text: string, type: string, name: string) {
  download(`data:${type};charset=utf-8,${encodeURIComponent(text)}`, name);
}
