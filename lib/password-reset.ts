import { createHash, randomBytes } from "crypto";
import { NextRequest } from "next/server";

/** Reset links expire after this long */
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;

/** Returns the raw token (goes in the emailed link) and the hash stored in the database */
export function createResetToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashResetToken(token) };
}

export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Fixed-window, in-memory rate limiter: returns a function that is true while `key`
 * has calls left in the current window. Per server process; resets on restart.
 */
export function createRateLimiter(points: number, windowMs: number) {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return (key: string): boolean => {
    const now = Date.now();
    if (hits.size > 10_000) {
      for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
    }
    const entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }
    if (entry.count >= points) return false;
    entry.count++;
    return true;
  };
}

/** Client IP for rate limiting (first hop of x-forwarded-for behind a proxy) */
export function clientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * Base URL for links in emails. Taken from NEXT_PUBLIC_APP_URL so a forged Host
 * header cannot redirect reset links; development falls back to the request origin.
 */
export function appBaseUrl(request: NextRequest): string | null {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "");
  if (configured) return configured;
  return process.env.NODE_ENV === "production" ? null : new URL(request.url).origin;
}
