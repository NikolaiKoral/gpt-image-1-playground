/**
 * Centralized blob URL management to prevent memory leaks
 */
class BlobManager {
    private static instance: BlobManager;
    private blobUrls = new Map<string, string>();
    private maxUrls = 100; // Prevent unlimited growth

    static getInstance(): BlobManager {
        if (!BlobManager.instance) {
            BlobManager.instance = new BlobManager();
        }
        return BlobManager.instance;
    }

    createUrl(blob: Blob, key: string): string {
        // Clean up oldest URLs if at limit
        if (this.blobUrls.size >= this.maxUrls) {
            const oldestKey = this.blobUrls.keys().next().value;
            this.revokeUrl(oldestKey);
        }

        // Revoke existing URL for key if exists
        if (this.blobUrls.has(key)) {
            this.revokeUrl(key);
        }

        const url = URL.createObjectURL(blob);
        this.blobUrls.set(key, url);
        return url;
    }

    revokeUrl(key: string): boolean {
        const url = this.blobUrls.get(key);
        if (url) {
            URL.revokeObjectURL(url);
            this.blobUrls.delete(key);
            return true;
        }
        return false;
    }

    revokeAll(): void {
        for (const url of this.blobUrls.values()) {
            URL.revokeObjectURL(url);
        }
        this.blobUrls.clear();
    }

    getUrl(key: string): string | undefined {
        return this.blobUrls.get(key);
    }

    cleanup(): void {
        this.revokeAll();
    }
}

export const blobManager = BlobManager.getInstance();

// Cleanup on page unload
if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
        blobManager.cleanup();
    });
}