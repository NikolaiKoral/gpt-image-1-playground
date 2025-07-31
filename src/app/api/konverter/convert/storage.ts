// In-memory storage for converter tool

interface ConvertedFile {
    filename: string;
    buffer: Buffer;
    originalName: string;
    outputFormat: string;
}

// Converted files storage
export const convertedFiles = new Map<string, ConvertedFile>();

// Generate unique key for converted file
export function generateFileKey(): string {
    return `convert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Cleanup old files (older than 1 hour)
export function cleanupOldFiles() {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    
    for (const [key] of convertedFiles) {
        const timestamp = parseInt(key.split('-')[1]);
        if (timestamp < oneHourAgo) {
            convertedFiles.delete(key);
        }
    }
}