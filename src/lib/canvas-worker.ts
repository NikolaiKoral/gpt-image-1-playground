/**
 * Web Worker for heavy canvas operations to prevent UI blocking
 */

interface WorkerMessage {
    type: 'GENERATE_MASK' | 'COMPRESS_IMAGE' | 'RESIZE_IMAGE';
    payload: any;
    id: string;
}

interface WorkerResponse {
    type: 'SUCCESS' | 'ERROR';
    payload: any;
    id: string;
}

// Type guard for worker messages
function isWorkerMessage(data: any): data is WorkerMessage {
    return data && typeof data.type === 'string' && typeof data.id === 'string';
}

// Canvas operations in worker context
class CanvasWorker {
    private canvas: OffscreenCanvas | null = null;
    private ctx: OffscreenCanvasRenderingContext2D | null = null;

    private ensureCanvas(width: number, height: number): OffscreenCanvasRenderingContext2D {
        if (!this.canvas || this.canvas.width !== width || this.canvas.height !== height) {
            this.canvas = new OffscreenCanvas(width, height);
            this.ctx = this.canvas.getContext('2d');
        }

        if (!this.ctx) {
            throw new Error('Failed to get canvas context');
        }

        return this.ctx;
    }

    async generateMask(
        points: Array<{ x: number; y: number; size: number }>,
        width: number,
        height: number
    ): Promise<Blob> {
        const ctx = this.ensureCanvas(width, height);

        // Clear canvas and set up mask
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, width, height);
        ctx.globalCompositeOperation = 'destination-out';

        // Draw all points
        points.forEach((point) => {
            ctx.fillStyle = 'white'; // Will be transparent due to composite operation
            ctx.beginPath();
            ctx.arc(point.x, point.y, point.size, 0, Math.PI * 2);
            ctx.fill();
        });

        // Convert to blob
        const blob = await this.canvas!.convertToBlob({ type: 'image/png' });
        return blob;
    }

    async compressImage(imageData: ImageData, quality: number = 0.8): Promise<Blob> {
        const ctx = this.ensureCanvas(imageData.width, imageData.height);

        // Put image data on canvas
        ctx.putImageData(imageData, 0, 0);

        // Convert to blob with compression
        const blob = await this.canvas!.convertToBlob({
            type: 'image/jpeg',
            quality
        });

        return blob;
    }

    async resizeImage(imageData: ImageData, newWidth: number, newHeight: number): Promise<ImageData> {
        const sourceCtx = this.ensureCanvas(imageData.width, imageData.height);
        sourceCtx.putImageData(imageData, 0, 0);

        // Create target canvas
        const targetCanvas = new OffscreenCanvas(newWidth, newHeight);
        const targetCtx = targetCanvas.getContext('2d')!;

        // Use high-quality scaling
        targetCtx.imageSmoothingEnabled = true;
        targetCtx.imageSmoothingQuality = 'high';

        // Draw scaled image
        targetCtx.drawImage(this.canvas!, 0, 0, newWidth, newHeight);

        return targetCtx.getImageData(0, 0, newWidth, newHeight);
    }
}

// Worker instance
const canvasWorker = new CanvasWorker();

// Message handler
self.onmessage = async (event: MessageEvent) => {
    const message = event.data;

    if (!isWorkerMessage(message)) {
        return;
    }

    try {
        let result: any;

        switch (message.type) {
            case 'GENERATE_MASK':
                result = await canvasWorker.generateMask(
                    message.payload.points,
                    message.payload.width,
                    message.payload.height
                );
                break;

            case 'COMPRESS_IMAGE':
                result = await canvasWorker.compressImage(message.payload.imageData, message.payload.quality);
                break;

            case 'RESIZE_IMAGE':
                result = await canvasWorker.resizeImage(
                    message.payload.imageData,
                    message.payload.newWidth,
                    message.payload.newHeight
                );
                break;

            default:
                throw new Error(`Unknown message type: ${message.type}`);
        }

        const response: WorkerResponse = {
            type: 'SUCCESS',
            payload: result,
            id: message.id
        };

        self.postMessage(response);
    } catch (error) {
        const response: WorkerResponse = {
            type: 'ERROR',
            payload: error instanceof Error ? error.message : String(error),
            id: message.id
        };

        self.postMessage(response);
    }
};

export {}; // Make this a module
