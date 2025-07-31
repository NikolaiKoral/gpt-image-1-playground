import { NextRequest, NextResponse } from 'next/server';
import { convertedFiles } from '../../storage';

export async function GET(
    request: NextRequest,
    { params }: { params: { key: string } }
) {
    try {
        const fileKey = params.key;
        const file = convertedFiles.get(fileKey);
        
        if (!file) {
            return NextResponse.json({ error: 'Fil ikke fundet' }, { status: 404 });
        }
        
        // Determine content type based on format
        let contentType = 'image/jpeg';
        switch (file.outputFormat) {
            case 'png':
                contentType = 'image/png';
                break;
            case 'webp':
                contentType = 'image/webp';
                break;
            case 'gif':
                contentType = 'image/gif';
                break;
            case 'tiff':
            case 'tif':
                contentType = 'image/tiff';
                break;
            case 'bmp':
                contentType = 'image/bmp';
                break;
        }
        
        return new NextResponse(file.buffer, {
            headers: {
                'Content-Type': contentType,
                'Content-Disposition': `inline; filename="${file.filename}"`,
                'Cache-Control': 'no-cache, no-store, must-revalidate',
            },
        });
    } catch (error) {
        console.error('Error serving converted image:', error);
        return NextResponse.json(
            { error: 'Kunne ikke hente billede' },
            { status: 500 }
        );
    }
}