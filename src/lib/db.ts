import Dexie, { type EntityTable } from 'dexie';
import type { VideoHistoryItem } from '@/types/video';

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

export interface VideoRecord {
    id: string;
    taskId: string;
    blob?: Blob;
    url?: string;
    timestamp: number;
    size?: number;
    locallyStored: boolean;
}

export interface VideoMetadata extends Omit<VideoHistoryItem, 'localVideoUrl'> {
    locallyStored: boolean;
}

export class ImageDB extends Dexie {
    images!: EntityTable<ImageRecord, 'filename'>;
    metadata!: EntityTable<ImageMetadata, 'filename'>;
    videos!: EntityTable<VideoRecord, 'id'>;
    videoMetadata!: EntityTable<VideoMetadata, 'id'>;

    constructor() {
        super('ImageDB');

        // Version 1: Original schema
        this.version(1).stores({
            images: '&filename'
        });

        // Version 2: Add metadata table and enhanced image schema
        this.version(2)
            .stores({
                images: '&filename, timestamp, size',
                metadata: '&filename, timestamp'
            })
            .upgrade((tx) => {
                // Migration logic for existing data
                return tx
                    .table('images')
                    .toCollection()
                    .modify((record) => {
                        record.timestamp = record.timestamp || Date.now();
                        record.size = record.blob?.size || 0;
                        record.compressed = false;
                    });
            });

        // Version 3: Add video tables
        this.version(3)
            .stores({
                images: '&filename, timestamp, size',
                metadata: '&filename, timestamp',
                videos: '&id, taskId, timestamp, locallyStored',
                videoMetadata: '&id, taskId, createdAt, status'
            });

        this.images = this.table('images');
        this.metadata = this.table('metadata');
        this.videos = this.table('videos');
        this.videoMetadata = this.table('videoMetadata');
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

        const oldImages = await this.images.where('timestamp').below(cutoffTime).toArray();

        if (oldImages.length === 0) {
            return 0;
        }

        const filenames = oldImages.map((img) => img.filename);

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
        const timestamps = images.map((img) => img.timestamp || 0).filter((t) => t > 0);

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

    /**
     * Add video with metadata
     */
    async addVideo(videoData: VideoHistoryItem, blob?: Blob): Promise<void> {
        const timestamp = Date.now();
        const locallyStored = !!blob;

        await this.transaction('rw', [this.videos, this.videoMetadata], async () => {
            await this.videos.put({
                id: videoData.id,
                taskId: videoData.taskId,
                blob,
                url: videoData.videoUrl,
                timestamp,
                size: blob?.size,
                locallyStored
            });

            await this.videoMetadata.put({
                ...videoData,
                locallyStored
            });
        });
    }

    /**
     * Get video by ID
     */
    async getVideo(id: string): Promise<{ metadata: VideoMetadata; record: VideoRecord } | null> {
        const [metadata, record] = await Promise.all([
            this.videoMetadata.get(id),
            this.videos.get(id)
        ]);

        if (!metadata || !record) return null;

        return { metadata, record };
    }

    /**
     * Get all videos sorted by creation date
     */
    async getAllVideos(): Promise<VideoMetadata[]> {
        return this.videoMetadata.orderBy('createdAt').reverse().toArray();
    }

    /**
     * Update video status
     */
    async updateVideoStatus(id: string, updates: Partial<VideoHistoryItem>): Promise<void> {
        await this.videoMetadata.update(id, updates);
    }

    /**
     * Store video blob locally
     */
    async storeVideoLocally(id: string, blob: Blob): Promise<void> {
        const timestamp = Date.now();

        await this.transaction('rw', [this.videos, this.videoMetadata], async () => {
            await this.videos.update(id, {
                blob,
                size: blob.size,
                timestamp,
                locallyStored: true
            });

            await this.videoMetadata.update(id, {
                locallyStored: true
            });
        });
    }

    /**
     * Clean up old videos
     */
    async cleanupOldVideos(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<number> {
        const cutoffTime = Date.now() - maxAge;

        const oldVideos = await this.videos.where('timestamp').below(cutoffTime).toArray();

        if (oldVideos.length === 0) {
            return 0;
        }

        const videoIds = oldVideos.map((video) => video.id);

        await this.transaction('rw', [this.videos, this.videoMetadata], async () => {
            await this.videos.where('id').anyOf(videoIds).delete();
            await this.videoMetadata.where('id').anyOf(videoIds).delete();
        });

        return oldVideos.length;
    }

    /**
     * Delete video
     */
    async deleteVideo(id: string): Promise<void> {
        await this.transaction('rw', [this.videos, this.videoMetadata], async () => {
            await this.videos.delete(id);
            await this.videoMetadata.delete(id);
        });
    }

    /**
     * Batch delete videos
     */
    async batchDeleteVideos(ids: string[]): Promise<void> {
        if (ids.length === 0) return;

        await this.transaction('rw', [this.videos, this.videoMetadata], async () => {
            await this.videos.where('id').anyOf(ids).delete();
            await this.videoMetadata.where('id').anyOf(ids).delete();
        });
    }

    /**
     * Get combined storage stats
     */
    async getCombinedStorageStats(): Promise<{
        images: {
            totalImages: number;
            totalSize: number;
            averageSize: number;
        };
        videos: {
            totalVideos: number;
            totalSize: number;
            averageSize: number;
            locallyStored: number;
        };
        combined: {
            totalSize: number;
            totalItems: number;
        };
    }> {
        const [imageStats, videos] = await Promise.all([
            this.getStorageStats(),
            this.videos.toArray()
        ]);

        const videoTotalSize = videos.reduce((sum, video) => sum + (video.size || 0), 0);
        const locallyStoredVideos = videos.filter(video => video.locallyStored).length;

        return {
            images: imageStats,
            videos: {
                totalVideos: videos.length,
                totalSize: videoTotalSize,
                averageSize: videos.length > 0 ? videoTotalSize / videos.length : 0,
                locallyStored: locallyStoredVideos
            },
            combined: {
                totalSize: imageStats.totalSize + videoTotalSize,
                totalItems: imageStats.totalImages + videos.length
            }
        };
    }
}

export const db = new ImageDB();

// Periodic cleanup
if (typeof window !== 'undefined') {
    // Clean up old images and videos on page load
    db.open()
        .then(async () => {
            const [deletedImages, deletedVideos] = await Promise.all([
                db.cleanupOldImages(),
                db.cleanupOldVideos()
            ]);
            
            if (deletedImages > 0) {
                console.log(`Cleaned up ${deletedImages} old images from IndexedDB`);
            }
            if (deletedVideos > 0) {
                console.log(`Cleaned up ${deletedVideos} old videos from IndexedDB`);
            }
        })
        .catch(console.error);
}
