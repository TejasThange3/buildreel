import { describe, expect, it } from "vitest";
import { redact } from "@/lib/log/redact";

describe("redact", () => {
  it.each([
    ["anthropic key", "use sk-ant-api03-AbCdEf1234567890xyzXYZ now", "use [redacted] now"],
    ["groq key", "key gsk_Ab12Cd34Ef56Gh78Ij90Kl12 here", "key [redacted] here"],
    ["google key", "AIzaSyA1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q", "[redacted]"],
    ["github token", "ghp_abcdefghijklmnopqrstuvwxyz0123456789", "[redacted]"],
    // Assembled at runtime so GitHub push protection does not read the fixture as a real key.
    ["stripe key", ["sk", "live", "Ab12Cd34Ef56Gh78Ij90"].join("_"), "[redacted]"],
    ["aws key", "id AKIAIOSFODNN7EXAMPLE", "id [redacted]"],
    ["slack token", "xoxb-1234567890-abcdefghij", "[redacted]"],
    ["email", "mail me at someone.name@example.co.in please", "mail me at [redacted] please"],
    ["long hex", "secret 9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822c", "secret [redacted]"],
    ["upper hex", "9F86D081884C7D659A2FEAA0C55AD015", "[redacted]"],
    ["mixed token", "token eyJhbGciOiJIUzI1NiJ9xYz123AbC456dEf", "token [redacted]"],
    ["inline assignment", "set GROQ_API_KEY=abc123secret now", "set GROQ_API_KEY=[redacted] now"],
    ["yaml field", "api_key: abcdefgh12345", "api_key: [redacted]"],
    ["json field", '{"apiKey": "AbCd1234efgh"}', '{"apiKey": "[redacted]"}'],
    [
      "quoted passphrase",
      'please use password="correct horse battery staple"',
      'please use password="[redacted]"',
    ],
    ["short password", "login with pwd=hunter2 now", "login with pwd=[redacted] now"],
    ["very short password", "use password=1234 here", "use password=[redacted] here"],
    ["bare token", "call it with token=demo-access-value", "call it with token=[redacted]"],
    ["query secret", "GET /hook?secret=abc&x=1", "GET /hook?secret=[redacted]&x=1"],
    ["bearer header", "Authorization: Bearer abcdefghijklmnop", "Authorization: Bearer [redacted]"],
    ["basic header", "Authorization: Basic YWRtaW46aHVudGVy", "Authorization: Basic [redacted]"],
    ["curl user", "curl -u admin:hunter2 https://x.io", "curl -u admin:[redacted] https://x.io"],
    [
      "curl long user",
      "curl --user=admin:pw https://x.io",
      "curl --user=admin:[redacted] https://x.io",
    ],
    ["url credentials", "postgres://admin:s3cret@db.host/app", "postgres://[redacted]@db.host/app"],
    ["apostrophe in a passphrase", `use password="don't tell anyone"`, 'use password="[redacted]"'],
    ["escaped quote", 'password="abc\\"def ghi" ok', 'password="[redacted]" ok'],
    ["prefixed token name", "authToken = 'eyJ0eXAi.abc'", "authToken = '[redacted]'"],
    [
      "underscored key name",
      "Use MY_APP_API_KEY=abc123secret now",
      "Use MY_APP_API_KEY=[redacted] now",
    ],
    [
      "underscored token name",
      'Use MY_GITHUB_TOKEN="abc123secret" now',
      'Use MY_GITHUB_TOKEN="[redacted]" now',
    ],
    ["json token key", '{"token":"abc123secret"}', '{"token":"[redacted]"}'],
    ["base64 with slashes", "Use Ab12Cd34Ef56Gh78/Iz90Kl12Mn34Op56Qr78St90", "Use [redacted]"],
    ["token with a lowercase run", "AbCDefghijKlM1234567890NopQrStUvWXYZ", "[redacted]"],
    ["many short base64 segments", "A1b2/C3d4/E5f6/G7h8/I9j0/K1l2/M3n4/O5p6/Q7r8", "[redacted]"],
    ["aws-style secret", "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY", "[redacted]"],
    ["word-like base64", "AbcdefghIJ1234567890/KlmnopqrST9876543210XYZ", "[redacted]"],
    [
      "slashed token before a full stop",
      "Use Ab12Cd34Ef56Gh78/Iz90Kl12Mn34Op56Qr78St90.",
      "Use [redacted].",
    ],
    [
      "slashed token after a colon",
      "value:Ab12Cd34Ef56Gh78/Iz90Kl12Mn34Op56Qr78St90",
      "value:[redacted]",
    ],
    [
      "token in a url path",
      "https://localhost/Ab12Cd34Ef56Gh78/Iz90Kl12Mn34Op56Qr78St90",
      "https:[redacted]",
    ],
  ])("removes %s", (_, input, expected) => {
    expect(redact(input)).toBe(expected);
  });

  it("keeps the variable name of env lines", () => {
    expect(redact("LLM_MODEL=openai/gpt-oss-20b\nexport UPSTASH_REDIS_REST_TOKEN=xyz")).toBe(
      "LLM_MODEL=[redacted]\nexport UPSTASH_REDIS_REST_TOKEN=[redacted]",
    );
  });

  it.each([
    "Read D:/Hackathon/Buildreel - WemakeDevs/ARCHITECTURE.md first",
    "the folder D--Hackathon-Buildreel---WemakeDevs holds the logs",
    "C--Users-TEJAS-Projects-WemakeDevs2026-Buildreel",
    "open WemakeDevs/d5193305-7c93-4b6b-bc05-50f14ade1a08.jsonl",
    "C:/Users/user/AppData/Roaming/Claude/scratch-workspaces/9be1ce99-beba-46e5-8513-7e2362be1315",
    "C--Users-TEJAS-AppData-Roaming-Claude-scratch-workspaces-9be1ce99",
    "node_modules/mediabunny/dist/mediabunny.d.ts",
    "@ARCHITECTURE.md @BUILDREEL.md go through both",
    "session 3f9caaf6-1b2c-4d5e-8f90-123456789abc started",
    "NOTE = remember this",
    "MAX_SIZE == 5",
    "FOO =\nnext prose line",
    "press the key: enter",
    "Use key: ArrowRight for navigation",
    "Use primaryKey: customerId when joining",
    "a token: of thanks",
    'The secret: "keep going" is good pacing.',
    'const token = "id";',
    "https://example.com?time=12:30@alice",
    "C:/Projects/Buildreel2026/Architecture",
    "see src/lib/Media2/CanvasSink/VideoSampleSink/Encoder4.ts",
    "C:/Projects/Buildreel2026/API/Client",
    "/Users/Tejas/Projects/Buildreel2026/Notes",
    "~/Projects/Buildreel2026/Notes/Phase3Plan",
    "Open ~/Projects/Buildreel2026/API/Client now",
    "make it a minute and keep step 7",
  ])("leaves ordinary text alone: %s", (input) => {
    expect(redact(input)).toBe(input);
  });
});
