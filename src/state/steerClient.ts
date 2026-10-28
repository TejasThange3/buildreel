import { z } from "zod";
import { redact } from "@/lib/log/redact";
import { type PatchOp, type SteerRequest, SteerResponseSchema } from "@/shared/steer";
import type { Constraints, EDL, Step } from "@/shared/types";

export type SteerReply =
  { ok: true; ops: PatchOp[]; note: string | null } | { ok: false; message: string };

const RateLimited = z.object({ retryAfterS: z.number() });

// The model sees each step as the user does: its title, the start of the prompt, how long it runs
// in the reel now, and whether it is in the reel at all (dropped or cut for time). Prompts were
// redacted when parsed; the instruction and title overrides are typed text, so they are redacted
// here before anything leaves the browser.
export function steerRequest(
  instruction: string,
  steps: Step[],
  edl: EDL,
  constraints: Constraints,
): SteerRequest {
  const seconds = new Map<number, number>();
  for (const s of edl.segments)
    if (s.step !== undefined) seconds.set(s.step, (seconds.get(s.step) ?? 0) + s.outDur);
  return {
    instruction: redact(instruction),
    targetS: constraints.targetS,
    steps: steps.map((step) => ({
      index: step.index,
      title: redact(constraints.titles[step.index] ?? step.title).slice(0, 80),
      excerpt: step.prompt.slice(0, 120),
      outDur: seconds.get(step.index) ?? 0,
      kept: seconds.has(step.index),
    })),
  };
}

export async function requestSteer(request: SteerRequest): Promise<SteerReply> {
  let response: Response;
  try {
    response = await fetch("/api/steer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
  } catch {
    return {
      ok: false,
      message: "Could not reach Buildreel. Check your connection and try again.",
    };
  }
  const body: unknown = await response.json().catch(() => undefined);
  if (response.status === 429) {
    const wait = RateLimited.safeParse(body);
    const seconds = wait.success ? Math.ceil(wait.data.retryAfterS) : 60;
    return {
      ok: false,
      message: `Steering is busy. Try again in ${seconds < 120 ? `${seconds} s` : `${Math.ceil(seconds / 60)} min`}.`,
    };
  }
  if (response.status === 422)
    return { ok: false, message: "That did not map to an edit. Try saying it another way." };
  const reply = SteerResponseSchema.safeParse(body);
  if (!response.ok || !reply.success)
    return {
      ok: false,
      message: "Steering is unavailable right now. The step toggles and length still work.",
    };
  return { ok: true, ...reply.data };
}
