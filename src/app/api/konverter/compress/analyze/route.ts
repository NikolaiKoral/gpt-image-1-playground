import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

export async function POST(request: NextRequest) {
    console.log('Received POST request to /api/konverter/compress/analyze');
    
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        
        if (!file) {
            return NextResponse.json({ error: 'Ingen fil uploadet' }, { status: 400 });
        }
        
        const inputBuffer = Buffer.from(await file.arrayBuffer());
        const inputSize = inputBuffer.length;
        
        const results: Record<string, any> = {};
        
        // Test different quality levels
        const qualities = [95, 85, 70, 60];
        
        for (const quality of qualities) {
            try {
                const compressedBuffer = await sharp(inputBuffer)
                    .jpeg({ quality, progressive: true, mozjpeg: true })
                    .toBuffer();
                
                const compressedSize = compressedBuffer.length;
                results[`q${quality}`] = {
                    size: compressedSize,
                    savedBytes: inputSize - compressedSize,
                    savedPercentage: Math.round(((inputSize - compressedSize) / inputSize) * 100)
                };
            } catch (error) {
                console.error(`Error analyzing at quality ${quality}:`, error);
            }
        }
        
        // Also test WebP
        try {
            const webpBuffer = await sharp(inputBuffer)
                .webp({ quality: 85, effort: 6 })
                .toBuffer();
            
            const webpSize = webpBuffer.length;
            results.webp = {
                size: webpSize,
                savedBytes: inputSize - webpSize,
                savedPercentage: Math.round(((inputSize - webpSize) / inputSize) * 100)
            };
        } catch (error) {
            console.error('Error analyzing WebP:', error);
        }
        
        return NextResponse.json({
            success: true,
            originalSize: inputSize,
            results
        });
        
    } catch (error) {
        console.error('Analysis error:', error);
        return NextResponse.json(
            { error: 'Analyse fejlede: ' + (error instanceof Error ? error.message : 'Ukendt fejl') },
            { status: 500 }
        );
    }
}