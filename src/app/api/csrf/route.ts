import { NextResponse } from 'next/server';
import { getCSRFToken } from '@/lib/csrf';

export async function GET() {
    const token = await getCSRFToken();
    return NextResponse.json({ csrfToken: token });
}