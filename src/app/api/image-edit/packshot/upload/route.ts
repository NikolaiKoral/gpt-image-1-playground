import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import crypto from 'crypto';

function sha256(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
}

// Temporary storage for uploaded files
const uploadedFiles = new Map<string, { buffer: Buffer; filename: string; timestamp: number }>();

// Clean up old uploads (older than 1 hour)
function cleanupOldUploads() {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    for (const [key, value] of uploadedFiles.entries()) {
        if (value.timestamp < oneHourAgo) {
            uploadedFiles.delete(key);
        }
    }
}

export async function POST(request: NextRequest) {
    console.log('Received POST request to /api/image-edit/packshot/upload');

    try {
        cleanupOldUploads();

        const formData = await request.formData();

        // Check password authentication if enabled
        if (process.env.APP_PASSWORD) {
            const clientPasswordHash = formData.get('passwordHash') as string | null;
            if (!clientPasswordHash) {
                return NextResponse.json({ error: 'Unauthorized: Missing password hash.' }, { status: 401 });
            }
            const serverPasswordHash = sha256(process.env.APP_PASSWORD);
            if (clientPasswordHash !== serverPasswordHash) {
                return NextResponse.json({ error: 'Unauthorized: Invalid password.' }, { status: 401 });
            }
        }

        // Get files from form data
        const files = formData.getAll('files') as File[];
        if (files.length === 0) {
            return NextResponse.json({ error: 'No files uploaded' }, { status: 400 });
        }

        // Clear previous uploads
        uploadedFiles.clear();

        // Process each file
        const uploadResults = [];
        for (const file of files) {
            const buffer = Buffer.from(await file.arrayBuffer());
            const key = `${Date.now()}-${file.name}`;
            
            uploadedFiles.set(key, {
                buffer,
                filename: file.name,
                timestamp: Date.now()
            });

            uploadResults.push({
                key,
                filename: file.name,
                size: buffer.length
            });
        }

        console.log(`Uploaded ${files.length} files for packshot processing`);

        return NextResponse.json({
            message: 'Files uploaded successfully',
            files: uploadResults,
            count: files.length
        });

    } catch (error) {
        console.error('Error in packshot upload:', error);
        return NextResponse.json(
            { error: 'Failed to upload files' },
            { status: 500 }
        );
    }
}

// Export for use in other routes
export { uploadedFiles };