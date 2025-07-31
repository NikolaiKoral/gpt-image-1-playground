import { NextRequest, NextResponse } from 'next/server';
import { convertedFiles } from '../storage';

export async function POST(request: NextRequest) {
    try {
        const clearedCount = convertedFiles.size;
        convertedFiles.clear();
        
        console.log(`Cleared ${clearedCount} converted files`);
        
        return NextResponse.json({
            success: true,
            message: `Alle ${clearedCount} filer ryddet`
        });
        
    } catch (error) {
        console.error('Error clearing converted files:', error);
        return NextResponse.json(
            { error: 'Kunne ikke rydde filer' },
            { status: 500 }
        );
    }
}