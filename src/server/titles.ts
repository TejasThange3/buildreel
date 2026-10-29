import "server-only";
import { z } from "zod";
import { type TitlesRequest, type TitlesResponse, TitlesResponseSchema } from "@/shared/titles";
import { chatJson } from "./llm";

const RESPONSE_SCHEMA = z.toJSONSchema(TitlesResponseSchema, { target: "draft-7" });
// About 20 tokens a title for up to 80 steps, plus the model's short reasoning.
const TITLE_TOKENS = 3072;

const SYSTEM = `You name the steps of a short reel about building software with a coding agent.
Each step is one prompt the person dictated to the agent. Give each step a title for its caption.

Rules:
- One title per step, with the same index. At most 40 characters.
- Name what was built or changed, as a noun phrase: "SRT caption export", "Save and load projects", "Fix the login redirect".
- Plain words from the prompt. No quotes, no trailing period, no emoji, no hype words.
- Never include keys, tokens, emails or anything marked [redacted].`;

// Titles are a nicety: anything short of one valid title per requested step is dropped, and the
// caller keeps the first-sentence titles.
export async function planTitles({ steps }: TitlesRequest): Promise<TitlesResponse | undefined> {
  const list = steps.map((s) => `${s.index}. ${s.prompt}`).join("\n");
  const raw = await chatJson(
    [
      { role: "system", content: SYSTEM },
      { role: "user", content: `Steps:\n${list}` },
    ],
    "titles",
    RESPONSE_SCHEMA,
    TITLE_TOKENS,
  );
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return undefined;
  }
  const parsed = TitlesResponseSchema.safeParse(json);
  if (!parsed.success) return undefined;
  const asked = new Set(steps.map((s) => s.index));
  const titles = parsed.data.titles.filter((t) => asked.has(t.index));
  return titles.length > 0 ? { titles } : undefined;
}
