import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import type { RateLimitResult } from './types';

// Initialize Redis connection for rate limiting
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Different rate limits for different endpoints
export const moveRateLimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(1, "2 s"), // 1 move per 2 seconds
  analytics: true,
  prefix: "tic-tac-toe:move:",
});

export const authRateLimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(5, "1 m"), // 5 auth attempts per minute
  analytics: true,
  prefix: "tic-tac-toe:auth:",
});

export const gameCreateRateLimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(10, "1 m"), // 10 games per minute
  analytics: true,
  prefix: "tic-tac-toe:create:",
});

export const leaderboardRateLimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(30, "1 m"), // 30 leaderboard requests per minute
  analytics: true,
  prefix: "tic-tac-toe:leaderboard:",
});

// Helper function to check rate limits
export async function checkRateLimit(ratelimit: Ratelimit, identifier: string): Promise<RateLimitResult> {
  const { success, limit, reset, remaining } = await ratelimit.limit(identifier);
  
  return {
    success,
    headers: {
      'X-RateLimit-Limit': limit.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': new Date(reset).toISOString(),
    }
  };
}