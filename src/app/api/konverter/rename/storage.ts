// In-memory storage for rename tool
// Maps session ID to uploaded/processed files

interface UploadedFile {
    filename: string;
    buffer: Buffer;
    mimetype: string;
}

interface ProcessedFile {
    filename: string;
    buffer: Buffer;
    originalName: string;
}

// Temporary uploaded files (before processing)
export const uploadedFiles = new Map<string, UploadedFile>();

// Processed renamed files
export const processedRenameFiles = new Map<string, ProcessedFile>();

// Session management - simple timestamp-based session ID
export function createSessionId(): string {
    return `rename-${Date.now()}`;
}

// Cleanup old sessions (older than 1 hour)
export function cleanupOldSessions() {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    
    for (const [key] of uploadedFiles) {
        const timestamp = parseInt(key.split('-')[1]);
        if (timestamp < oneHourAgo) {
            uploadedFiles.delete(key);
        }
    }
    
    for (const [key] of processedRenameFiles) {
        const timestamp = parseInt(key.split('-')[1]);
        if (timestamp < oneHourAgo) {
            processedRenameFiles.delete(key);
        }
    }
}