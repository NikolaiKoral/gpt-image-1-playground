import { NextRequest, NextResponse } from 'next/server';
import { processAllPackshotImages } from '@/lib/image-processor';
import { db } from '@/lib/db';
import crypto from 'crypto';
import { uploadedFiles } from '../upload/route';

function sha256(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
}

// Storage for processed images
const processedImages = new Map<string, { buffer: Buffer; filename: string; timestamp: number }>();

// Clean up old processed images (older than 1 hour)
function cleanupOldImages() {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    for (const [key, value] of processedImages.entries()) {
        if (value.timestamp < oneHourAgo) {
            processedImages.delete(key);
        }
    }
}

export async function POST(request: NextRequest) {
    console.log('Received POST request to /api/image-edit/packshot/process');

    try {
        cleanupOldImages();

        const body = await request.json();
        const { removeBackground = true, frameSize = 800, passwordHash } = body;

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

        // Get uploaded files
        const filesToProcess = Array.from(uploadedFiles.values()).map(file => ({
            buffer: file.buffer,
            filename: file.filename
        }));

        if (filesToProcess.length === 0) {
            return NextResponse.json({ error: 'No files to process. Please upload files first.' }, { status: 400 });
        }

        console.log(`Processing ${filesToProcess.length} files with removeBackground=${removeBackground}, frameSize=${frameSize}`);

        // Process images
        const results = await processAllPackshotImages(filesToProcess, {
            removeBackground,
            removeBackgroundApiKey: process.env.REMOVE_BG_API_KEY,
            frameSize
        });

        // Clear processed images before adding new ones
        processedImages.clear();

        // Store processed images
        const processedResults = [];
        for (const result of results) {
            if (!result.error) {
                const key = `${Date.now()}-${result.filename}`;
                processedImages.set(key, {
                    buffer: result.buffer,
                    filename: result.filename,
                    timestamp: Date.now()
                });
                processedResults.push({
                    key,
                    filename: result.filename,
                    size: result.buffer.length
                });
            } else {
                processedResults.push({
                    filename: result.filename,
                    error: result.error
                });
            }
        }

        // Clear uploaded files after processing
        uploadedFiles.clear();

        const successCount = processedResults.filter(r => !r.error).length;
        console.log(`Processed ${successCount} of ${results.length} images successfully`);

        return NextResponse.json({
            message: 'Images processed successfully',
            results: processedResults,
            success: successCount,
            failed: results.length - successCount
        });

    } catch (error) {
        console.error('Error in packshot process:', error);
        return NextResponse.json(
            { error: 'Failed to process images' },
            { status: 500 }
        );
    }
}

// Export for use in other routes
export { processedImages };