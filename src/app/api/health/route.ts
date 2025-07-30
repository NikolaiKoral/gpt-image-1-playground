import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json(
        {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            storage_mode: process.env.NEXT_PUBLIC_IMAGE_STORAGE_MODE || 'auto'
        },
        { status: 200 }
    );
}