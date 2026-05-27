/**
 * In-memory rate limiter for Next.js API routes.
 *
 * Uses a sliding-window counter keyed on a string identifier (userId or IP).
 * Each limiter instance is independent — create one per route or tier.
 *
 * Usage:
 *   import { createRateLimiter } from "@/lib/rateLimit";
 *
 *   const limiter = createRateLimiter({ limit: 10, windowMs: 60_000 });
 *
 *   export const POST = withAuth(async (req, ctx, user) => {
 *     const { limited, retryAfterSec } = limiter.check(String(user.userId));
 *     if (limited) {
 *       return NextResponse.json(
 *         { success: false, error: { message: "Too many requests. Please try again later." } },
 *         { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
 *       );
 *     }
 *     // ... handler logic
 *   });
 *
 * Configuration:
 *   limit     — max requests allowed in the window (default: 10)
 *   windowMs  — sliding window in milliseconds (default: 60 000 = 1 minute)
 *
 * Notes:
 * - State lives in process memory. On serverless runtimes with multiple
 *   instances this won't share state across instances. For multi-instance
 *   production deploys, swap the Map for a Redis-backed store.
 * - A cleanup sweep runs every `windowMs` to prevent unbounded memory growth.
 */

/**
 * @typedef {Object} RateLimitResult
 * @property {boolean} limited       - true if the request should be rejected
 * @property {number}  remaining     - requests remaining in the current window
 * @property {number}  retryAfterSec - seconds until the window resets (only meaningful when limited)
 */

/**
 * @param {{ limit?: number, windowMs?: number }} options
 * @returns {{ check: (key: string) => RateLimitResult }}
 */
export function createRateLimiter({ limit = 10, windowMs = 60_000 } = {}) {
  /** @type {Map<string, { count: number; windowStart: number }>} */
  const store = new Map();

  // Periodic cleanup — remove stale entries to prevent memory leaks
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (now - entry.windowStart >= windowMs) {
        store.delete(key);
      }
    }
  }, windowMs);

  // Don't prevent the process from exiting cleanly
  if (cleanupInterval.unref) cleanupInterval.unref();

  /**
   * Check and increment the counter for `key`.
   * @param {string} key — userId, IP, or any unique identifier
   * @returns {RateLimitResult}
   */
  function check(key) {
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || now - entry.windowStart >= windowMs) {
      // New window
      store.set(key, { count: 1, windowStart: now });
      return { limited: false, remaining: limit - 1, retryAfterSec: 0 };
    }

    entry.count += 1;

    if (entry.count > limit) {
      const retryAfterSec = Math.ceil((entry.windowStart + windowMs - now) / 1000);
      return { limited: true, remaining: 0, retryAfterSec };
    }

    return { limited: false, remaining: limit - entry.count, retryAfterSec: 0 };
  }

  return { check };
}

// ── Pre-built limiters for each tier ──────────────────────────

/**
 * Strict limiter for heavyweight AI routes that call external agents
 * and can take 30–180 s each.
 * 5 requests per user per minute.
 */
export const aiHeavyLimiter = createRateLimiter({ limit: 5, windowMs: 60_000 });

/**
 * Standard limiter for moderate AI routes (persona generation, questions).
 * 15 requests per user per minute.
 */
export const aiStandardLimiter = createRateLimiter({ limit: 15, windowMs: 60_000 });

/**
 * Light limiter for fast AI-assisted routes (enhance persona, description summary).
 * 30 requests per user per minute.
 */
export const aiLightLimiter = createRateLimiter({ limit: 30, windowMs: 60_000 });

// ── Helper: returns a 429 NextResponse ───────────────────────
import { NextResponse } from "next/server";

/**
 * @param {number} retryAfterSec
 * @returns {NextResponse}
 */
export function rateLimitedResponse(retryAfterSec = 60) {
  return NextResponse.json(
    {
      success: false,
      error: { message: "Too many requests. Please slow down and try again." },
    },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSec) },
    }
  );
}
