import "server-only";
import { z } from "zod";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export class LlmUnavailableError extends Error {}

// The provider is rate limiting us (free tiers cap tokens per minute); worth retrying shortly.
export class LlmBusyError extends Error {
  constructor(readonly retryAfterS: number) {
    super("The language model is busy.");
  }
}

const Env = z.object({
  LLM_API_KEY: z.string().min(1),
  LLM_BASE_URL: z.url(),
  LLM_MODEL: z.string().min(1),
});

const Completion = z.object({
  choices: z.array(z.object({ message: z.object({ content: z.string() }) })).min(1),
});

const TIMEOUT_MS = 20_000;
// A steer answer is a handful of ops; the default cap bounds cost if the model runs on.
const MAX_TOKENS = 1024;

// One chat completion from any OpenAI-compatible endpoint, constrained to a JSON schema. Returns the
// raw JSON text: callers validate it, and need the text to show the model its mistake on a retry.
export async function chatJson(
  messages: ChatMessage[],
  schemaName: string,
  schema: Record<string, unknown>,
  maxTokens = MAX_TOKENS,
): Promise<string> {
  const env = Env.safeParse(process.env);
  if (!env.success) throw new LlmUnavailableError("The language model is not configured.");
  const { LLM_API_KEY, LLM_BASE_URL, LLM_MODEL } = env.data;
  let response: Response;
  try {
    response = await fetch(`${LLM_BASE_URL.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LLM_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages,
        temperature: 0,
        max_completion_tokens: maxTokens,
        // Both tasks are short mappings; low effort keeps answers under a couple of seconds.
        reasoning_effort: "low",
        response_format: {
          type: "json_schema",
          json_schema: { name: schemaName, strict: true, schema },
        },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    throw new LlmUnavailableError("The language model could not be reached.", { cause: error });
  }
  if (response.status === 429)
    throw new LlmBusyError(
      Math.max(1, Math.ceil(Number(response.headers.get("retry-after")) || 10)),
    );
  if (!response.ok)
    throw new LlmUnavailableError(`The language model answered ${response.status}.`);
  const completion = Completion.safeParse(await response.json().catch(() => undefined));
  if (!completion.success) throw new LlmUnavailableError("The language model sent no answer.");
  return completion.data.choices[0]?.message.content ?? "";
}
