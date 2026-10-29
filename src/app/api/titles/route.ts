import { LlmBusyError, LlmUnavailableError } from "@/server/llm";
import { checkRateLimit } from "@/server/rateLimit";
import { clientIp, rateLimited, unavailable } from "@/server/responses";
import { planTitles } from "@/server/titles";
import { TitlesRequestSchema } from "@/shared/titles";

// ARCHITECTURE.md section 9. Nothing from the request is logged.
export async function POST(request: Request) {
  const limit = await checkRateLimit(clientIp(request));
  if (limit.status === "limited") return rateLimited(limit.retryAfterS);
  if (limit.status === "unavailable") return unavailable();

  const body = TitlesRequestSchema.safeParse(await request.json().catch(() => undefined));
  if (!body.success) return Response.json({ error: "invalid request" }, { status: 400 });

  try {
    const titles = await planTitles(body.data);
    if (!titles) return Response.json({ error: "no titles" }, { status: 422 });
    return Response.json(titles);
  } catch (error) {
    if (error instanceof LlmBusyError) return rateLimited(error.retryAfterS);
    if (error instanceof LlmUnavailableError) return unavailable();
    throw error;
  }
}
