'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { blobManager } from '@/lib/blob-manager';
import { ImageCompressor } from '@/lib/image-compression';

interface ImageFile {
    file: File;
    previewUrl: string;
    id: string;
    compressed?: boolean;
}

interface UseOptimizedImagesOptions {
    maxImages?: number;
    autoCompress?: boolean;
    compressionOptions?: {
        maxWidth?: number;
        maxHeight?: number;
        quality?: number;
    };
}

export function useOptimizedImages(options: UseOptimizedImagesOptions = {}) {
    const {
        maxImages = 10,
        autoCompress = true,
        compressionOptions = {
            maxWidth: 2048,
            maxHeight: 2048,
            quality: 0.8
        }
    } = options;

    const [images, setImages] = useState<ImageFile[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const processingQueue = useRef<File[]>([]);
    const isProcessingRef = useRef(false);

    // Process queue of images for compression
    const processQueue = useCallback(async () => {
        if (isProcessingRef.current || processingQueue.current.length === 0) {
            return;
        }

        isProcessingRef.current = true;
        setIsProcessing(true);

        while (processingQueue.current.length > 0) {
            const file = processingQueue.current.shift()!;
            
            try {
                let finalFile = file;
                let compressed = false;

                // Compress if needed and enabled
                if (autoCompress && file.size > 1024 * 1024) { // > 1MB
                    try {
                        finalFile = await ImageCompressor.compressImage(file, compressionOptions);
                        compressed = true;
                        console.log(`Compressed ${file.name}: ${file.size} → ${finalFile.size} bytes`);
                    } catch (error) {
                        console.warn(`Failed to compress ${file.name}:`, error);
                        // Use original file if compression fails
                    }
                }

                // Create optimized preview URL
                const previewUrl = blobManager.createUrl(finalFile, `${file.name}-${Date.now()}`);
                
                const imageFile: ImageFile = {
                    file: finalFile,
                    previewUrl,
                    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    compressed
                };

                setImages(prev => {
                    // Check if we're at max capacity
                    if (prev.length >= maxImages) {
                        return prev;
                    }
                    return [...prev, imageFile];
                });

            } catch (error) {
                console.error(`Error processing image ${file.name}:`, error);
            }
        }

        isProcessingRef.current = false;
        setIsProcessing(false);
    }, [autoCompress, compressionOptions, maxImages]);

    // Add images to processing queue
    const addImages = useCallback((newFiles: File[]) => {
        const availableSlots = maxImages - images.length;
        const filesToAdd = newFiles.slice(0, availableSlots);
        
        processingQueue.current.push(...filesToAdd);
        processQueue();
    }, [images.length, maxImages, processQueue]);

    // Remove image with proper cleanup
    const removeImage = useCallback((indexToRemove: number) => {
        setImages(prev => {
            const imageToRemove = prev[indexToRemove];
            if (imageToRemove?.previewUrl) {
                blobManager.revokeUrl(imageToRemove.id);
            }
            return prev.filter((_, index) => index !== indexToRemove);
        });
    }, []);

    // Move image position
    const moveImage = useCallback((fromIndex: number, toIndex: number) => {
        if (fromIndex === toIndex) return;
        
        setImages(prev => {
            const newImages = [...prev];
            const [movedImage] = newImages.splice(fromIndex, 1);
            newImages.splice(toIndex, 0, movedImage);
            return newImages;
        });
    }, []);

    // Clear all images
    const clearImages = useCallback(() => {
        // Cleanup all blob URLs
        images.forEach(image => {
            if (image.previewUrl) {
                blobManager.revokeUrl(image.id);
            }
        });
        
        setImages([]);
        processingQueue.current = [];
    }, [images]);

    // Get total size of all images
    const getTotalSize = useCallback(() => {
        return images.reduce((total, image) => total + image.file.size, 0);
    }, [images]);

    // Get compression statistics
    const getCompressionStats = useCallback(() => {
        const compressed = images.filter(img => img.compressed).length;
        return {
            totalImages: images.length,
            compressedImages: compressed,
            compressionRate: images.length > 0 ? (compressed / images.length) * 100 : 0,
            totalSize: getTotalSize()
        };
    }, [images, getTotalSize]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            clearImages();
        };
    }, [clearImages]);

    return {
        images,
        isProcessing,
        addImages,
        removeImage,
        moveImage,
        clearImages,
        getTotalSize,
        getCompressionStats,
        canAddMore: images.length < maxImages,
        availableSlots: maxImages - images.length
    };
}