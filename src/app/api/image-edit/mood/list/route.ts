import { NextRequest, NextResponse } from 'next/server';
import { processedMoodImages } from '../process/route';

export async function GET(request: NextRequest) {
    console.log('Received GET request to /api/image-edit/mood/list');

    try {
        // Get all processed mood images
        const images = Array.from(processedMoodImages.entries()).map(([key, value]) => ({
            filename: value.filename,
            url: `/api/image-edit/mood/image/${key}`,
            size: value.buffer.length,
            timestamp: value.timestamp
        }));

        // Sort by timestamp (newest first)
        images.sort((a, b) => b.timestamp - a.timestamp);

        return NextResponse.json({
            images,
            count: images.length
        });

    } catch (error) {
        console.error('Error listing mood images:', error);
        return NextResponse.json(
            { error: 'Failed to list images' },
            { status: 500 }
        );
    }
}