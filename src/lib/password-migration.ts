import crypto from 'crypto';
import { hashPassword, verifyPassword } from './auth';

// Legacy SHA-256 hashing for backward compatibility
export function sha256(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
}

// Store hashed passwords in memory (in production, use a database)
let storedPasswordHash: string | null = null;

// Initialize password hash on startup
export async function initializePasswordHash() {
    if (!process.env.APP_PASSWORD) {
        return;
    }

    // Check if we have a stored bcrypt hash
    if (storedPasswordHash && !storedPasswordHash.match(/^[a-f0-9]{64}$/i)) {
        // Already using bcrypt
        return;
    }

    // Hash the password with bcrypt
    storedPasswordHash = await hashPassword(process.env.APP_PASSWORD);
}

// Verify password with automatic migration
export async function verifyPasswordWithMigration(clientPasswordHash: string): Promise<boolean> {
    if (!process.env.APP_PASSWORD) {
        return true; // No password required
    }

    // Initialize if needed
    if (!storedPasswordHash) {
        await initializePasswordHash();
    }

    // Legacy SHA-256 verification
    const serverSha256Hash = sha256(process.env.APP_PASSWORD);
    
    if (clientPasswordHash === serverSha256Hash) {
        // Client is using SHA-256, but we should migrate to bcrypt
        return true;
    }

    // Try bcrypt verification if we have a stored hash
    if (storedPasswordHash) {
        try {
            // Client might be sending a bcrypt token
            return await verifyPassword(clientPasswordHash, storedPasswordHash);
        } catch {
            // Not a valid bcrypt comparison
        }
    }

    return false;
}