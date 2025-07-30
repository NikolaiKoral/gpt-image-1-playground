import Dexie, { type EntityTable } from 'dexie';

export interface ImageRecord {
    filename: string;
    blob: Blob;
    timestamp?: number;
    size?: number;
    compressed?: boolean;
}

export interface ImageMetadata {
    filename: string;
    timestamp: number;
    size: number;
    dimensions?: { width: number; height: number };
    compressed: boolean;
}

export class ImageDB extends Dexie {
    images!: EntityTable<ImageRecord, 'filename'>;
    metadata!: EntityTable<ImageMetadata, 'filename'>;

    constructor() {
        super('ImageDB');

        // Version 1: Original schema
        this.version(1).stores({
            images: '&filename'
        });

        // Version 2: Add metadata table and enhanced image schema
        this.version(2).stores({
            images: '&filename, timestamp, size',
            metadata: '&filename, timestamp'
        }).upgrade(tx => {
            // Migration logic for existing data
            return tx.table('images').toCollection().modify(record => {
                record.timestamp = record.timestamp || Date.now();
                record.size = record.blob?.size || 0;
                record.compressed = false;
            });
        });

        this.images = this.table('images');
        this.metadata = this.table('metadata');
    }

    /**
     * Add image with automatic metadata
     */
    async addImage(filename: string, blob: Blob, dimensions?: { width: number; height: number }): Promise<void> {
        const timestamp = Date.now();
        const size = blob.size;

        await this.transaction('rw', [this.images, this.metadata], async () => {
            await this.images.put({
                filename,
                blob,
                timestamp,
                size,
                compressed: false
            });

            await this.metadata.put({
                filename,
                timestamp,
                size,
                dimensions,
                compressed: false
            });
        });
    }

    /**
     * Clean up old images to prevent database bloat
     */
    async cleanupOldImages(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<number> {
        const cutoffTime = Date.now() - maxAge;
        
        const oldImages = await this.images
            .where('timestamp')
            .below(cutoffTime)
            .toArray();

        if (oldImages.length === 0) {
            return 0;
        }

        const filenames = oldImages.map(img => img.filename);

        await this.transaction('rw', [this.images, this.metadata], async () => {
            await this.images.where('filename').anyOf(filenames).delete();
            await this.metadata.where('filename').anyOf(filenames).delete();
        });

        return oldImages.length;
    }

    /**
     * Get database size statistics
     */
    async getStorageStats(): Promise<{
        totalImages: number;
        totalSize: number;
        averageSize: number;
        oldestImage?: number;
        newestImage?: number;
    }> {
        const images = await this.images.toArray();
        
        if (images.length === 0) {
            return {
                totalImages: 0,
                totalSize: 0,
                averageSize: 0
            };
        }

        const totalSize = images.reduce((sum, img) => sum + (img.size || 0), 0);
        const timestamps = images.map(img => img.timestamp || 0).filter(t => t > 0);

        return {
            totalImages: images.length,
            totalSize,
            averageSize: totalSize / images.length,
            oldestImage: timestamps.length > 0 ? Math.min(...timestamps) : undefined,
            newestImage: timestamps.length > 0 ? Math.max(...timestamps) : undefined
        };
    }

    /**
     * Batch delete with proper cleanup
     */
    async batchDelete(filenames: string[]): Promise<void> {
        if (filenames.length === 0) return;

        await this.transaction('rw', [this.images, this.metadata], async () => {
            await this.images.where('filename').anyOf(filenames).delete();
            await this.metadata.where('filename').anyOf(filenames).delete();
        });
    }
}

export const db = new ImageDB();

// Periodic cleanup
if (typeof window !== 'undefined') {
    // Clean up old images on page load
    db.ready(() => {
        db.cleanupOldImages().then(deletedCount => {
            if (deletedCount > 0) {
                console.log(`Cleaned up ${deletedCount} old images from IndexedDB`);
            }
        }).catch(console.error);
    });
}
