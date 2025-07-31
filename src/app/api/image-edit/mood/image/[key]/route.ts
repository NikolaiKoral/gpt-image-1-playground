import { NextRequest, NextResponse } from 'next/server';
import { processedMoodImages } from '../../process/route';

interface Params {
    params: Promise<{
        key: string;
    }>;
}

export async function GET(request: NextRequest, { params }: Params) {
    const { key } = await params;
    console.log(`Received GET request to /api/image-edit/mood/image/${key}`);

    try {
        const imageData = processedMoodImages.get(key);
        
        if (!imageData) {
            return NextResponse.json(
                { error: 'Image not found' },
                { status: 404 }
            );
        }

        // Return the image
        return new NextResponse(imageData.buffer, {
            headers: {
                'Content-Type': 'image/png',
                'Content-Length': imageData.buffer.length.toString(),
                'Cache-Control': 'public, max-age=3600',
                'Content-Disposition': `inline; filename="${imageData.filename}"`
            }
        });

    } catch (error) {
        console.error('Error serving mood image:', error);
        return NextResponse.json(
            { error: 'Failed to serve image' },
            { status: 500 }
        );
    }
}