import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Groq's free tier allows about 1,000 requests a day and a steer can take two (one retry), so the
// daily cap stays well under it while judges and visitors share it. Per visitor, a few edits an
// hour is plenty for a demo and stops one client from draining the day.
const PER_IP = Ratelimit.slidingWindow(10, "1 h");
const PER_DAY = Ratelimit.fixedWindow(400, "1 d");

// The Vercel Upstash integration may name the variables KV_REST_API_*; both are accepted.
const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const redis = url && token ? new Redis({ url, token }) : undefined;

// Upstash answers a stalled Redis with success after the timeout; that is read as "unavailable"
// below, so an outage never lifts the spending limits.
const TIMEOUT_MS = 2000;
const limiters = redis && {
  ip: new Ratelimit({ redis, limiter: PER_IP, prefix: "buildreel:steer:ip", timeout: TIMEOUT_MS }),
  day: new Ratelimit({
    redis,
    limiter: PER_DAY,
    prefix: "buildreel:steer:day",
    timeout: TIMEOUT_MS,
  }),
};

export type RateLimitResult =
  { status: "ok" } | { status: "limited"; retryAfterS: number } | { status: "unavailable" };

// Without Upstash configured (local development) there is no limit.
export async function checkRateLimit(ip: string): Promise<RateLimitResult> {
  if (!limiters) return { status: "ok" };
  for (const [limiter, key] of [
    [limiters.ip, ip],
    [limiters.day, "all"],
  ] as const) {
    const result = await limiter.limit(key).catch(() => undefined);
    if (!result || result.reason === "timeout") return { status: "unavailable" };
    if (!result.success)
      return {
        status: "limited",
        retryAfterS: Math.max(1, Math.ceil((result.reset - Date.now()) / 1000)),
      };
  }
  return { status: "ok" };
}
