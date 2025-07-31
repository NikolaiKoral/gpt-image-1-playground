import { NextRequest, NextResponse } from 'next/server';
import { processedRenameFiles } from '../storage';
import archiver from 'archiver';

export async function POST(request: NextRequest) {
    console.log('Received POST request to /api/konverter/rename/download-all');
    
    try {
        // Get session ID from cookie
        const sessionId = request.cookies.get('rename_session')?.value;
        if (!sessionId) {
            return NextResponse.json({ error: 'Ingen aktiv session' }, { status: 400 });
        }
        
        // Get processed files for this session
        const filesToDownload: Array<{ filename: string; buffer: Buffer }> = [];
        for (const [key, file] of processedRenameFiles) {
            if (key.startsWith(sessionId)) {
                filesToDownload.push({
                    filename: file.filename,
                    buffer: file.buffer
                });
            }
        }
        
        if (filesToDownload.length === 0) {
            return NextResponse.json({ error: 'Ingen filer at downloade' }, { status: 400 });
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
        
        // Set up the end listener before finalizing
        const endPromise = new Promise((resolve) => {
            archive.on('end', resolve);
        });
        
        // Add all files to the archive
        for (const file of filesToDownload) {
            archive.append(file.buffer, { name: file.filename });
        }
        
        // Finalize the archive
        await archive.finalize();
        
        // Wait for all data to be collected
        await endPromise;
        
        // Combine all chunks
        const zipBuffer = Buffer.concat(chunks);
        
        console.log(`Created ZIP archive with ${filesToDownload.length} renamed files`);
        
        // Return the ZIP file
        return new NextResponse(zipBuffer, {
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="ean-renamed-${Date.now()}.zip"`,
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