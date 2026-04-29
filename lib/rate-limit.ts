/**
 * Tiny in-memory rate limiter. Token-bucket per key (typically the client IP).
 *
 * NOTE: This is a single-process limiter — it works on a single dev server and
 * even reasonably well on a small Vercel deployment, but does NOT protect across
 * multiple serverless instances. Once traffic justifies it, swap the bucket
 * Map below for an Upstash Redis client (`@upstash/ratelimit`); the call site
 * stays the same.
 */

interface Bucket {
  tokens: number;
  updatedAt: number;
}

const BUCKETS: Map<string, Bucket> = new Map();

export interface RateLimitOptions {
  /** Bucket capacity (max burst). */
  capacity: number;
  /** Tokens replenished per second. */
  refillPerSec: number;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  /** ms until 1 more token will be available (only meaningful if !ok). */
  retryAfterMs: number;
}

export function rateLimit(key: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const b = BUCKETS.get(key) ?? { tokens: opts.capacity, updatedAt: now };
  const elapsedSec = (now - b.updatedAt) / 1000;
  b.tokens = Math.min(opts.capacity, b.tokens + elapsedSec * opts.refillPerSec);
  b.updatedAt = now;
  if (b.tokens >= 1) {
    b.tokens -= 1;
    BUCKETS.set(key, b);
    return { ok: true, remaining: Math.floor(b.tokens), retryAfterMs: 0 };
  }
  BUCKETS.set(key, b);
  const retryAfterMs = Math.ceil(((1 - b.tokens) / opts.refillPerSec) * 1000);
  return { ok: false, remaining: 0, retryAfterMs };
}

export function clientIp(req: Request): string {
  const h = req.headers;
  return (
    h.get('x-real-ip') ??
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    h.get('cf-connecting-ip') ??
    'anon'
  );
}
