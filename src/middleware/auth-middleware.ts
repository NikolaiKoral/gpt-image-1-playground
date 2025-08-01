import { NextRequest, NextResponse } from 'next/server';
import { verifyPasswordWithMigration, initializePasswordHash } from '@/lib/password-migration';
import { verifySession } from '@/lib/auth';
import { verifyCSRFToken } from '@/lib/csrf';

// Initialize password hash on module load
initializePasswordHash().catch(console.error);

export async function authenticateRequest(request: NextRequest): Promise<{ authorized: boolean; error?: NextResponse; body?: any; formData?: FormData }> {
    // Check CSRF token first (except for auth endpoints)
    if (!request.url.includes('/api/auth') && !request.url.includes('/api/csrf')) {
        const csrfValid = await verifyCSRFToken(request);
        if (!csrfValid) {
            return {
                authorized: false,
                error: NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 })
            };
        }
    }
    
    // Skip auth if no password is set
    if (!process.env.APP_PASSWORD) {
        return { authorized: true };
    }

    // Check for session-based auth first (for future use)
    const session = await verifySession();
    if (session) {
        return { authorized: true };
    }

    // Check for password-based auth
    let clientPasswordHash: string | null = null;
    let parsedBody: any = null;
    let parsedFormData: FormData | null = null;

    // Handle different content types
    const contentType = request.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
        try {
            parsedBody = await request.json();
            clientPasswordHash = parsedBody.passwordHash;
        } catch (error) {
            return {
                authorized: false,
                error: NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
            };
        }
    } else if (contentType.includes('multipart/form-data')) {
        try {
            parsedFormData = await request.formData();
            clientPasswordHash = parsedFormData.get('passwordHash') as string | null;
        } catch (error) {
            return {
                authorized: false,
                error: NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
            };
        }
    }

    if (!clientPasswordHash) {
        return {
            authorized: false,
            error: NextResponse.json({ error: 'Unauthorized: Missing password hash.' }, { status: 401 })
        };
    }

    const isValid = await verifyPasswordWithMigration(clientPasswordHash);
    if (!isValid) {
        return {
            authorized: false,
            error: NextResponse.json({ error: 'Unauthorized: Invalid password.' }, { status: 401 })
        };
    }

    return { authorized: true, body: parsedBody, formData: parsedFormData };
}

// Create a new request with cloned body
async function createAuthenticatedRequest(
    originalRequest: NextRequest,
    body?: any,
    formData?: FormData
): Promise<NextRequest> {
    // If we have parsed body/formData, we need to create a new request with the body
    if (body || formData) {
        const headers = new Headers(originalRequest.headers);
        
        if (body) {
            return new NextRequest(originalRequest.url, {
                method: originalRequest.method,
                headers,
                body: JSON.stringify(body),
            });
        } else if (formData) {
            // For FormData, we need to pass the original request
            // as FormData consumption is one-time only
            return originalRequest;
        }
    }
    
    return originalRequest;
}

// Wrapper for API routes
export function withAuth(handler: (request: NextRequest) => Promise<NextResponse>) {
    return async (request: NextRequest): Promise<NextResponse> => {
        // Clone request for auth
        const clonedRequest = request.clone();
        const { authorized, error, body, formData } = await authenticateRequest(clonedRequest);
        
        if (!authorized && error) {
            return error;
        }

        // Pass the parsed body/formData to avoid re-parsing
        const authenticatedRequest = await createAuthenticatedRequest(request, body, formData);
        return handler(authenticatedRequest);
    };
}