import { NextRequest, NextResponse } from 'next/server';
import { processedRenameFiles } from '../storage';

export async function GET(request: NextRequest) {
    try {
        // Get session ID from cookie
        const sessionId = request.cookies.get('rename_session')?.value;
        if (!sessionId) {
            return NextResponse.json({ images: [] });
        }
        
        // Get processed files for this session
        const images: string[] = [];
        for (const [key, file] of processedRenameFiles) {
            if (key.startsWith(sessionId)) {
                // Create a URL for the file
                const fileIndex = key.split('-')[2];
                images.push(`/api/konverter/rename/image/${sessionId}-${fileIndex}`);
            }
        }
        
        console.log(`Returning ${images.length} renamed images for session ${sessionId}`);
        
        return NextResponse.json({ images });
    } catch (error) {
        console.error('Error listing renamed images:', error);
        return NextResponse.json(
            { error: 'Kunne ikke hente omdøbte billeder' },
            { status: 500 }
        );
    }
}