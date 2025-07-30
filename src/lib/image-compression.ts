/**
 * Image compression utilities to reduce memory usage and upload times
 */

export interface CompressionOptions {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    format?: 'jpeg' | 'png' | 'webp';
}

export class ImageCompressor {
    private static canvas: HTMLCanvasElement | null = null;
    private static ctx: CanvasRenderingContext2D | null = null;

    private static getCanvas(): HTMLCanvasElement {
        if (!this.canvas) {
            this.canvas = document.createElement('canvas');
            this.ctx = this.canvas.getContext('2d');
        }
        return this.canvas;
    }

    /**
     * Compress an image file for optimal processing
     */
    static async compressImage(file: File, options: CompressionOptions = {}): Promise<File> {
        const { maxWidth = 2048, maxHeight = 2048, quality = 0.8, format = 'jpeg' } = options;

        return new Promise((resolve, reject) => {
            const img = new Image();

            img.onload = () => {
                try {
                    const canvas = this.getCanvas();
                    const ctx = this.ctx!;

                    // Calculate new dimensions
                    let { width, height } = img;

                    if (width > maxWidth || height > maxHeight) {
                        const ratio = Math.max(width / maxWidth, height / maxHeight);
                        width = Math.floor(width / ratio);
                        height = Math.floor(height / ratio);
                    }

                    canvas.width = width;
                    canvas.height = height;

                    // Clear and draw
                    ctx.clearRect(0, 0, width, height);
                    ctx.drawImage(img, 0, 0, width, height);

                    // Convert to blob
                    canvas.toBlob(
                        (blob) => {
                            if (blob) {
                                const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, `.${format}`), {
                                    type: `image/${format}`
                                });
                                resolve(compressedFile);
                            } else {
                                reject(new Error('Compression failed'));
                            }
                        },
                        `image/${format}`,
                        quality
                    );

                    // Cleanup
                    URL.revokeObjectURL(img.src);
                } catch (error) {
                    reject(error);
                }
            };

            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = URL.createObjectURL(file);
        });
    }

    /**
     * Get image dimensions without loading full image
     */
    static getImageDimensions(file: File): Promise<{ width: number; height: number }> {
        return new Promise((resolve, reject) => {
            const img = new Image();

            img.onload = () => {
                resolve({ width: img.width, height: img.height });
                URL.revokeObjectURL(img.src);
            };

            img.onerror = () => {
                URL.revokeObjectURL(img.src);
                reject(new Error('Failed to load image'));
            };

            img.src = URL.createObjectURL(file);
        });
    }

    /**
     * Create thumbnail for preview
     */
    static async createThumbnail(file: File, size: number = 150): Promise<string> {
        const compressed = await this.compressImage(file, {
            maxWidth: size,
            maxHeight: size,
            quality: 0.7,
            format: 'jpeg'
        });

        return URL.createObjectURL(compressed);
    }
}
