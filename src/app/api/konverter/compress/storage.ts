// In-memory storage for compressor tool

interface CompressedFile {
    filename: string;
    buffer: Buffer;
    originalName: string;
    originalSize: number;
    compressedSize: number;
}

// Compressed files storage
export const compressedFiles = new Map<string, CompressedFile>();

// Generate unique key for compressed file
export function generateFileKey(): string {
    return `compress-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Cleanup old files (older than 1 hour)
export function cleanupOldFiles() {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    
    for (const [key] of compressedFiles) {
        const timestamp = parseInt(key.split('-')[1]);
        if (timestamp < oneHourAgo) {
            compressedFiles.delete(key);
        }
    }
}