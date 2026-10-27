export type Measure = (text: string) => number;

// A token wider than the line (a path, a URL, an identifier) is split into the longest pieces
// that fit, by code point, so it never runs past the panel.
function splitToken(measure: Measure, token: string, maxWidth: number): string[] {
  const pieces: string[] = [];
  let piece = "";
  for (const ch of Array.from(token)) {
    if (piece && measure(piece + ch) > maxWidth) {
      pieces.push(piece);
      piece = ch;
    } else {
      piece += ch;
    }
  }
  if (piece) pieces.push(piece);
  return pieces;
}

// Word-wraps text to maxWidth, keeps paragraph breaks, and clamps to maxLines. The last kept line
// gives up characters until it fits with its ellipsis. Takes a measure function so it works with
// any canvas font and can be tested without one.
export function wrapText(
  measure: Measure,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const pieces = measure(word) > maxWidth ? splitToken(measure, word, maxWidth) : [word];
      for (const piece of pieces) {
        const next = line ? `${line} ${piece}` : piece;
        if (line && measure(next) > maxWidth) {
          lines.push(line);
          line = piece;
        } else {
          line = next;
        }
      }
    }
    if (line) lines.push(line);
  }
  if (lines.length <= maxLines) return lines;
  const full = lines[maxLines - 1] ?? "";
  const chars = Array.from(full);
  while (chars.length > 0 && measure(`${chars.join("")}…`) > maxWidth) chars.pop();
  // A cut mid-word steps back to the previous space when there is one: "cccc…", not "cccc ddd…".
  let kept = chars.join("");
  if (kept.length < full.length && kept.includes(" ")) kept = kept.slice(0, kept.lastIndexOf(" "));
  return [...lines.slice(0, maxLines - 1), `${kept.trimEnd()}…`];
}
