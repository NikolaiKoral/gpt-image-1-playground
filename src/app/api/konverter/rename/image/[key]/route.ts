import { NextRequest, NextResponse } from 'next/server';
import { processedRenameFiles } from '../../storage';

export async function GET(
    request: NextRequest,
    { params }: { params: { key: string } }
) {
    try {
        const fileKey = params.key;
        const file = processedRenameFiles.get(fileKey);
        
        if (!file) {
            return NextResponse.json({ error: 'Fil ikke fundet' }, { status: 404 });
        }
        
        // Determine content type based on filename
        let contentType = 'image/jpeg';
        if (file.filename.toLowerCase().endsWith('.png')) {
            contentType = 'image/png';
        } else if (file.filename.toLowerCase().endsWith('.webp')) {
            contentType = 'image/webp';
        } else if (file.filename.toLowerCase().endsWith('.gif')) {
            contentType = 'image/gif';
        }
        
        return new NextResponse(file.buffer, {
            headers: {
                'Content-Type': contentType,
                'Content-Disposition': `inline; filename="${file.filename}"`,
                'Cache-Control': 'no-cache, no-store, must-revalidate',
            },
        });
    } catch (error) {
        console.error('Error serving renamed image:', error);
        return NextResponse.json(
            { error: 'Kunne ikke hente billede' },
            { status: 500 }
        );
    }
}