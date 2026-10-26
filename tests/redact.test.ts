import { describe, expect, it } from "vitest";
import { redact } from "@/lib/log/redact";

describe("redact", () => {
  it.each([
    ["anthropic key", "use sk-ant-api03-AbCdEf1234567890xyzXYZ now", "use [redacted] now"],
    ["groq key", "key gsk_Ab12Cd34Ef56Gh78Ij90Kl12 here", "key [redacted] here"],
    ["google key", "AIzaSyA1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q", "[redacted]"],
    ["github token", "ghp_abcdefghijklmnopqrstuvwxyz0123456789", "[redacted]"],
    ["email", "mail me at someone.name@example.co.in please", "mail me at [redacted] please"],
    ["long hex", "secret 9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822c", "secret [redacted]"],
    ["mixed token", "token eyJhbGciOiJIUzI1NiJ9xYz123AbC456dEf", "token [redacted]"],
  ])("removes %s", (_, input, expected) => {
    expect(redact(input)).toBe(expected);
  });

  it("keeps the variable name of env lines", () => {
    expect(redact("LLM_API_KEY=abc123\nexport UPSTASH_REDIS_REST_TOKEN = xyz")).toBe(
      "LLM_API_KEY=[redacted]\nexport UPSTASH_REDIS_REST_TOKEN = [redacted]",
    );
  });

  it.each([
    "Read D:/Hackathon/Buildreel - WemakeDevs/ARCHITECTURE.md first",
    "the folder D--Hackathon-Buildreel---WemakeDevs holds the logs",
    "@ARCHITECTURE.md @BUILDREEL.md go through both",
    "session 3f9caaf6-1b2c-4d5e-8f90-123456789abc started",
    "make it a minute and keep step 7",
  ])("leaves ordinary text alone: %s", (input) => {
    expect(redact(input)).toBe(input);
  });
});
