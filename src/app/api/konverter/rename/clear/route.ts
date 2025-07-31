import { NextRequest, NextResponse } from 'next/server';
import { uploadedFiles, processedRenameFiles } from '../storage';

export async function POST(request: NextRequest) {
    try {
        // Get session ID from cookie
        const sessionId = request.cookies.get('rename_session')?.value;
        if (!sessionId) {
            return NextResponse.json({ message: 'Ingen aktiv session at rydde' });
        }
        
        // Clear uploaded files for this session
        let clearedUploadCount = 0;
        for (const [key] of uploadedFiles) {
            if (key.startsWith(sessionId)) {
                uploadedFiles.delete(key);
                clearedUploadCount++;
            }
        }
        
        // Clear processed files for this session
        let clearedProcessedCount = 0;
        for (const [key] of processedRenameFiles) {
            if (key.startsWith(sessionId)) {
                processedRenameFiles.delete(key);
                clearedProcessedCount++;
            }
        }
        
        console.log(`Cleared ${clearedUploadCount} uploaded and ${clearedProcessedCount} processed files for session ${sessionId}`);
        
        return NextResponse.json({
            message: `Succesfuldt ryddet ${clearedUploadCount + clearedProcessedCount} filer`
        });
        
    } catch (error) {
        console.error('Error clearing renamed files:', error);
        return NextResponse.json(
            { error: 'Kunne ikke rydde filer' },
            { status: 500 }
        );
    }
}