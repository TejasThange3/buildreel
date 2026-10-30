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
// buffered or parsed whole. The largest valid request, 80 titles of 600 characters in a script
// that takes 3 bytes a character, is about 150 KB.
const MAX_BODY_BYTES = 200 * 1024;

type Body = { ok: true; json: unknown } | { ok: false; tooLarge: boolean };

async function readBytes(body: ReadableStream<Uint8Array>): Promise<Uint8Array | "tooLarge"> {
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) {
        // The answer is 413 either way; a failed cancel only means the client already went.
        await reader.cancel().catch(() => undefined);
        return "tooLarge";
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let at = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, at);
    at += chunk.byteLength;
  }
  return bytes;
}

// A body that breaks off mid-read, or is not JSON, is an invalid request like any other.
export async function readJson(request: Request): Promise<Body> {
  if (!request.body) return { ok: false, tooLarge: false };
  try {
    const bytes = await readBytes(request.body);
    if (bytes === "tooLarge") return { ok: false, tooLarge: true };
    return { ok: true, json: JSON.parse(new TextDecoder().decode(bytes)) };
  } catch {
    return { ok: false, tooLarge: false };
  }
}
