import { redact } from "@/lib/log/redact";
import { type TitlesRequest, TitlesResponseSchema } from "@/shared/titles";
import type { Constraints, Step } from "@/shared/types";

// Titles cost a model call per import, so each prompt is cut well under the 600-character cap.
const PROMPT_CHARS = 300;

// Only steps still named by their first sentence are sent: not ones the user or the model titled,
// not edited ones (named from the edit), and never a hidden prompt. Prompts were redacted when
// parsed.
export function titlesRequest(
  steps: Step[],
  constraints: Constraints,
  autoTitles: Record<number, string>,
): TitlesRequest | undefined {
  const wanted = steps.flatMap(({ index, prompt }) =>
    index in constraints.titles ||
    index in constraints.prompts ||
    index in autoTitles ||
    constraints.hiddenPrompts.includes(index)
      ? []
      : [{ index, prompt: prompt.slice(0, PROMPT_CHARS) }],
  );
  return wanted.length > 0 && wanted.length <= 80 ? { steps: wanted } : undefined;
}

// Any failure keeps the first-sentence titles, so there is nothing to tell the user.
export async function requestTitles(
  request: TitlesRequest,
): Promise<Record<number, string> | undefined> {
  const response = await fetch("/api/titles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  }).catch(() => undefined);
  if (!response?.ok) return undefined;
  const reply = TitlesResponseSchema.safeParse(await response.json().catch(() => undefined));
  if (!reply.success) return undefined;
  // Titles become captions, so model text is redacted like any prompt, whatever it was told.
  return Object.fromEntries(reply.data.titles.map((t) => [t.index, redact(t.title)]));
}
