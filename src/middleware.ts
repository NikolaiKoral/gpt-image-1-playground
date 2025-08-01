import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
    // Clone the response
    const response = NextResponse.next();
    
    // Add security headers that can't be set in next.config.ts
    const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
    
    // Additional security headers
    response.headers.set('X-Nonce', nonce);
    
    // Remove potentially sensitive headers
    response.headers.delete('X-Powered-By');
    response.headers.delete('Server');
    
    return response;
}

// Configure which routes use this middleware
export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};