import { NextRequest, NextResponse } from 'next/server';

const SIZE_LIMITS: Record<string, number> = {
    '/api/images': 50 * 1024 * 1024, // 50MB for image generation
    '/api/video-generate': 100 * 1024 * 1024, // 100MB for video generation
    '/api/image-edit': 50 * 1024 * 1024, // 50MB for image editing
    'default': 10 * 1024 * 1024, // 10MB default
};

export async function checkRequestSize(request: NextRequest): Promise<{ allowed: boolean; error?: NextResponse }> {
    // Only check for POST/PUT requests
    if (request.method !== 'POST' && request.method !== 'PUT' && request.method !== 'PATCH') {
        return { allowed: true };
    }
    
    const contentLength = request.headers.get('content-length');
    if (!contentLength) {
        // If no content-length header, allow but log warning
        console.warn('Request without content-length header:', request.url);
        return { allowed: true };
    }
    
    const size = parseInt(contentLength, 10);
    if (isNaN(size)) {
        return {
            allowed: false,
            error: NextResponse.json(
                { error: 'Invalid content-length header' },
                { status: 400 }
            ),
        };
    }
    
    // Find appropriate size limit
    let limit = SIZE_LIMITS.default;
    for (const [path, pathLimit] of Object.entries(SIZE_LIMITS)) {
        if (path !== 'default' && request.url.includes(path)) {
            limit = pathLimit;
            break;
        }
    }
    
    if (size > limit) {
        const limitMB = Math.round(limit / (1024 * 1024));
        const sizeMB = Math.round(size / (1024 * 1024));
        
        return {
            allowed: false,
            error: NextResponse.json(
                {
                    error: 'Request entity too large',
                    message: `Request size ${sizeMB}MB exceeds limit of ${limitMB}MB`,
                    limit,
                    size,
                },
                { status: 413 }
            ),
        };
    }
    
    return { allowed: true };
}