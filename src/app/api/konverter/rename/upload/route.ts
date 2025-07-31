import { NextRequest, NextResponse } from 'next/server';
import { uploadedFiles, createSessionId, cleanupOldSessions } from '../storage';

export async function POST(request: NextRequest) {
    console.log('Received POST request to /api/konverter/rename/upload');
    
    try {
        // Cleanup old sessions periodically
        cleanupOldSessions();
        
        const formData = await request.formData();
        const files = formData.getAll('images') as File[];
        
        if (!files || files.length === 0) {
            return NextResponse.json({ error: 'Ingen filer blev uploadet' }, { status: 400 });
        }
        
        // Create a new session
        const sessionId = createSessionId();
        
        // Clear any existing files for this session
        for (const [key] of uploadedFiles) {
            if (key.startsWith(sessionId)) {
                uploadedFiles.delete(key);
            }
        }
        
        // Store uploaded files in memory
        let uploadCount = 0;
        for (const file of files) {
            const buffer = Buffer.from(await file.arrayBuffer());
            const fileKey = `${sessionId}-${uploadCount}`;
            
            uploadedFiles.set(fileKey, {
                filename: file.name,
                buffer,
                mimetype: file.type
            });
            
            uploadCount++;
        }
        
        console.log(`Uploaded ${uploadCount} files for session ${sessionId}`);
        
        // Store session ID in response
        const response = NextResponse.json({
            message: `Succesfuldt uploadet ${uploadCount} filer`,
            count: uploadCount,
            sessionId
        });
        
        // Set session cookie
        response.cookies.set('rename_session', sessionId, {
            httpOnly: true,
            sameSite: 'strict',
            maxAge: 60 * 60 // 1 hour
        });
        
        return response;
        
    } catch (error) {
        console.error('Error during file upload:', error);
        return NextResponse.json(
            { error: 'Upload fejlede: ' + (error instanceof Error ? error.message : 'Ukendt fejl') },
            { status: 500 }
        );
    }
}