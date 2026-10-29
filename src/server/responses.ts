import "server-only";

export const rateLimited = (retryAfterS: number) =>
  Response.json(
    { error: "rate limited", retryAfterS },
    { status: 429, headers: { "Retry-After": String(retryAfterS) } },
  );

export const unavailable = () => Response.json({ error: "llm unavailable" }, { status: 503 });

export const clientIp = (request: Request) =>
  request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
