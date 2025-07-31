import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { uploadedMoodFiles } from '../upload/route';
import { processedMoodImages } from '../process/route';

function sha256(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
}

export async function POST(request: NextRequest) {
    console.log('Received POST request to /api/image-edit/mood/clear');

    try {
        const body = await request.json();
        const { passwordHash } = body;

        // Check password authentication if enabled
        if (process.env.APP_PASSWORD) {
            if (!passwordHash) {
                return NextResponse.json({ error: 'Unauthorized: Missing password hash.' }, { status: 401 });
            }
            const serverPasswordHash = sha256(process.env.APP_PASSWORD);
            if (passwordHash !== serverPasswordHash) {
                return NextResponse.json({ error: 'Unauthorized: Invalid password.' }, { status: 401 });
            }
        }

        // Clear both uploaded and processed images
        uploadedMoodFiles.clear();
        processedMoodImages.clear();

        console.log('Cleared all mood images');

        return NextResponse.json({
            message: 'All mood images cleared successfully'
        });

    } catch (error) {
        console.error('Error clearing mood images:', error);
        return NextResponse.json(
            { error: 'Failed to clear images' },
            { status: 500 }
        );
    }
}