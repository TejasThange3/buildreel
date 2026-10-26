const REDACTED = "[redacted]";

// .env style is KEY=value with no spaces; prose like "NOTE = remember" or "A == b" is not.
// The variable name is kept so the caption still says what was set.
const ENV_LINE = /^([ \t]*(?:export[ \t]+)?[A-Z][A-Z0-9_]{2,}=)(?!=)\S.*$/gm;
// Inline assignments of credential-named fields: GROQ_API_KEY=..., api_key: "...", "apiKey": "...",
// authToken = '...'. A bare "secret" or "token" needs a prefix (GITHUB_TOKEN, client_secret),
// so prose ("The secret: ...") and code (const token = "id") survive, as do "key: ArrowRight"
// and "primaryKey: customerId".
const SECRET_NAME =
  "(?:[A-Za-z0-9]*[_-]?(?:api|access|secret|private)[_-]?key|[A-Za-z0-9]+[_-]?(?:token|secret)|[A-Za-z0-9_]*(?:passw(?:or)?d|pwd|credentials?))";
const ASSIGN = `["']?[ \\t]*[:=][ \\t]*`;
// Quoted values go whole, since passphrases contain spaces; each quote type allows the other
// inside it and backslash escapes.
const SECRET_QUOTED = new RegExp(
  `\\b(${SECRET_NAME}${ASSIGN})(?:"(?:[^"\\\\\\n]|\\\\.)+"|'(?:[^'\\\\\\n]|\\\\.)+')`,
  "gi",
);
const SECRET_FIELD = new RegExp(`\\b(${SECRET_NAME}${ASSIGN})[^\\s"',;]{6,}`, "gi");
// Userinfo lives before the host only; "?" and "#" end the authority.
const URL_CREDENTIALS = /\b([a-z][a-z0-9+.-]*:\/\/)[^\s/?#:@]+:[^\s/?#@]+@/gi;
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
// Includes "/" and "+" so standard base64 is caught whole.
const LONG_RUN = /[A-Za-z0-9+/_-]{32,}={0,2}/g;

// Random tokens mix digits and both cases. Paths, uuids and encoded project folders are told
// apart by separators: at least one "-", "/" or "_" per 10 characters, against about one per
// 30 in base64; this catches 99.3% of random 32-72 char tokens. Character entropy was measured
// and does not separate the two groups. Cost: a long camelCase identifier with a digit and no
// separators may show as [redacted].
function looksLikeToken(run: string): boolean {
  if (!/\d/.test(run) || !/[a-z]/.test(run) || !/[A-Z]/.test(run)) return false;
  const separators = run.replace(/[^/_-]/g, "").length;
  return separators / run.length < 0.1;
}

export function redact(text: string): string {
  let out = text
    .replace(ENV_LINE, `$1${REDACTED}`)
    .replace(SECRET_QUOTED, (match, name: string) => {
      const quote = match.charAt(name.length);
      return `${name}${quote}${REDACTED}${quote}`;
    })
    .replace(SECRET_FIELD, `$1${REDACTED}`)
    .replace(URL_CREDENTIALS, `$1${REDACTED}@`);
  for (const shape of KEY_SHAPES) out = out.replace(shape, REDACTED);
  return out
    .replace(EMAIL, REDACTED)
    .replace(LONG_HEX, REDACTED)
    .replace(LONG_RUN, (run) => (looksLikeToken(run) ? REDACTED : run));
}
