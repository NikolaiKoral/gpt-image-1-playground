import { NextRequest, NextResponse } from 'next/server';
import { convertedFiles } from '../storage';
import archiver from 'archiver';

export async function POST(request: NextRequest) {
    console.log('Received POST request to /api/konverter/convert/download-all');
    
    try {
        const body = await request.json();
        const { files } = body;
        
        if (!files || files.length === 0) {
            return NextResponse.json({ error: 'Ingen filer at downloade' }, { status: 400 });
        }
        
        // Create a ZIP archive
        const archive = archiver('zip', {
            zlib: { level: 9 }
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
        
        // Add each file to the archive
        let addedCount = 0;
        for (const filePath of files) {
            // Extract file key from path
            const match = filePath.match(/\/output\/(.+)$/);
            if (match) {
                const fileKey = match[1];
                const file = convertedFiles.get(fileKey);
                
                if (file) {
                    archive.append(file.buffer, { name: file.filename });
                    addedCount++;
                }
            }
        }
        
        if (addedCount === 0) {
            return NextResponse.json({ error: 'Ingen gyldige filer fundet' }, { status: 400 });
        }
        
        // Finalize the archive
        await archive.finalize();
        
        // Wait for all data to be collected
        await endPromise;
        
        // Combine all chunks
        const zipBuffer = Buffer.concat(chunks);
        
        console.log(`Created ZIP archive with ${addedCount} converted files`);
        
        // Return the ZIP file
        return new NextResponse(zipBuffer, {
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="converted-images-${Date.now()}.zip"`,
                'Content-Length': zipBuffer.length.toString()
            }
        });
        
    } catch (error) {
        console.error('Error creating ZIP archive:', error);
        return NextResponse.json(
            { error: 'Download fejlede' },
            { status: 500 }
        );
    }
}