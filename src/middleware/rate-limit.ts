import { NextRequest, NextResponse } from 'next/server';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { checkRequestSize } from './request-size';

// Create different rate limiters for different endpoints
const rateLimiters = {
    // Strict limits for expensive operations
    imageGeneration: new RateLimiterMemory({
        keyPrefix: 'image_gen',
        points: 10, // 10 requests
        duration: 60, // per 60 seconds
        blockDuration: 60, // block for 1 minute
    }),
    
    videoGeneration: new RateLimiterMemory({
        keyPrefix: 'video_gen',
        points: 5, // 5 requests
        duration: 300, // per 5 minutes
        blockDuration: 300, // block for 5 minutes
    }),
    
    // Moderate limits for API operations
    api: new RateLimiterMemory({
        keyPrefix: 'api',
        points: 60, // 60 requests
        duration: 60, // per minute
        blockDuration: 60, // block for 1 minute
    }),
    
    // Relaxed limits for read operations
    read: new RateLimiterMemory({
        keyPrefix: 'read',
        points: 120, // 120 requests
        duration: 60, // per minute
        blockDuration: 30, // block for 30 seconds
    }),
};

// Get client identifier (IP address or session)
function getClientKey(request: NextRequest): string {
    // Try to get real IP from common headers
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const cfConnectingIp = request.headers.get('cf-connecting-ip');
    
    // Use the first available IP
    const ip = cfConnectingIp || realIp || forwardedFor?.split(',')[0].trim() || 'unknown';
    
    return ip;
}

export type RateLimitType = keyof typeof rateLimiters;

export async function checkRateLimit(
    request: NextRequest,
    type: RateLimitType = 'api'
): Promise<{ allowed: boolean; error?: NextResponse }> {
    const clientKey = getClientKey(request);
    const rateLimiter = rateLimiters[type];
    
    try {
        await rateLimiter.consume(clientKey);
        return { allowed: true };
    } catch (rateLimiterRes) {
        // Rate limit exceeded
        const retryAfter = Math.round((rateLimiterRes as any).msBeforeNext / 1000) || 60;
        
        return {
            allowed: false,
            error: NextResponse.json(
                {
                    error: 'Too many requests',
                    message: `Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
                    retryAfter,
                },
                {
                    status: 429,
                    headers: {
                        'Retry-After': retryAfter.toString(),
                        'X-RateLimit-Limit': rateLimiter.points.toString(),
                        'X-RateLimit-Remaining': (rateLimiterRes as any).remainingPoints?.toString() || '0',
                        'X-RateLimit-Reset': new Date(Date.now() + (rateLimiterRes as any).msBeforeNext).toISOString(),
                    },
                }
            ),
        };
    }
}

// Middleware wrapper with rate limiting
export function withRateLimit(
    handler: (request: NextRequest) => Promise<NextResponse>,
    type: RateLimitType = 'api'
) {
    return async (request: NextRequest): Promise<NextResponse> => {
        const { allowed, error } = await checkRateLimit(request, type);
        
        if (!allowed && error) {
            return error;
        }
        
        return handler(request);
    };
}

// Combined auth and rate limit wrapper
export function withAuthAndRateLimit(
    handler: (request: NextRequest) => Promise<NextResponse>,
    type: RateLimitType = 'api'
) {
    return async (request: NextRequest): Promise<NextResponse> => {
        // Check request size first
        const sizeCheck = await checkRequestSize(request);
        if (!sizeCheck.allowed && sizeCheck.error) {
            return sizeCheck.error;
        }
        
        // Check rate limit (before auth to prevent auth bypass attempts)
        const { allowed, error } = await checkRateLimit(request, type);
        
        if (!allowed && error) {
            return error;
        }
        
        // Then check auth (import dynamically to avoid circular dependency)
        const { withAuth } = await import('./auth-middleware');
        const authHandler = withAuth(handler);
        
        return authHandler(request);
    };
}