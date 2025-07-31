import { NextRequest, NextResponse } from 'next/server';
import { processedImages } from '../process/route';

export async function GET(request: NextRequest) {
    console.log('Received GET request to /api/image-edit/packshot/list');

    try {
        // Get all processed images
        const images = Array.from(processedImages.entries()).map(([key, value]) => ({
            filename: value.filename,
            url: `/api/image-edit/packshot/image/${key}`,
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
        console.error('Error listing packshot images:', error);
        return NextResponse.json(
            { error: 'Failed to list images' },
            { status: 500 }
        );
    }
}