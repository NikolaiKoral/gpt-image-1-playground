import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { compressedFiles, generateFileKey, cleanupOldFiles } from '../storage';

const QUALITY_PRESETS: Record<string, number> = {
    web: 85,
    email: 70,
    storage: 60,
    high: 95,
    medium: 80,
    low: 60
};

export async function POST(request: NextRequest) {
    console.log('Received POST request to /api/konverter/compress/compress');
    
    try {
        // Cleanup old files periodically
        cleanupOldFiles();
        
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const quality = formData.get('quality') as string || '85';
        const preset = formData.get('preset') as string || '';
        const format = formData.get('format') as string || 'original';
        
        if (!file) {
            return NextResponse.json({ error: 'Ingen fil uploadet' }, { status: 400 });
        }
        
        // Determine quality level
        let qualityLevel = parseInt(quality, 10);
        if (preset && QUALITY_PRESETS[preset]) {
            qualityLevel = QUALITY_PRESETS[preset];
        }
        
        // Read file buffer
        const inputBuffer = Buffer.from(await file.arrayBuffer());
        const inputSize = inputBuffer.length;
        
        // Determine output format
        let outputFormat = format;
        if (format === 'original') {
            const ext = file.name.toLowerCase().split('.').pop() || 'jpg';
            outputFormat = ext;
            // Convert unsupported formats to jpeg
            if (!['jpg', 'jpeg', 'png', 'webp', 'gif', 'tiff'].includes(outputFormat)) {
                outputFormat = 'jpeg';
            }
        }
        
        // Generate output filename
        const inputName = file.name.substring(0, file.name.lastIndexOf('.'));
        const outputFilename = `${inputName}-compressed.${outputFormat}`;
        
        // Compress the image using Sharp
        let sharpInstance = sharp(inputBuffer);
        
        // Get metadata to preserve orientation
        const metadata = await sharpInstance.metadata();
        
        // Apply rotation if needed
        if (metadata.orientation) {
            sharpInstance = sharpInstance.rotate();
        }
        
        // Apply format-specific compression
        switch (outputFormat) {
            case 'jpg':
            case 'jpeg':
                sharpInstance = sharpInstance.jpeg({
                    quality: qualityLevel,
                    progressive: true,
                    mozjpeg: true
                });
                break;
            case 'png':
                sharpInstance = sharpInstance.png({
                    compressionLevel: Math.floor((100 - qualityLevel) / 10),
                    progressive: true
                });
                break;
            case 'webp':
                sharpInstance = sharpInstance.webp({
                    quality: qualityLevel,
                    effort: 6
                });
                break;
            case 'gif':
                sharpInstance = sharpInstance.gif({
                    effort: 10
                });
                break;
            case 'tiff':
                sharpInstance = sharpInstance.tiff({
                    quality: qualityLevel,
                    compression: 'jpeg'
                });
                break;
            default:
                sharpInstance = sharpInstance.jpeg({
                    quality: qualityLevel,
                    progressive: true,
                    mozjpeg: true
                });
        }
        
        const compressedBuffer = await sharpInstance.toBuffer();
        const outputSize = compressedBuffer.length;
        
        // Calculate savings
        const savedBytes = inputSize - outputSize;
        const savedPercentage = Math.round((savedBytes / inputSize) * 100);
        
        // Store compressed file
        const fileKey = generateFileKey();
        compressedFiles.set(fileKey, {
            filename: outputFilename,
            buffer: compressedBuffer,
            originalName: file.name,
            originalSize: inputSize,
            compressedSize: outputSize
        });
        
        // Return the URL for the compressed file
        const compressedPath = `/api/konverter/compress/output/${fileKey}`;
        
        console.log(`Compressed ${file.name}: ${inputSize} -> ${outputSize} bytes (${savedPercentage}% saved)`);
        
        return NextResponse.json({
            success: true,
            compressedPath,
            originalName: file.name,
            outputFormat,
            originalSize: inputSize,
            compressedSize: outputSize,
            savedBytes,
            savedPercentage,
            quality: qualityLevel
        });
        
    } catch (error) {
        console.error('Compression error:', error);
        return NextResponse.json(
            { error: 'Komprimering fejlede: ' + (error instanceof Error ? error.message : 'Ukendt fejl') },
            { status: 500 }
        );
    }
}