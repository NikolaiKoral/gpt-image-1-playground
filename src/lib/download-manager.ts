export interface DownloadableImage {
    filename: string;
    url: string;
    presetName?: string;
    timestamp: number;
}

export interface DownloadOptions {
    format: 'individual' | 'zip';
    includeMetadata: boolean;
    namingPattern: 'original' | 'timestamp' | 'preset';
}

/**
 * Downloads a single image file
 */
export async function downloadSingleImage(
    image: DownloadableImage,
    options: Partial<DownloadOptions> = {}
): Promise<void> {
    try {
        const response = await fetch(image.url);
        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.statusText}`);
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = generateFilename(image, options.namingPattern || 'original');

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error downloading image:', error);
        throw error;
    }
}

/**
 * Downloads multiple images as individual files
 */
export async function downloadMultipleImages(
    images: DownloadableImage[],
    options: Partial<DownloadOptions> = {}
): Promise<void> {
    const downloadPromises = images.map((image) => downloadSingleImage(image, options));

    try {
        await Promise.all(downloadPromises);
    } catch (error) {
        console.error('Error downloading multiple images:', error);
        throw error;
    }
}

/**
 * Downloads multiple images as a ZIP file (requires JSZip)
 */
export async function downloadImagesAsZip(
    images: DownloadableImage[],
    options: Partial<DownloadOptions> = {}
): Promise<void> {
    try {
        // Dynamic import to avoid bundling JSZip if not used
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();

        // Add metadata file if requested
        if (options.includeMetadata) {
            const metadata = {
                exportDate: new Date().toISOString(),
                images: images.map((img) => ({
                    filename: img.filename,
                    presetName: img.presetName,
                    timestamp: img.timestamp,
                    generatedAt: new Date(img.timestamp).toISOString()
                }))
            };
            zip.file('metadata.json', JSON.stringify(metadata, null, 2));
        }

        // Add images to zip
        const imagePromises = images.map(async (image, index) => {
            try {
                const response = await fetch(image.url);
                if (!response.ok) {
                    throw new Error(`Failed to fetch ${image.filename}: ${response.statusText}`);
                }

                const blob = await response.blob();
                const filename = generateFilename(image, options.namingPattern || 'original');
                zip.file(filename, blob);
            } catch (error) {
                console.error(`Error adding image ${image.filename} to zip:`, error);
                // Add error info to zip instead of failing completely
                zip.file(`error_${index}.txt`, `Failed to download ${image.filename}: ${error}`);
            }
        });

        await Promise.all(imagePromises);

        // Generate and download zip
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(zipBlob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `moodboard_images_${new Date().toISOString().split('T')[0]}.zip`;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error creating ZIP file:', error);
        // Fallback to individual downloads
        await downloadMultipleImages(images, options);
    }
}

/**
 * Generates a filename based on the naming pattern
 */
function generateFilename(image: DownloadableImage, pattern: string): string {
    const extension = getFileExtension(image.filename);
    const baseDate = new Date(image.timestamp);

    switch (pattern) {
        case 'timestamp':
            return `image_${baseDate.toISOString().replace(/[:.]/g, '-')}${extension}`;

        case 'preset':
            const presetName = image.presetName ? image.presetName.toLowerCase().replace(/\s+/g, '-') : 'no-preset';
            return `${presetName}_${baseDate.getTime()}${extension}`;

        case 'original':
        default:
            return image.filename;
    }
}

/**
 * Extracts file extension from filename
 */
function getFileExtension(filename: string): string {
    const match = filename.match(/\.[^.]+$/);
    return match ? match[0] : '.png';
}

/**
 * Estimates download size for multiple images
 */
export async function estimateDownloadSize(images: DownloadableImage[]): Promise<number> {
    try {
        const sizePromises = images.map(async (image) => {
            try {
                const response = await fetch(image.url, { method: 'HEAD' });
                const contentLength = response.headers.get('content-length');
                return contentLength ? parseInt(contentLength, 10) : 0;
            } catch {
                return 0; // If we can't get size, assume 0
            }
        });

        const sizes = await Promise.all(sizePromises);
        return sizes.reduce((total, size) => total + size, 0);
    } catch (error) {
        console.error('Error estimating download size:', error);
        return 0;
    }
}

/**
 * Formats bytes to human readable string
 */
export function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Main download function that handles different options
 */
export async function downloadImages(
    images: DownloadableImage[],
    options: DownloadOptions = {
        format: 'individual',
        includeMetadata: false,
        namingPattern: 'original'
    }
): Promise<void> {
    if (images.length === 0) {
        throw new Error('No images to download');
    }

    if (images.length === 1) {
        return downloadSingleImage(images[0], options);
    }

    if (options.format === 'zip') {
        return downloadImagesAsZip(images, options);
    } else {
        return downloadMultipleImages(images, options);
    }
}
