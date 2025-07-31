import sharp from 'sharp';
import axios from 'axios';
import FormData from 'form-data';

const TARGET_SIZE = 800; // Target frame size (square)

/**
 * Remove background using remove.bg API
 * @param imageBuffer - Input image as buffer
 * @param apiKey - Remove.bg API key
 * @returns Image with transparent background
 */
export async function removeBackground(
    imageBuffer: Buffer, 
    apiKey: string,
    originalFilename: string = 'unknown_file'
): Promise<Buffer> {
    console.log(`[IMG_PROC_BG_REMOVE_START] Attempting background removal for: ${originalFilename}`);
    
    try {
        // Get image metadata to check size before API call
        const metadata = await sharp(imageBuffer).metadata();
        const { width, height } = metadata;
        const megapixels = (width! * height!) / 1000000;

        const MAX_MEGAPIXELS_API = 50; // Max megapixels for remove.bg API

        if (megapixels > MAX_MEGAPIXELS_API) {
            console.warn(`[IMG_PROC_BG_PRE_SCALE] Image ${originalFilename} (${megapixels.toFixed(2)} MP) exceeds ${MAX_MEGAPIXELS_API} MP. Pre-scaling.`);
            const scaleRatio = Math.sqrt(MAX_MEGAPIXELS_API / megapixels);
            const newWidth = Math.floor(width! * scaleRatio);
            const newHeight = Math.floor(height! * scaleRatio);
            
            imageBuffer = await sharp(imageBuffer)
                .resize(newWidth, newHeight, { 
                    fit: 'inside', 
                    withoutEnlargement: false 
                })
                .toBuffer();
        }

        const formData = new FormData();
        formData.append('size', 'preview');
        formData.append('image_file', imageBuffer, 'image.png');

        const response = await axios({
            method: 'post',
            url: 'https://api.remove.bg/v1.0/removebg',
            data: formData,
            headers: {
                ...formData.getHeaders(),
                'X-Api-Key': apiKey,
            },
            responseType: 'arraybuffer',
            timeout: 30000, // 30 second timeout
            maxContentLength: 50 * 1024 * 1024, // 50MB max
            maxBodyLength: 50 * 1024 * 1024, // 50MB max
        });

        console.log(`[IMG_PROC_BG_REMOVE_SUCCESS] Background removed successfully for ${originalFilename}`);
        return Buffer.from(response.data);

    } catch (error: any) {
        let errorMessage = error.message;
        if (error.response && error.response.data) {
            try {
                const errorText = Buffer.from(error.response.data).toString('utf-8');
                const errorJson = JSON.parse(errorText);
                errorMessage = `Status: ${error.response.status}, Details: ${JSON.stringify(errorJson)}`;
            } catch (e) {
                // Not JSON, use raw string
                errorMessage = `Status: ${error.response.status}, Data: ${error.response.data}`;
            }
        }
        console.error(`[IMG_PROC_BG_REMOVE_ERROR] Error removing background for ${originalFilename}: ${errorMessage}`);
        
        console.warn(`[IMG_PROC_BG_REMOVE_FALLBACK] Background removal failed for ${originalFilename}. Returning original image.`);
        return imageBuffer; // Return the original buffer on error
    }
}

/**
 * Process image to fit in 800x800 frame
 * @param imageBuffer - Image with transparent background
 * @param filename - Original filename
 * @returns Processed image buffer
 */
export async function processPackshotImage(
    imageBuffer: Buffer, 
    filename: string,
    frameSize: number = TARGET_SIZE
): Promise<Buffer> {
    console.log(`[IMG_PROC_ITEM_START] Starting frame processing for: ${filename}`);
    
    try {
        // Get image metadata
        const metadata = await sharp(imageBuffer).metadata();
        const { width, height } = metadata;
        
        if (!width || !height) {
            throw new Error('Invalid image dimensions');
        }
        
        // Calculate scale to fit in target frame while preserving aspect ratio
        const scale = Math.min(frameSize / width, frameSize / height);
        const newWidth = Math.round(width * scale);
        const newHeight = Math.round(height * scale);
        
        // Calculate position to center the image horizontally and vertically
        const left = Math.floor((frameSize - newWidth) / 2);
        const top = Math.floor((frameSize - newHeight) / 2);

        // Resize the input image first
        const resizedImage = await sharp(imageBuffer)
            .resize(newWidth, newHeight, {
                fit: 'inside',
                withoutEnlargement: false
            })
            .toBuffer();
        
        // Create a blank transparent canvas and composite
        const result = await sharp({
            create: {
                width: frameSize,
                height: frameSize,
                channels: 4,
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            }
        })
            .png()
            .composite([
                {
                    input: resizedImage,
                    left,
                    top
                }
            ])
            .toBuffer();

        console.log(`[IMG_PROC_ITEM_SUCCESS] Successfully processed ${filename}`);
        return result;
        
    } catch (error) {
        console.error(`[IMG_PROC_ITEM_ERROR] Error processing ${filename}:`, error);
        throw error;
    }
}

/**
 * Process multiple images
 */
export async function processAllPackshotImages(
    images: Array<{ buffer: Buffer; filename: string }>,
    options: {
        removeBackground: boolean;
        removeBackgroundApiKey?: string;
        frameSize?: number;
    }
): Promise<Array<{ buffer: Buffer; filename: string; error?: string }>> {
    const results: Array<{ buffer: Buffer; filename: string; error?: string }> = [];
    
    for (const image of images) {
        try {
            let processedBuffer = image.buffer;
            
            // Step 1: Remove background if enabled
            if (options.removeBackground && options.removeBackgroundApiKey) {
                processedBuffer = await removeBackground(
                    processedBuffer,
                    options.removeBackgroundApiKey,
                    image.filename
                );
            }
            
            // Step 2: Process to fit in frame
            processedBuffer = await processPackshotImage(
                processedBuffer,
                image.filename,
                options.frameSize
            );
            
            // Extract EAN and sequence from filename
            const eanMatch = image.filename.match(/^(\d+)/);
            const ean = eanMatch ? eanMatch[1] : image.filename.split('.')[0];
            
            // Check for sequence number in various formats
            let sequence: string | null = null;
            const dashSeqMatch = image.filename.match(/-(\d+)/);
            const parenthesesSeqMatch = image.filename.match(/\((\d+)\)/);
            
            if (dashSeqMatch) {
                sequence = dashSeqMatch[1];
            } else if (parenthesesSeqMatch) {
                sequence = parenthesesSeqMatch[1];
            }
            
            // Generate output filename
            const outputFilename = sequence ? 
                `${ean}-${sequence}.png` : 
                `${ean}.png`;
            
            results.push({
                buffer: processedBuffer,
                filename: outputFilename
            });
            
        } catch (error) {
            console.error(`Error processing ${image.filename}:`, error);
            results.push({
                buffer: image.buffer,
                filename: image.filename,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    
    return results;
}