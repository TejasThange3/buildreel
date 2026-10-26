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
    "rename useOAuth2TokenRefreshHandlerForGoogleDrive",
    "@ARCHITECTURE.md @BUILDREEL.md go through both",
    "session 3f9caaf6-1b2c-4d5e-8f90-123456789abc started",
    "NOTE = remember this",
    "MAX_SIZE == 5",
    "FOO =\nnext prose line",
    "press the key: enter",
    "make it a minute and keep step 7",
  ])("leaves ordinary text alone: %s", (input) => {
    expect(redact(input)).toBe(input);
  });
});
