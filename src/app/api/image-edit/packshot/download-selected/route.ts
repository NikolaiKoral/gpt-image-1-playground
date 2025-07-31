import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { processedImages } from '../process/route';
import archiver from 'archiver';

function sha256(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
}

export async function POST(request: NextRequest) {
    console.log('Received POST request to /api/image-edit/packshot/download-selected');

    try {
        const body = await request.json();
        const { passwordHash, format = 'png', selectedFiles = [] } = body;

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

        // Filter images based on selected filenames
        let imagesToDownload: Array<{filename: string, buffer: Buffer}> = [];
        
        for (const [key, imageData] of processedImages.entries()) {
            if (selectedFiles.includes(imageData.filename)) {
                imagesToDownload.push({
                    filename: imageData.filename,
                    buffer: imageData.buffer
                });
            }
        }

        // Check if there are any images to download
        if (imagesToDownload.length === 0) {
            return NextResponse.json({ error: 'No selected images found' }, { status: 400 });
        }

        // Create a ZIP archive with images
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

        // Set up the end listener before finalizing
        const endPromise = new Promise((resolve) => {
            archive.on('end', resolve);
        });

        // Add selected images to the archive
        for (const image of imagesToDownload) {
            if (format === 'jpg' && image.filename.toLowerCase().endsWith('.png')) {
                try {
                    // Import sharp dynamically
                    const sharp = (await import('sharp')).default;
                    
                    // Convert PNG to JPG with white background
                    const jpgBuffer = await sharp(image.buffer)
                        .flatten({ background: { r: 255, g: 255, b: 255 } }) // White background
                        .jpeg({ quality: 90 })
                        .toBuffer();
                    
                    // Change filename extension
                    const jpgFilename = image.filename.replace(/\.png$/i, '.jpg');
                    archive.append(jpgBuffer, { name: jpgFilename });
                    console.log(`Converted ${image.filename} to JPG format`);
                } catch (conversionError) {
                    console.error(`Error converting ${image.filename} to JPG:`, conversionError);
                    // Fall back to original PNG on error
                    archive.append(image.buffer, { name: image.filename });
                }
            } else {
                // Add original file
                archive.append(image.buffer, { name: image.filename });
            }
        }

        // Finalize the archive
        await archive.finalize();

        // Wait for all data to be collected
        await endPromise;

        // Combine all chunks
        const zipBuffer = Buffer.concat(chunks);

        console.log(`Created ZIP archive with ${imagesToDownload.length} selected images`);

        // Return the ZIP file
        return new NextResponse(zipBuffer, {
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="packshot-selected-${Date.now()}.zip"`,
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