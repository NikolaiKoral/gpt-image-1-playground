/**
 * Utility functions for image processing and encoding
 */

/**
 * Convert a File object to base64 string
 */
export async function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            } else {
                reject(new Error('Failed to convert file to base64'));
            }
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });
}

/**
 * Check if file is a supported image format for Gemini API
 */
export function isSupportedImageFormat(file: File): boolean {
    const supportedTypes = [
        'image/jpeg',
        'image/jpg', 
        'image/png',
        'image/webp',
        'image/gif'
    ];
    return supportedTypes.includes(file.type.toLowerCase());
}

/**
 * Get MIME type for Gemini API from File object
 */
export function getImageMimeType(file: File): string {
    // Normalize MIME type for Gemini API
    const mimeType = file.type.toLowerCase();
    
    // Gemini API expects specific MIME types
    switch (mimeType) {
        case 'image/jpg':
            return 'image/jpeg';
        case 'image/jpeg':
        case 'image/png':
        case 'image/webp':
        case 'image/gif':
            return mimeType;
        default:
            return 'image/jpeg'; // Default fallback
    }
}

/**
 * Validate image file for Gemini API requirements
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
    // Check if it's an image
    if (!isSupportedImageFormat(file)) {
        return {
            valid: false,
            error: 'Ikke-understøttet billedformat. Brug JPEG, PNG, WebP eller GIF.'
        };
    }

    // Check file size (Gemini API has limits for inline data - 20MB total request size)
    const maxSize = 10 * 1024 * 1024; // 10MB per image to be safe
    if (file.size > maxSize) {
        return {
            valid: false,
            error: 'Billedet er for stort. Maksimal størrelse er 10MB.'
        };
    }

    return { valid: true };
}

/**
 * Prepare image file for Gemini API transmission
 */
export async function prepareImageForGemini(file: File): Promise<{
    success: boolean;
    data?: {
        base64: string;
        mimeType: string;
    };
    error?: string;
}> {
    try {
        // Validate the file first
        const validation = validateImageFile(file);
        if (!validation.valid) {
            return {
                success: false,
                error: validation.error
            };
        }

        // Convert to base64
        const base64 = await fileToBase64(file);
        const mimeType = getImageMimeType(file);

        return {
            success: true,
            data: {
                base64,
                mimeType
            }
        };
    } catch (error) {
        return {
            success: false,
            error: 'Fejl ved behandling af billede: ' + (error instanceof Error ? error.message : 'Ukendt fejl')
        };
    }
}