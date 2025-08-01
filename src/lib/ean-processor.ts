/**
 * EAN processing utilities for the rename tool
 */

/**
 * Removes leading zeros from an EAN code
 * Example: "0843251198986" -> "843251198986"
 */
export function removeLeadingZeros(ean: string): string {
    return ean.replace(/^0+/, '') || '0'; // Keep at least one zero if all zeros
}

/**
 * Validates if a string is a valid EAN (12 or 13 digits)
 */
export function isValidEAN(value: string): boolean {
    return /^\d{12,13}$/.test(value);
}

/**
 * Extracts EAN from filename using pattern matching
 * Returns null if no valid EAN found
 */
export function extractEANFromFilename(filename: string): {
    ean: string;
    number?: string;
    format: 'hyphen' | 'ean_only' | null;
} | null {
    // Remove extension for analysis
    const lastDotIndex = filename.lastIndexOf('.');
    const namePart = lastDotIndex > -1 ? filename.substring(0, lastDotIndex) : filename;
    
    // Check hyphen format: EAN-NUMBER (like 0630870296793-1)
    const hyphenMatch = namePart.match(/^(\d{12,13})-(\d+)$/);
    if (hyphenMatch) {
        return {
            ean: hyphenMatch[1],
            number: hyphenMatch[2],
            format: 'hyphen'
        };
    }
    
    // Check EAN-only format: just EAN (like 0843251198986)
    const eanOnlyMatch = namePart.match(/^(\d{12,13})$/);
    if (eanOnlyMatch) {
        return {
            ean: eanOnlyMatch[1],
            format: 'ean_only'
        };
    }
    
    return null;
}

/**
 * Processes a list of filenames for EAN renaming
 * Returns preview data for each file
 */
export function processFilesForPreview(
    filenames: string[],
    options: {
        removeLeadingZeros?: boolean;
        aiResults?: Array<{ ean: string | null; confidence: number }>;
    } = {}
): Array<{
    originalName: string;
    newName: string;
    ean: string | null;
    status: 'will_rename' | 'keep_original';
    extractionMethod: 'pattern' | 'ai';
    confidence?: number;
}> {
    const results: Array<{
        originalName: string;
        newName: string;
        ean: string | null;
        status: 'will_rename' | 'keep_original';
        extractionMethod: 'pattern' | 'ai';
        confidence?: number;
    }> = [];
    
    const eanCountMap = new Map<string, number>();
    
    filenames.forEach((filename, index) => {
        const extraction = extractEANFromFilename(filename);
        
        if (extraction) {
            // Pattern-based extraction
            let ean = extraction.ean;
            if (options.removeLeadingZeros) {
                ean = removeLeadingZeros(ean);
            }
            
            // Track EAN for sequential numbering
            if (extraction.format === 'hyphen' && extraction.number) {
                // For hyphen format, track the number to avoid conflicts
                const currentCount = parseInt(extraction.number) || 1;
                const existingCount = eanCountMap.get(ean) || 0;
                eanCountMap.set(ean, Math.max(existingCount, currentCount));
            }
            
            let newName = filename;
            if (extraction.format === 'hyphen') {
                newName = filename.replace(extraction.ean, ean);
            } else if (extraction.format === 'ean_only') {
                const extension = filename.substring(filename.lastIndexOf('.'));
                newName = `${ean}${extension}`;
            }
            
            results.push({
                originalName: filename,
                newName,
                ean,
                status: newName !== filename ? 'will_rename' : 'keep_original',
                extractionMethod: 'pattern'
            });
        } else if (options.aiResults && options.aiResults[index]) {
            // AI-based extraction
            const aiResult = options.aiResults[index];
            if (aiResult.ean && aiResult.confidence > 0.5) {
                let ean = aiResult.ean;
                if (options.removeLeadingZeros) {
                    ean = removeLeadingZeros(ean);
                }
                
                // Generate sequential number for this EAN
                const count = eanCountMap.get(ean) || 0;
                eanCountMap.set(ean, count + 1);
                const number = count + 1;
                
                const extension = filename.substring(filename.lastIndexOf('.'));
                const newName = `${ean}-${number}${extension}`;
                
                results.push({
                    originalName: filename,
                    newName,
                    ean,
                    status: 'will_rename',
                    extractionMethod: 'ai',
                    confidence: aiResult.confidence
                });
            } else {
                // No valid AI result
                results.push({
                    originalName: filename,
                    newName: filename,
                    ean: null,
                    status: 'keep_original',
                    extractionMethod: 'ai',
                    confidence: aiResult.confidence
                });
            }
        } else {
            // No extraction possible
            results.push({
                originalName: filename,
                newName: filename,
                ean: null,
                status: 'keep_original',
                extractionMethod: 'pattern'
            });
        }
    });
    
    return results;
}

/**
 * Processes uploaded files and renames them based on EAN
 * Returns a map of original filename to new filename
 */
export function processFilesForRename(
    files: Array<{ originalName: string; buffer: Buffer }>,
    options: {
        removeLeadingZeros?: boolean;
        aiResults?: Array<{ ean: string | null; confidence: number }>;
    } = {}
): Array<{
    originalName: string;
    newName: string;
    buffer: Buffer;
    ean: string | null;
    success: boolean;
}> {
    const filenames = files.map(f => f.originalName);
    const previews = processFilesForPreview(filenames, options);
    
    return files.map((file, index) => {
        const preview = previews[index];
        return {
            originalName: file.originalName,
            newName: preview.newName,
            buffer: file.buffer,
            ean: preview.ean,
            success: preview.status === 'will_rename'
        };
    });
}