import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { processedMoodImages } from '../process/route';
import archiver from 'archiver';

function sha256(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
}

export async function POST(request: NextRequest) {
    console.log('Received POST request to /api/image-edit/mood/download-all');

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

        // Check if there are any images to download
        if (processedMoodImages.size === 0) {
            return NextResponse.json({ error: 'No images to download' }, { status: 400 });
        }

        // Create a ZIP archive
        const archive = archiver('zip', {
            zlib: { level: 9 } // Maximum compression
        });

        const chunks: Uint8Array[] = [];

        archive.on('data', (chunk) => {
            chunks.push(chunk);
        });

        archive.on('error', (err) => {
            console.error('Archive error:', err);
            throw err;
        });

        // Add all processed images to the archive
        for (const [key, imageData] of processedMoodImages.entries()) {
            archive.append(imageData.buffer, { name: imageData.filename });
        }

        // Finalize the archive
        await archive.finalize();

        // Wait for all data to be collected
        await new Promise((resolve) => {
            archive.on('end', resolve);
        });

        // Combine all chunks
        const zipBuffer = Buffer.concat(chunks);

        console.log(`Created ZIP archive with ${processedMoodImages.size} mood images`);

        // Return the ZIP file
        return new NextResponse(zipBuffer, {
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="mood-images-${Date.now()}.zip"`,
                'Content-Length': zipBuffer.length.toString()
            }
        });

    } catch (error) {
        console.error('Error creating ZIP archive:', error);
        return NextResponse.json(
            { error: 'Failed to create download archive' },
            { status: 500 }
        );
    }
}