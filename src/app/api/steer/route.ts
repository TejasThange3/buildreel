import { SteerRequestSchema } from "@/shared/steer";
import { LlmBusyError, LlmUnavailableError } from "@/server/llm";
import { checkRateLimit } from "@/server/rateLimit";
import {
  clientIp,
  invalidRequest,
  rateLimited,
  readJson,
  tooLarge,
  unavailable,
} from "@/server/responses";
import { planSteer } from "@/server/steer";

// ARCHITECTURE.md section 9. Nothing from the request is logged.
export async function POST(request: Request) {
  const limit = await checkRateLimit(clientIp(request));
  if (limit.status === "limited") return rateLimited(limit.retryAfterS);
  if (limit.status === "unavailable") return unavailable();

  const read = await readJson(request);
  if (!read.ok) return read.tooLarge ? tooLarge() : invalidRequest();
  const body = SteerRequestSchema.safeParse(read.json);
  if (!body.success) return invalidRequest();

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
    if (error instanceof LlmUnavailableError) return unavailable();
    throw error;
  }
}
