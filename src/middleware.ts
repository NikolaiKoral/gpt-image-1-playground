import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Get the hostname from the request headers
  const hostname = request.headers.get('host') || '';
  
  // Check if we're on the Fly.io domain
  if (hostname.includes('fly.dev')) {
    // Redirect to the custom domain
    const url = request.nextUrl.clone();
    url.hostname = 'mood-image-gen.com';
    url.protocol = 'https:';
    
    return NextResponse.redirect(url, 301); // 301 permanent redirect
  }
  
  // Handle www to non-www redirect
  if (hostname.startsWith('www.')) {
    const url = request.nextUrl.clone();
    url.hostname = hostname.replace('www.', '');
    
    return NextResponse.redirect(url, 301);
  }
  
  return NextResponse.next();
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};