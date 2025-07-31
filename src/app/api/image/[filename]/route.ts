import fs from 'fs/promises';
import { lookup } from 'mime-types';
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { db } from '@/lib/db';

// Base directory where images are stored (outside nextjs-app)
const imageBaseDir = path.resolve(process.cwd(), 'generated-images');

// Get storage mode from environment
const getStorageMode = (): 'fs' | 'indexeddb' => {
    const mode = process.env.NEXT_PUBLIC_IMAGE_STORAGE_MODE;
    return mode === 'indexeddb' ? 'indexeddb' : 'fs';
};

export async function GET(request: NextRequest, { params }: { params: Promise<{ filename: string }> }) {
    const { filename } = await params;

    if (!filename) {
        return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
    }

    // Basic security: Prevent directory traversal
    if (filename.includes('..') || filename.startsWith('/') || filename.startsWith('\\')) {
        return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
    }

    const storageMode = getStorageMode();
    console.log(`Serving image ${filename} using ${storageMode} storage mode`);

    try {
        let fileBuffer: Buffer;
        let contentType: string;

        if (storageMode === 'indexeddb') {
            // Fetch from IndexedDB
            const imageRecord = await db.images.get(filename);
            
            if (!imageRecord || !imageRecord.blob) {
                console.error(`Image ${filename} not found in IndexedDB`);
                return NextResponse.json({ error: 'Image not found' }, { status: 404 });
            }

            // Convert blob to buffer
            const arrayBuffer = await imageRecord.blob.arrayBuffer();
            fileBuffer = Buffer.from(arrayBuffer);
            contentType = imageRecord.blob.type || lookup(filename) || 'application/octet-stream';
        } else {
            // Fetch from filesystem
            const filepath = path.join(imageBaseDir, filename);
            await fs.access(filepath);
            fileBuffer = await fs.readFile(filepath);
            contentType = lookup(filename) || 'application/octet-stream';
        }

        return new NextResponse(fileBuffer, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Content-Length': fileBuffer.length.toString(),
                'Cache-Control': 'public, max-age=3600',
                'Access-Control-Allow-Origin': '*'
            }
        });
    } catch (error: unknown) {
        console.error(`Error serving image ${filename}:`, error);
        if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT') {
            return NextResponse.json({ error: 'Image not found' }, { status: 404 });
        }
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
