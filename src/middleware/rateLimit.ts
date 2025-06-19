import { NextApiRequest, NextApiResponse } from 'next';

// Rate limit configuration
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 100; // requests per window

// Store rate limit data in memory (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Rate limit middleware
export function rateLimit(endpoint: string, maxRequests = RATE_LIMIT_MAX) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if (!ip || typeof ip !== 'string') {
      return res.status(400).json({ error: 'Could not determine client IP' });
    }

    const key = `${endpoint}:${ip}`;
    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW_MS;

    // Get or initialize rate limit data
    let rateLimitData = rateLimitStore.get(key);
    if (!rateLimitData || rateLimitData.resetTime < now) {
      rateLimitData = { count: 0, resetTime: now + RATE_LIMIT_WINDOW_MS };
    }

    // Check if rate limit is exceeded
    if (rateLimitData.count >= maxRequests) {
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil((rateLimitData.resetTime - now) / 1000),
      });
    }

    // Update rate limit data
    rateLimitData.count++;
    rateLimitStore.set(key, rateLimitData);

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', maxRequests - rateLimitData.count);
    res.setHeader('X-RateLimit-Reset', Math.ceil(rateLimitData.resetTime / 1000));
  };
}

// Pre-configured rate limiters for different endpoints
export const rateLimiters = {
  links: rateLimit('links', 100), // 100 requests per 15 minutes
  clicks: rateLimit('clicks', 200), // 200 requests per 15 minutes
  calls: rateLimit('calls', 200), // 200 requests per 15 minutes
  sales: rateLimit('sales', 200), // 200 requests per 15 minutes
}; 