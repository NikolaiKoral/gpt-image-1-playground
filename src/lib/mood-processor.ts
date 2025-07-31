import sharp from 'sharp';

// Simple white border detection - checks all edges for white pixels
async function hasDetectableBorders(
    imagePathOrBuffer: string | Buffer, 
    metadata: sharp.Metadata, 
    threshold: number = 240
): Promise<boolean> {
    const imageName = typeof imagePathOrBuffer === 'string' ? imagePathOrBuffer : 'buffer_input';
    console.log(`[MOOD_BORDER_DETECT_START] Starting border detection for: ${imageName}, Threshold: ${threshold}`);
    
    const image = sharp(imagePathOrBuffer);
    
    // Use narrow edge strips (3px) with stats for memory efficiency
    const edgeWidth = 3;
    
    // Extract and analyze each edge with proper cleanup
    const topEdge = image.clone().extract({ 
        left: 0, 
        top: 0, 
        width: metadata.width!, 
        height: edgeWidth 
    });
    const topEdgeStats = await topEdge.stats();
    
    const bottomEdge = image.clone().extract({ 
        left: 0, 
        top: metadata.height! - edgeWidth, 
        width: metadata.width!, 
        height: edgeWidth 
    });
    const bottomEdgeStats = await bottomEdge.stats();
    
    const leftEdge = image.clone().extract({ 
        left: 0, 
        top: 0, 
        width: edgeWidth, 
        height: metadata.height! 
    });
    const leftEdgeStats = await leftEdge.stats();
    
    const rightEdge = image.clone().extract({ 
        left: metadata.width! - edgeWidth, 
        top: 0, 
        width: edgeWidth, 
        height: metadata.height! 
    });
    const rightEdgeStats = await rightEdge.stats();
    
    // Check if an edge is light/white (handles both pure white and light borders)
    function isLightEdge(edgeStats: sharp.Stats, edgeName: string): boolean {
        const channels = edgeStats.channels;
        const avgRed = channels[0].mean;
        const avgGreen = channels[1].mean; 
        const avgBlue = channels[2].mean;
        
        // Calculate average brightness and color uniformity
        const avgBrightness = (avgRed + avgGreen + avgBlue) / 3;
        const colorVariance = Math.max(
            Math.abs(avgRed - avgBrightness),
            Math.abs(avgGreen - avgBrightness), 
            Math.abs(avgBlue - avgBrightness)
        );
        
        // Light edge criteria (handles both white and off-white/cream borders):
        // 1. High brightness (average > 150 for light borders)
        // 2. Low color variance (< 30 for mostly neutral colors)
        // 3. All channels reasonably high (> 120 to avoid dark borders)
        const isLight = (
            avgBrightness > 150 &&           // Bright enough
            colorVariance < 30 &&            // Not too colorful (neutral/gray/white/cream)
            avgRed > 120 && avgGreen > 120 && avgBlue > 120  // All channels reasonably high
        );
        
        console.log(`[MOOD_BORDER_EDGE] ${imageName} - ${edgeName}: RGB(${avgRed.toFixed(0)}, ${avgGreen.toFixed(0)}, ${avgBlue.toFixed(0)}) Brightness: ${avgBrightness.toFixed(0)}, Variance: ${colorVariance.toFixed(0)}, Is Light: ${isLight}`);
        
        return isLight;
    }
    
    const hasTop = isLightEdge(topEdgeStats, 'Top');
    const hasBottom = isLightEdge(bottomEdgeStats, 'Bottom');
    const hasLeft = isLightEdge(leftEdgeStats, 'Left');
    const hasRight = isLightEdge(rightEdgeStats, 'Right');
    
    // Image has borders if at least 3 edges are light (allowing for one edge to be different)
    const edgeCount = [hasTop, hasBottom, hasLeft, hasRight].filter(Boolean).length;
    const hasBorders = edgeCount >= 3;
    
    console.log(`[MOOD_BORDER_DETECT_RESULT] ${imageName} - Light edges: ${edgeCount}/4, Has borders: ${hasBorders}`);
    
    return hasBorders;
}

/**
 * Process a single mood image
 */
export async function processMoodImage(
    inputBuffer: Buffer,
    filename: string,
    options: {
        detectBorders?: boolean;
        trimThreshold?: number;
        maintainAspectRatio?: boolean;
        outputFormat?: 'square' | 'original' | 'cover';
        background?: { r: number; g: number; b: number; alpha: number };
    } = {}
): Promise<Buffer> {
    const opts = {
        detectBorders: true,
        trimThreshold: 240,
        maintainAspectRatio: true,
        outputFormat: 'square' as const,
        background: { r: 255, g: 255, b: 255, alpha: 0 },
        ...options
    };
    
    console.log(`[MOOD_SCALE_ITEM_START] Processing mood image: ${filename}`);
    
    try {
        let image = sharp(inputBuffer);

        // Get image metadata
        const metadata = await image.metadata();
        console.log(`[MOOD_SCALE_ITEM_DETAIL] Initial metadata for ${filename}: ${metadata.width}x${metadata.height}, Alpha: ${metadata.hasAlpha}`);

        // Check if image is square before trimming
        const isSquare = metadata.width === metadata.height;
        
        // Trim the image - check for borders on ALL images
        if (opts.detectBorders) {
            const hasBorders = await hasDetectableBorders(inputBuffer, metadata, opts.trimThreshold);
            
            if (hasBorders) {
                console.log(`[MOOD_SCALE_ITEM_DETAIL] Borders detected for ${filename}. Attempting trim`);
                // Use a lower threshold for Sharp's trim to be more aggressive with white borders
                const sharpTrimThreshold = Math.max(5, opts.trimThreshold - 200);
                image = image.trim({ threshold: sharpTrimThreshold });
            } else {
                // If no obvious uniform borders, try Sharp's automatic trim for complex backgrounds
                console.log(`[MOOD_SCALE_ITEM_DETAIL] No uniform borders detected for ${filename}. Trying automatic trim...`);
                try {
                    // Try multiple trim approaches for complex backgrounds
                    const originalMeta = metadata;
                    let bestTrimmed = image.clone();
                    let maxReduction = 0;
                    
                    // Try different trim thresholds
                    for (const thresh of [1, 3, 8, 15, 25]) {
                        try {
                            const testTrimmed = image.clone().trim({ threshold: thresh });
                            const testMeta = await testTrimmed.metadata();
                            const reduction = ((originalMeta.width! - testMeta.width!) + (originalMeta.height! - testMeta.height!)) / (originalMeta.width! + originalMeta.height!);
                            
                            console.log(`[MOOD_SCALE_ITEM_DETAIL] ${filename} - Trim threshold ${thresh}: ${testMeta.width}x${testMeta.height} (reduction: ${(reduction*100).toFixed(1)}%)`);
                            
                            if (reduction > maxReduction && reduction > 0.02) { // At least 2% reduction
                                maxReduction = reduction;
                                bestTrimmed = testTrimmed;
                            }
                        } catch (e) {
                            console.log(`[MOOD_SCALE_ITEM_DETAIL] ${filename} - Trim threshold ${thresh} failed: ${e}`);
                        }
                    }
                    
                    if (maxReduction > 0) {
                        image = bestTrimmed;
                    }
                } catch (trimError) {
                    console.log(`[MOOD_SCALE_ITEM_DETAIL] Automatic trim failed for ${filename}, keeping original`);
                }
            }
        }
        
        // Handle transparency
        if (metadata.hasAlpha && opts.background.alpha === 1 && opts.detectBorders) {
            image = image.flatten({ background: opts.background });
        }

        // Get metadata again after potential trimming and flattening
        const currentMetadata = await image.metadata();
        const isSquareAfterOps = currentMetadata.width === currentMetadata.height;
        
        // Now resize the (potentially trimmed/flattened) image
        // Always use cover to ensure 800x800 output (as per smart_cropper logic)
        image = image.resize(800, 800, {
            fit: 'cover',
            withoutEnlargement: false
        });

        // Output as PNG
        const outputBuffer = await image.png().toBuffer();
        
        console.log(`[MOOD_SCALE_ITEM_SUCCESS] Successfully processed mood image: ${filename}`);
        return outputBuffer;
        
    } catch (error) {
        console.error(`[MOOD_SCALE_ITEM_ERROR] Error processing ${filename}:`, error);
        throw error;
    }
}

/**
 * Process multiple mood images
 */
export async function processAllMoodImages(
    images: Array<{ buffer: Buffer; filename: string }>,
    options: {
        detectBorders?: boolean;
        trimThreshold?: number;
        maintainAspectRatio?: boolean;
        outputFormat?: 'square' | 'original' | 'cover';
        background?: { r: number; g: number; b: number; alpha: number };
        batchSize?: number;
        progressCallback?: (progress: {
            total: number;
            processed: number;
            successful: number;
            failed: number;
            currentBatch: number;
            totalBatches: number;
            errors?: string[];
        }) => void;
    } = {}
): Promise<{
    results: Array<{ buffer: Buffer; filename: string; error?: string }>;
    summary: { total: number; success: number; failures: number; errors: string[] };
}> {
    const batchSize = options.batchSize || 5;
    const results: Array<{ buffer: Buffer; filename: string; error?: string }> = [];
    const errors: string[] = [];
    let successCount = 0;
    let failureCount = 0;
    
    const totalBatches = Math.ceil(images.length / batchSize);
    
    for (let i = 0; i < images.length; i += batchSize) {
        const batch = images.slice(i, i + batchSize);
        const currentBatch = Math.floor(i / batchSize) + 1;
        
        console.log(`[MOOD_BATCH] Processing batch ${currentBatch}/${totalBatches} (${batch.length} images)`);
        
        // Process batch in parallel
        const batchPromises = batch.map(async (image) => {
            try {
                const processedBuffer = await processMoodImage(
                    image.buffer,
                    image.filename,
                    options
                );
                
                return {
                    buffer: processedBuffer,
                    filename: image.filename.replace(/\.[^/.]+$/, '') + '.png' // Ensure .png extension
                };
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                console.error(`Failed to process ${image.filename}:`, errorMessage);
                return {
                    buffer: image.buffer,
                    filename: image.filename,
                    error: errorMessage
                };
            }
        });
        
        const batchResults = await Promise.all(batchPromises);
        
        // Update counts and collect results
        for (const result of batchResults) {
            results.push(result);
            if (result.error) {
                failureCount++;
                errors.push(`${result.filename}: ${result.error}`);
            } else {
                successCount++;
            }
        }
        
        // Call progress callback if provided
        if (options.progressCallback) {
            options.progressCallback({
                total: images.length,
                processed: results.length,
                successful: successCount,
                failed: failureCount,
                currentBatch,
                totalBatches,
                errors: errors.slice(-5) // Last 5 errors
            });
        }
    }
    
    return {
        results,
        summary: {
            total: images.length,
            success: successCount,
            failures: failureCount,
            errors
        }
    };
}