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

const limiters = redis && {
  ip: new Ratelimit({ redis, limiter: PER_IP, prefix: "buildreel:steer:ip" }),
  day: new Ratelimit({ redis, limiter: PER_DAY, prefix: "buildreel:steer:day" }),
};

export type RateLimitResult = { ok: true } | { ok: false; retryAfterS: number };

// Without Upstash configured (local development) there is no limit.
export async function checkRateLimit(ip: string): Promise<RateLimitResult> {
  if (!limiters) return { ok: true };
  for (const [limiter, key] of [
    [limiters.ip, ip],
    [limiters.day, "all"],
  ] as const) {
    const { success, reset } = await limiter.limit(key);
    if (!success)
      return { ok: false, retryAfterS: Math.max(1, Math.ceil((reset - Date.now()) / 1000)) };
  }
  return { ok: true };
}
