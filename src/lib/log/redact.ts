const REDACTED = "[redacted]";

// Keep the variable name so the caption still says what was set.
const ENV_LINE = /^(\s*(?:export\s+)?[A-Z][A-Z0-9_]{2,}\s*=\s*)\S.*$/gm;
const KEY_SHAPES = [
  /\bsk-[A-Za-z0-9_-]{20,}/g,
  /\bgsk_[A-Za-z0-9]{20,}/g,
  /\bAIza[A-Za-z0-9_-]{35}/g,
  /\bgh[pousr]_[A-Za-z0-9]{30,}/g,
  /\bgithub_pat_[A-Za-z0-9_]{20,}/g,
];
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const LONG_HEX = /\b[0-9a-f]{32,}\b/g;
const LONG_RUN = /[A-Za-z0-9+_-]{32,}={0,2}/g;

// A long run is a token only if it mixes digits and both cases; that spares
// long identifiers and folder names such as "D--Hackathon-Buildreel---WemakeDevs".
function looksLikeToken(run: string): boolean {
  return /\d/.test(run) && /[a-z]/.test(run) && /[A-Z]/.test(run);
}

export function redact(text: string): string {
  let out = text.replace(ENV_LINE, `$1${REDACTED}`);
  for (const shape of KEY_SHAPES) out = out.replace(shape, REDACTED);
  return out
    .replace(EMAIL, REDACTED)
    .replace(LONG_HEX, REDACTED)
    .replace(LONG_RUN, (run) => (looksLikeToken(run) ? REDACTED : run));
}
