import "server-only";
import { z } from "zod";
import { type SteerRequest, type SteerResponse, SteerResponseSchema } from "@/shared/steer";
import { type ChatMessage, chatJson } from "./llm";

const RESPONSE_SCHEMA = z.toJSONSchema(SteerResponseSchema, { target: "draft-7" });

const SYSTEM = `You turn one spoken instruction into edits of a short reel cut from a screen recording of someone building software with a coding agent.
The reel is made of numbered steps. Each step is one prompt the person dictated: their prompt as a card, the agent's work fast-forwarded, then a short real-time review of the result.

Return JSON with "ops" (applied in order) and "note".
Ops:
- setTarget {seconds}: total reel length, 15 to 300. "a minute" is 60, "half a minute" is 30.
- keep {steps}: these steps must stay in the reel; also brings back dropped steps.
- drop {steps}: remove these steps from the reel.
- emphasize {step, seconds}: extra seconds of real-time review for one step, 0 to 20; 0 resets it.
- setSpeed {step, factor}: fast-forward speed of the agent's work in one step, 1 to 2000; "speed through it" is about 200, "slow it down" about 8.
- setTitle {step, text}: the caption title of one step, at most 48 characters.
- setIntro {text} and setOutro {text}: the opening and closing card text, at most 60 characters.

Rules:
- Refer to steps only by their number in the list. Match descriptions such as "the step where export worked" against the titles and excerpts and pick the single best match.
- Use only what the instruction asks for. Do not add ops it did not ask for; use setTarget only when a length or duration is mentioned.
- "Open with", "start with" or "begin with" some text is setIntro; "end with", "close with" or "finish on" some text is setOutro. A title for a step is a separate op from the intro and outro.
- Change a title, intro or outro only when the instruction asks to name, title or caption something. Requests about colours, fonts, music, effects, transitions or layout cannot be done.
- If the instruction is unclear, or asks for something these ops cannot do, return no ops and explain why in "note" in one short sentence. Otherwise "note" is null.
- Write "note" for the person in plain words, for example "Buildreel cannot change colours yet." Never mention ops or JSON.`;

function userMessage({ instruction, targetS, steps }: SteerRequest): string {
  const list = steps
    .map(
      (s) =>
        `${s.index}. ${s.kept ? "in reel" : "dropped"}, ${s.outDur.toFixed(1)} s: ${s.title} | "${s.excerpt}"`,
    )
    .join("\n");
  return `Reel length now: ${targetS} s.\nSteps:\n${list}\n\nInstruction: ${instruction}`;
}

// Schema-valid is not enough: every step number must exist in this reel.
function check(
  raw: string,
  stepCount: number,
): { ok: true; value: SteerResponse } | { ok: false; error: string } {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { ok: false, error: "The answer was not valid JSON." };
  }
  const parsed = SteerResponseSchema.safeParse(json);
  if (!parsed.success) return { ok: false, error: z.prettifyError(parsed.error) };
  const bad = parsed.data.ops.flatMap((op) =>
    ("steps" in op ? op.steps : "step" in op ? [op.step] : []).filter((s) => s > stepCount),
  );
  if (bad.length > 0)
    return { ok: false, error: `Steps ${bad.join(", ")} do not exist; there are ${stepCount}.` };
  return { ok: true, value: parsed.data };
}

export type SteerResult = { ok: true; value: SteerResponse } | { ok: false; detail: string };

// One call, and one retry that shows the model its own answer and what was wrong with it.
export async function planSteer(request: SteerRequest): Promise<SteerResult> {
  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM },
    { role: "user", content: userMessage(request) },
  ];
  // The request schema guarantees steps are numbered 1..N.
  const stepCount = request.steps.length;
  const first = await chatJson(messages, "steer", RESPONSE_SCHEMA);
  const firstCheck = check(first, stepCount);
  if (firstCheck.ok) return firstCheck;

  const second = await chatJson(
    [
      ...messages,
      { role: "assistant", content: first },
      {
        role: "user",
        content: `That answer was invalid: ${firstCheck.error} Return a corrected answer.`,
      },
    ],
    "steer",
    RESPONSE_SCHEMA,
  );
  const secondCheck = check(second, stepCount);
  return secondCheck.ok ? secondCheck : { ok: false, detail: secondCheck.error };
}
