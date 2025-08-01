import { randomBytes } from 'crypto';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const CSRF_TOKEN_LENGTH = 32;
const CSRF_COOKIE_NAME = 'csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';

// Generate a new CSRF token
export function generateCSRFToken(): string {
    return randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
}

// Get or create CSRF token
export async function getCSRFToken(): Promise<string> {
    const cookieStore = await cookies();
    const existingToken = cookieStore.get(CSRF_COOKIE_NAME)?.value;
    
    if (existingToken) {
        return existingToken;
    }
    
    // Generate new token
    const newToken = generateCSRFToken();
    
    // Set cookie with secure options
    cookieStore.set(CSRF_COOKIE_NAME, newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 60 * 60 * 24, // 24 hours
    });
    
    return newToken;
}

// Verify CSRF token
export async function verifyCSRFToken(request: NextRequest): Promise<boolean> {
    // Skip CSRF for GET requests
    if (request.method === 'GET' || request.method === 'HEAD' || request.method === 'OPTIONS') {
        return true;
    }
    
    const cookieStore = await cookies();
    const cookieToken = cookieStore.get(CSRF_COOKIE_NAME)?.value;
    
    if (!cookieToken) {
        return false;
    }
    
    // Check header
    const headerToken = request.headers.get(CSRF_HEADER_NAME);
    if (headerToken && headerToken === cookieToken) {
        return true;
    }
    
    // Check body for form submissions
    const contentType = request.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
        try {
            const body = await request.clone().json();
            return body.csrfToken === cookieToken;
        } catch {
            return false;
        }
    } else if (contentType.includes('multipart/form-data')) {
        try {
            const formData = await request.clone().formData();
            const formToken = formData.get('csrfToken') as string | null;
            return formToken === cookieToken;
        } catch {
            return false;
        }
    }
    
    return false;
}

// API route to get CSRF token
export async function GET() {
    const token = await getCSRFToken();
    return new Response(JSON.stringify({ csrfToken: token }), {
        headers: {
            'Content-Type': 'application/json',
        },
    });
}