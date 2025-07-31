import { NextRequest, NextResponse } from 'next/server';
import { processAllMoodImages } from '@/lib/mood-processor';
import crypto from 'crypto';
import { uploadedMoodFiles } from '../upload/route';

function sha256(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
}

// Storage for processed mood images
const processedMoodImages = new Map<string, { buffer: Buffer; filename: string; timestamp: number }>();

// Clean up old processed images (older than 1 hour)
function cleanupOldImages() {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    for (const [key, value] of processedMoodImages.entries()) {
        if (value.timestamp < oneHourAgo) {
            processedMoodImages.delete(key);
        }
    }
}

export async function POST(request: NextRequest) {
    console.log('Received POST request to /api/image-edit/mood/process');

    try {
        cleanupOldImages();

        const body = await request.json();
        const { 
            detectBorders = true, 
            trimThreshold = 240, 
            maintainAspectRatio = true,
            outputFormat = 'square',
            passwordHash 
        } = body;

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
        const filesToProcess = Array.from(uploadedMoodFiles.values()).map(file => ({
            buffer: file.buffer,
            filename: file.filename
        }));

        if (filesToProcess.length === 0) {
            return NextResponse.json({ error: 'No files to process. Please upload files first.' }, { status: 400 });
        }

        console.log(`Processing ${filesToProcess.length} mood images with detectBorders=${detectBorders}, trimThreshold=${trimThreshold}`);

        // Process images
        const { results, summary } = await processAllMoodImages(filesToProcess, {
            detectBorders,
            trimThreshold,
            maintainAspectRatio,
            outputFormat: outputFormat as 'square' | 'original' | 'cover',
            background: { r: 255, g: 255, b: 255, alpha: 0 },
            batchSize: 5
        });

        // Clear processed images before adding new ones
        processedMoodImages.clear();

        // Store processed images
        const processedResults = [];
        for (const result of results) {
            if (!result.error) {
                const key = `${Date.now()}-${result.filename}`;
                processedMoodImages.set(key, {
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
        uploadedMoodFiles.clear();

        console.log(`Processed ${summary.success} of ${summary.total} mood images successfully`);

        return NextResponse.json({
            message: 'Mood images processed successfully',
            results: processedResults,
            success: summary.success,
            failed: summary.failures,
            errors: summary.errors
        });

    } catch (error) {
        console.error('Error in mood process:', error);
        return NextResponse.json(
            { error: 'Failed to process images' },
            { status: 500 }
        );
    }
}

// Export for use in other routes
export { processedMoodImages };