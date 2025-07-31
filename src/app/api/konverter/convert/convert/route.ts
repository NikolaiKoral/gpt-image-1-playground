import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { convertedFiles, generateFileKey, cleanupOldFiles } from '../storage';

export async function POST(request: NextRequest) {
    console.log('Received POST request to /api/konverter/convert/convert');
    
    try {
        // Cleanup old files periodically
        cleanupOldFiles();
        
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const outputFormat = formData.get('outputFormat') as string || 'jpg';
        const quality = parseInt(formData.get('quality') as string || '85', 10);
        
        if (!file) {
            return NextResponse.json({ error: 'Ingen fil uploadet' }, { status: 400 });
        }
        
        // Read file buffer
        const buffer = Buffer.from(await file.arrayBuffer());
        
        // Generate output filename
        const inputName = file.name.substring(0, file.name.lastIndexOf('.'));
        const outputFilename = `${inputName}.${outputFormat}`;
        
        // Convert the image using Sharp
        let sharpInstance = sharp(buffer);
        
        // Apply format-specific options
        switch (outputFormat) {
            case 'jpg':
            case 'jpeg':
                sharpInstance = sharpInstance.jpeg({ quality });
                break;
            case 'png':
                sharpInstance = sharpInstance.png();
                break;
            case 'webp':
                sharpInstance = sharpInstance.webp({ quality });
                break;
            case 'gif':
                sharpInstance = sharpInstance.gif();
                break;
            case 'tiff':
                sharpInstance = sharpInstance.tiff();
                break;
            case 'bmp':
                // Sharp doesn't support BMP directly, convert to PNG
                sharpInstance = sharpInstance.png();
                break;
            default:
                return NextResponse.json({ error: 'Ikke-understøttet format' }, { status: 400 });
        }
        
        const convertedBuffer = await sharpInstance.toBuffer();
        
        // Store converted file
        const fileKey = generateFileKey();
        convertedFiles.set(fileKey, {
            filename: outputFilename,
            buffer: convertedBuffer,
            originalName: file.name,
            outputFormat
        });
        
        // Return the URL for the converted file
        const convertedPath = `/api/konverter/convert/output/${fileKey}`;
        
        console.log(`Converted ${file.name} to ${outputFormat} format`);
        
        return NextResponse.json({
            success: true,
            convertedPath,
            originalName: file.name,
            outputFormat
        });
        
    } catch (error) {
        console.error('Conversion error:', error);
        return NextResponse.json(
            { error: 'Konvertering fejlede: ' + (error instanceof Error ? error.message : 'Ukendt fejl') },
            { status: 500 }
        );
    }
}