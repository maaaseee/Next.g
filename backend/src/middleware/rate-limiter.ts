/**
 * Production-Grade Multi-Tier Rate Limiting Middleware for ElysiaJS.
 * 
 * Protects public endpoints against bot spam, DoS attacks, and external API exhaustion.
 * Uses a sliding-window token bucket algorithm with automatic background garbage collection.
 */

import { Elysia, type Context } from 'elysia';
import { ENV } from '../config/env';

export interface RateLimitOptions {
  /** Maximum allowed requests within the time window */
  max: number;
  /** Duration of the sliding window in milliseconds */
  windowMs: number;
  /** Custom error message when rate limit is exceeded */
  message?: string;
  /** Optional identifier for the rate limit bucket (e.g. 'search', 'mutations') */
  name?: string;
}

interface ClientRecord {
  count: number;
  resetTime: number;
}

export class RateLimiterStore {
  private clients = new Map<string, ClientRecord>();
  private sweepInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Background garbage collection every 3 minutes to prevent memory leaks
    this.sweepInterval = setInterval(() => {
      this.cleanup();
    }, 3 * 60 * 1000);
  }

  /**
   * Cleans up expired client records.
   */
  public cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.clients.entries()) {
      if (now > record.resetTime) {
        this.clients.delete(key);
      }
    }
  }

  /**
   * Resets all tracked clients (for testing).
   */
  public reset(): void {
    this.clients.clear();
  }

  /**
   * Evaluates if a client has exceeded their rate limit.
   */
  public check(
    clientId: string,
    options: RateLimitOptions
  ): { allowed: boolean; remaining: number; resetInSeconds: number } {
    const now = Date.now();
    const key = `${options.name || 'global'}::${clientId}`;
    const record = this.clients.get(key);

    if (!record || now > record.resetTime) {
      // New window
      this.clients.set(key, {
        count: 1,
        resetTime: now + options.windowMs,
      });

      return {
        allowed: true,
        remaining: options.max - 1,
        resetInSeconds: Math.ceil(options.windowMs / 1000),
      };
    }

    if (record.count >= options.max) {
      const resetInSeconds = Math.max(1, Math.ceil((record.resetTime - now) / 1000));
      return {
        allowed: false,
        remaining: 0,
        resetInSeconds,
      };
    }

    record.count += 1;
    const resetInSeconds = Math.max(1, Math.ceil((record.resetTime - now) / 1000));

    return {
      allowed: true,
      remaining: options.max - record.count,
      resetInSeconds,
    };
  }

  /**
   * Evaluates rate limiting with durable Upstash Redis REST support,
   * falling back to in-memory store if Redis is unconfigured or unavailable.
   */
  public async checkAsync(
    clientId: string,
    options: RateLimitOptions
  ): Promise<{ allowed: boolean; remaining: number; resetInSeconds: number }> {
    if (ENV.UPSTASH_REDIS_REST_URL && ENV.UPSTASH_REDIS_REST_TOKEN) {
      try {
        const key = `ratelimit:${options.name || 'global'}:${clientId}`;
        const windowSec = Math.max(1, Math.ceil(options.windowMs / 1000));

        const res = await fetch(`${ENV.UPSTASH_REDIS_REST_URL}/pipeline`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${ENV.UPSTASH_REDIS_REST_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify([
            ['INCR', key],
            ['EXPIRE', key, windowSec, 'NX'],
            ['TTL', key],
          ]),
        });

        if (res.ok) {
          const results = (await res.json()) as Array<{ result: number | string }>;
          const count = Number(results[0]?.result || 1);
          const ttl = Math.max(1, Number(results[2]?.result || windowSec));
          const allowed = count <= options.max;

          return {
            allowed,
            remaining: Math.max(0, options.max - count),
            resetInSeconds: ttl,
          };
        }
      } catch {
        // Fallback gracefully to in-memory store
      }
    }

    return this.check(clientId, options);
  }

  public destroy(): void {
    if (this.sweepInterval) {
      clearInterval(this.sweepInterval);
      this.sweepInterval = null;
    }
    this.clients.clear();
  }
}

export const globalRateLimitStore = new RateLimiterStore();

/**
 * Extracts client IP address safely considering reverse proxies and Cloudflare headers.
 */
export function getClientIp(headers: Headers | Record<string, string | undefined>): string {
  const getHeader = (name: string): string | undefined => {
    if (typeof (headers as Headers).get === 'function') {
      return (headers as Headers).get(name) || undefined;
    }
    return (headers as Record<string, string | undefined>)[name.toLowerCase()];
  };

  // 1. Azure Container Apps Ingress header (injected by Azure Envoy proxy)
  const azureIp = getHeader('x-azure-clientip');
  if (azureIp) return azureIp.trim();

  // 2. Cloudflare header
  const cfIp = getHeader('cf-connecting-ip');
  if (cfIp) return cfIp.trim();

  // 3. Standard X-Forwarded-For (take the first public client IP)
  const xForwardedFor = getHeader('x-forwarded-for');
  if (xForwardedFor) {
    const firstIp = xForwardedFor.split(',')[0]?.trim();
    if (firstIp) return firstIp;
  }

  // 4. X-Real-IP
  const xRealIp = getHeader('x-real-ip');
  if (xRealIp) return xRealIp.trim();

  return '127.0.0.1';
}

/**
 * Creates an Elysia onBeforeHandle hook for a specific rate limit tier.
 */
export function rateLimiterHook(options: RateLimitOptions) {
  return async ({ request, set }: Pick<Context, 'request' | 'set'>) => {
    const ip = getClientIp(request.headers);
    const result = await globalRateLimitStore.checkAsync(ip, options);

    // Set standard RateLimit telemetry headers
    set.headers['X-RateLimit-Limit'] = String(options.max);
    set.headers['X-RateLimit-Remaining'] = String(result.remaining);
    set.headers['X-RateLimit-Reset'] = String(result.resetInSeconds);

    if (!result.allowed) {
      set.status = 429;
      set.headers['Retry-After'] = String(result.resetInSeconds);
      return {
        error: 'Too Many Requests',
        message: options.message || 'Límite de solicitudes alcanzado. Por favor, espera unos momentos.',
        retryAfterSeconds: result.resetInSeconds,
      };
    }
  };
}

/**
 * Creates an Elysia rate limiting plugin for a specific tier.
 */
export function rateLimiter(options: RateLimitOptions) {
  return new Elysia({ name: `rate-limiter-${options.name || 'default'}` })
    .onBeforeHandle(rateLimiterHook(options));
}

