import "server-only";

export const rateLimited = (retryAfterS: number) =>
  Response.json(
    { error: "rate limited", retryAfterS },
    { status: 429, headers: { "Retry-After": String(retryAfterS) } },
  );

export const unavailable = () => Response.json({ error: "llm unavailable" }, { status: 503 });

// Vercel overwrites x-forwarded-for with the client's address, so it cannot be spoofed there.
export const clientIp = (request: Request) =>
  request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";

export const invalidRequest = () => Response.json({ error: "invalid request" }, { status: 400 });

export const tooLarge = () => Response.json({ error: "request too large" }, { status: 413 });

// The body is read chunk by chunk and given up past the cap, so an oversized request is never
// buffered or parsed whole. Both routes' largest valid request is well under 64 KB.
const MAX_BODY_BYTES = 64 * 1024;

export async function readJson(
  request: Request,
): Promise<{ ok: true; json: unknown } | { ok: false; tooLarge: boolean }> {
  if (!request.body) return { ok: false, tooLarge: false };
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) {
      await reader.cancel();
      return { ok: false, tooLarge: true };
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let at = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, at);
    at += chunk.byteLength;
  }
  try {
    return { ok: true, json: JSON.parse(new TextDecoder().decode(bytes)) };
  } catch {
    return { ok: false, tooLarge: false };
  }
}
