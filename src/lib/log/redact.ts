const REDACTED = "[redacted]";

// .env style is KEY=value with no spaces; prose like "NOTE = remember" or "A == b" is not.
// The variable name is kept so the caption still says what was set.
const ENV_LINE = /^([ \t]*(?:export[ \t]+)?[A-Z][A-Z0-9_]{2,}=)(?!=)\S.*$/gm;
// Inline assignments of secret-named fields: GROQ_API_KEY=..., api_key: "...", "apiKey": "...".
const SECRET_FIELD =
  /\b([A-Za-z0-9_]*(?:key|token|secret|password)["']?[ \t]*[:=][ \t]*["']?)[^\s"',;]{8,}/gi;
const KEY_SHAPES = [
  /\bsk-[A-Za-z0-9_-]{20,}/g,
  /\bsk_(?:live|test)_[A-Za-z0-9]{16,}/g,
  /\bgsk_[A-Za-z0-9]{20,}/g,
  /\bAIza[A-Za-z0-9_-]{35}/g,
  /\bgh[pousr]_[A-Za-z0-9]{30,}/g,
  /\bgithub_pat_[A-Za-z0-9_]{20,}/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\bxox[abprs]-[A-Za-z0-9-]{10,}/g,
];
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const LONG_HEX = /\b[0-9a-fA-F]{32,}\b/g;
// "/" is left out so paths split into segments; a token only matters if a 32+ piece survives.
const LONG_RUN = /[A-Za-z0-9+_-]{32,}={0,2}/g;

// Random tokens mix digits and both cases and have no long lowercase words. Paths, encoded
// project folders and camelCase identifiers ("Buildreel", "Handler") all have one.
function looksLikeToken(run: string): boolean {
  return /\d/.test(run) && /[a-z]/.test(run) && /[A-Z]/.test(run) && !/[a-z]{6}/.test(run);
}

export function redact(text: string): string {
  let out = text.replace(ENV_LINE, `$1${REDACTED}`).replace(SECRET_FIELD, `$1${REDACTED}`);
  for (const shape of KEY_SHAPES) out = out.replace(shape, REDACTED);
  return out
    .replace(EMAIL, REDACTED)
    .replace(LONG_HEX, REDACTED)
    .replace(LONG_RUN, (run) => (looksLikeToken(run) ? REDACTED : run));
}
