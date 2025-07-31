import { NextRequest, NextResponse } from 'next/server';
import { compressedFiles } from '../storage';

export async function POST(request: NextRequest) {
    console.log('Received POST request to /api/konverter/compress/clear-all');
    
    try {
        const beforeCount = compressedFiles.size;
        
        // Clear all compressed files
        compressedFiles.clear();
        
        console.log(`Cleared ${beforeCount} compressed files from memory`);
        
        return NextResponse.json({
            success: true,
            message: `${beforeCount} filer blev ryddet`,
            clearedCount: beforeCount
        });
        
    } catch (error) {
        console.error('Error clearing compressed files:', error);
        return NextResponse.json(
            { error: 'Kunne ikke rydde filer' },
            { status: 500 }
        );
    }
}