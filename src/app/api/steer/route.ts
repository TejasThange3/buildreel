import { SteerRequestSchema } from "@/shared/steer";
import { LlmBusyError, LlmUnavailableError } from "@/server/llm";
import { checkRateLimit } from "@/server/rateLimit";
import { planSteer } from "@/server/steer";

const rateLimited = (retryAfterS: number) =>
  Response.json(
    { error: "rate limited", retryAfterS },
    { status: 429, headers: { "Retry-After": String(retryAfterS) } },
  );

// ARCHITECTURE.md section 9. Nothing from the request is logged.
export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const limit = await checkRateLimit(ip);
  if (!limit.ok) return rateLimited(limit.retryAfterS);

  const body = SteerRequestSchema.safeParse(await request.json().catch(() => undefined));
  if (!body.success) return Response.json({ error: "invalid request" }, { status: 400 });

  try {
    const result = await planSteer(body.data);
    if (!result.ok)
      return Response.json(
        { error: "could not map instruction", detail: result.detail },
        { status: 422 },
      );
    return Response.json(result.value);
  } catch (error) {
    if (error instanceof LlmBusyError) return rateLimited(error.retryAfterS);
    if (error instanceof LlmUnavailableError)
      return Response.json({ error: "steering unavailable" }, { status: 503 });
    throw error;
  }
}
