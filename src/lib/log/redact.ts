export const REDACTED = "[redacted]";

// .env style is KEY=value with no spaces; prose like "NOTE = remember" or "A == b" is not.
// The variable name is kept so the caption still says what was set.
const ENV_LINE = /^([ \t]*(?:export[ \t]+)?[A-Z][A-Z0-9_]{2,}=)(?!=)\S.*$/gm;
// Inline assignments of credential-named fields: GROQ_API_KEY=..., api_key: "...", "apiKey": "...",
// authToken = '...', MY_APP_API_KEY=... A bare "secret" or "token" needs a prefix
// (MY_GITHUB_TOKEN, client_secret) or must be a quoted JSON key ({"token": ...}), so prose
// ("The secret: ...") and code (const token = "id") survive, as do "key: ArrowRight" and
// "primaryKey: customerId".
const SECRET_NAME = `(?:${[
  "[A-Za-z0-9_-]*(?:api|access|secret|private)[_-]?key",
  "[A-Za-z0-9][A-Za-z0-9_-]*?(?:token|secret)",
  `(?<=["'])(?:token|secret)(?=["'])`,
  "[A-Za-z0-9_-]*(?:passw(?:or)?d|pwd|credentials?)",
].join("|")})`;
const ASSIGN = `["']?[ \\t]*[:=][ \\t]*`;
// Quoted values go whole, since passphrases contain spaces; each quote type allows the other
// inside it and backslash escapes.
const SECRET_QUOTED = new RegExp(
  `\\b(${SECRET_NAME}${ASSIGN})(?:"(?:[^"\\\\\\n]|\\\\.)+"|'(?:[^'\\\\\\n]|\\\\.)+')`,
  "gi",
);
const SECRET_FIELD = new RegExp(`\\b(${SECRET_NAME}${ASSIGN})[^\\s"',;]{6,}`, "gi");
// A password is secret at any length, so "password=1234" goes too.
const PASSWORD_FIELD = new RegExp(
  `\\b([A-Za-z0-9_-]*(?:passw(?:or)?d|pwd)${ASSIGN})[^\\s"',;]+`,
  "gi",
);
// A bare token or secret set with no spaces, as on a command line or in a query string
// ("token=abc", "?secret=xyz"); code with spaces ("const token = id") is left alone.
const BARE_ASSIGNMENT = /\b((?:token|secret)=)[^\s"',;&]+/gi;
// A bare token or secret given a quoted value where config puts keys: at the start of a line
// (YAML) or after "{" or "," (an object literal). Prose like 'The secret: "keep going"' survives.
const BARE_QUOTED =
  /(^[ \t]*|[{,][ \t]*)((?:token|secret)[ \t]*:[ \t]*)(["'])(?:(?!\3)[^\n])+\3/gim;
// HTTP auth: anything after an Authorization header in any case, and a standalone Bearer token
// with a digit in it, so prose like "Basic implementation" or "Bearer tokens expire" survives.
const AUTH_HEADER = /\b(authorization:?\s*(?:bearer|basic)\s+)\S+/gi;
const BEARER = /\b(Bearer\s+)(?=[A-Za-z0-9._~+/=-]*\d)[A-Za-z0-9._~+/=-]{12,}/g;
// curl's user:password argument.
const CURL_USER = /((?:^|\s)(?:-u|--user)[ =]+[^\s:]+:)\S+/g;
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

// Path segments are words ("Projects"), lowercase names ("node_modules", uuids) or short names.
const isPathSegment = (s: string) =>
  /[a-z]{4}|^[a-z0-9_-]*$/.test(s) || (s.length <= 8 && /[a-z]{2}/.test(s));

// Base64 can look word-like, so a slashed run is a path only with context: a drive letter ("C:",
// not a URL scheme), a home "~/", a file extension (not a full stop), or a leading "/" with
// word-like segments (base64 can itself start with "/").
const DRIVE = /(?:^|[^A-Za-z0-9])[A-Za-z]:$/;
const EXTENSION = /^\.[A-Za-z0-9]{1,5}(?![A-Za-z0-9])/;
function isPath(run: string, before: string, after: string): boolean {
  if (DRIVE.test(before) || before.endsWith("~") || EXTENSION.test(after)) return true;
  return run.startsWith("/") && run.split("/").every(isPathSegment);
}

// Tokens mix digits and both cases; "+" and "=" only occur in base64. Without "/", uuids and
// encoded folders have a "-" or "_" per 10 chars, base64url one per 30 (entropy does not separate
// them). Cost: long digit-bearing camelCase names or bare relative paths may show as [redacted].
function looksLikeToken(run: string, before: string, after: string): boolean {
  if (!/\d/.test(run) || !/[a-z]/.test(run) || !/[A-Z]/.test(run)) return false;
  if (/[+=]/.test(run)) return true;
  if (run.includes("/")) return !isPath(run, before, after);
  return run.replace(/[^_-]/g, "").length / run.length < 0.1;
}

export function redact(text: string): string {
  let out = text
    .replace(ENV_LINE, `$1${REDACTED}`)
    .replace(SECRET_QUOTED, (match, name: string) => {
      const quote = match.charAt(name.length);
      return `${name}${quote}${REDACTED}${quote}`;
    })
    .replace(SECRET_FIELD, `$1${REDACTED}`)
    .replace(PASSWORD_FIELD, `$1${REDACTED}`)
    .replace(BARE_ASSIGNMENT, `$1${REDACTED}`)
    .replace(BARE_QUOTED, `$1$2$3${REDACTED}$3`)
    .replace(AUTH_HEADER, `$1${REDACTED}`)
    .replace(BEARER, `$1${REDACTED}`)
    .replace(CURL_USER, `$1${REDACTED}`)
    .replace(URL_CREDENTIALS, `$1${REDACTED}@`);
  for (const shape of KEY_SHAPES) out = out.replace(shape, REDACTED);
  return out
    .replace(EMAIL, REDACTED)
    .replace(LONG_HEX, REDACTED)
    .replace(LONG_RUN, (run: string, at: number, whole: string) =>
      looksLikeToken(run, whole.slice(Math.max(0, at - 3), at), whole.slice(at + run.length))
        ? REDACTED
        : run,
    );
}
