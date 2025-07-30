'use client';

import { useRef, useCallback, useEffect } from 'react';

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

export function useCanvasWorker() {
    const workerRef = useRef<Worker | null>(null);
    const pendingOperations = useRef<
        Map<
            string,
            {
                resolve: (value: any) => void;
                reject: (error: Error) => void;
            }
        >
    >(new Map());

    // Initialize worker
    useEffect(() => {
        if (typeof window !== 'undefined' && 'Worker' in window && 'OffscreenCanvas' in window) {
            try {
                workerRef.current = new Worker(new URL('../lib/canvas-worker.ts', import.meta.url));

                workerRef.current.onmessage = (event: MessageEvent<WorkerResponse>) => {
                    const response = event.data;
                    const operation = pendingOperations.current.get(response.id);

                    if (operation) {
                        pendingOperations.current.delete(response.id);

                        if (response.type === 'SUCCESS') {
                            operation.resolve(response.payload);
                        } else {
                            operation.reject(new Error(response.payload));
                        }
                    }
                };

                workerRef.current.onerror = (error) => {
                    console.error('Canvas worker error:', error);
                };
            } catch (error) {
                console.warn('Failed to initialize canvas worker:', error);
            }
        }

        return () => {
            if (workerRef.current) {
                workerRef.current.terminate();
                workerRef.current = null;
            }
        };
    }, []);

    // Send message to worker with promise-based API
    const sendMessage = useCallback((message: Omit<WorkerMessage, 'id'>): Promise<any> => {
        return new Promise((resolve, reject) => {
            if (!workerRef.current) {
                reject(new Error('Canvas worker not available'));
                return;
            }

            const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const fullMessage: WorkerMessage = { ...message, id };

            pendingOperations.current.set(id, { resolve, reject });

            // Set timeout for operations
            setTimeout(() => {
                const operation = pendingOperations.current.get(id);
                if (operation) {
                    pendingOperations.current.delete(id);
                    operation.reject(new Error('Canvas operation timeout'));
                }
            }, 30000); // 30 second timeout

            workerRef.current.postMessage(fullMessage);
        });
    }, []);

    // Generate mask using worker
    const generateMask = useCallback(
        async (points: Array<{ x: number; y: number; size: number }>, width: number, height: number): Promise<Blob> => {
            try {
                return await sendMessage({
                    type: 'GENERATE_MASK',
                    payload: { points, width, height }
                });
            } catch (error) {
                // Fallback to main thread if worker fails
                console.warn('Worker mask generation failed, falling back to main thread:', error);
                return generateMaskMainThread(points, width, height);
            }
        },
        [sendMessage]
    );

    // Compress image using worker
    const compressImage = useCallback(
        async (imageData: ImageData, quality: number = 0.8): Promise<Blob> => {
            try {
                return await sendMessage({
                    type: 'COMPRESS_IMAGE',
                    payload: { imageData, quality }
                });
            } catch (error) {
                console.warn('Worker image compression failed:', error);
                throw error;
            }
        },
        [sendMessage]
    );

    // Resize image using worker
    const resizeImage = useCallback(
        async (imageData: ImageData, newWidth: number, newHeight: number): Promise<ImageData> => {
            try {
                return await sendMessage({
                    type: 'RESIZE_IMAGE',
                    payload: { imageData, newWidth, newHeight }
                });
            } catch (error) {
                console.warn('Worker image resize failed:', error);
                throw error;
            }
        },
        [sendMessage]
    );

    // Check if worker is available
    const isWorkerAvailable = workerRef.current !== null;

    return {
        generateMask,
        compressImage,
        resizeImage,
        isWorkerAvailable
    };
}

// Fallback function for mask generation on main thread
function generateMaskMainThread(
    points: Array<{ x: number; y: number; size: number }>,
    width: number,
    height: number
): Promise<Blob> {
    return new Promise((resolve, reject) => {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                reject(new Error('Failed to get canvas context'));
                return;
            }

            // Set up mask
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, width, height);
            ctx.globalCompositeOperation = 'destination-out';

            // Draw all points
            points.forEach((point) => {
                ctx.fillStyle = 'white';
                ctx.beginPath();
                ctx.arc(point.x, point.y, point.size, 0, Math.PI * 2);
                ctx.fill();
            });

            canvas.toBlob((blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Failed to generate mask blob'));
                }
            }, 'image/png');
        } catch (error) {
            reject(error);
        }
    });
}
