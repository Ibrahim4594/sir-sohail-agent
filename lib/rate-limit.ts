/**
 * Minimal in-memory sliding-window rate limiter.
 *
 * Good enough for: a single Next.js instance behind Vercel's default
 * routing. Each user id gets a bucket of timestamps; on every hit we
 * drop any timestamps older than the window and count what's left.
 * If the count is below the cap, we record the new timestamp and
 * allow; otherwise we refuse.
 *
 * NOT good enough for: multi-instance deployments. If the app ever
 * runs behind more than one Vercel function instance, the bucket
 * won't sync across instances — an attacker could spread requests
 * across instances and effectively multiply the cap by the number
 * of replicas. Upgrade to Upstash Redis or a Supabase-backed counter
 * when that day comes.
 *
 * This module has zero dependencies and no side effects at import
 * time. The bucket map lives in module scope so it's shared across
 * all requests handled by the same function instance.
 */

type Bucket = number[];

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetMs: number;
  limit: number;
}

/**
 * Consume one unit of quota from `key`. Returns whether the request
 * should be allowed and how long until a slot frees up.
 */
export function checkRateLimit(
  key: string,
  opts: { limit: number; windowMs: number },
): RateLimitResult {
  const { limit, windowMs } = opts;
  const now = Date.now();
  const cutoff = now - windowMs;

  const existing = buckets.get(key) ?? [];
  // Drop stale entries. Because we append on the tail and timestamps
  // are monotonically non-decreasing, we can binary-search the first
  // in-window index — but linear is fine at these cap sizes (20-200).
  const active = existing.filter((t) => t > cutoff);

  if (active.length >= limit) {
    const oldest = active[0] ?? now;
    return {
      allowed: false,
      remaining: 0,
      resetMs: Math.max(0, oldest + windowMs - now),
      limit,
    };
  }

  active.push(now);
  buckets.set(key, active);

  return {
    allowed: true,
    remaining: Math.max(0, limit - active.length),
    resetMs: windowMs,
    limit,
  };
}

/**
 * Test helper — wipes the bucket map. Never called from product code.
 */
export function __resetRateLimit() {
  buckets.clear();
}
