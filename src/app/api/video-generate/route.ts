import { NextRequest, NextResponse } from 'next/server';
import { createVideoGeneration, validateVideoRequest, createPromptImages } from '@/lib/runway-client';
import type { VideoGenerationRequest, ImageSource } from '@/types/video';
import { verifyPasswordWithMigration, initializePasswordHash } from '@/lib/password-migration';
import { withAuthAndRateLimit } from '@/middleware/rate-limit';

// Initialize password hash on module load
initializePasswordHash().catch(console.error);

export const POST = withAuthAndRateLimit(async (request: NextRequest) => {
    console.log('Received POST request to /api/video-generate');

    if (!process.env.RUNWAYML_API_SECRET) {
        console.error('RUNWAYML_API_SECRET is not set.');
        return NextResponse.json({ error: 'Server configuration error: Runway API key not found.' }, { status: 500 });
    }

    try {
        const formData = await request.formData();

        // Parse form data
        const promptText = formData.get('promptText') as string;
        const model = (formData.get('model') as string) || 'gen4_turbo';
        const ratio = formData.get('ratio') as string;
        const duration = parseInt(formData.get('duration') as string);
        const seedStr = formData.get('seed') as string;
        const seed = seedStr ? parseInt(seedStr) : undefined;
        const publicFigureThreshold = (formData.get('publicFigureThreshold') as string) || 'auto';

        console.log('Video generation parameters:', {
            promptText: promptText?.substring(0, 100) + '...',
            model,
            ratio,
            duration,
            seed,
            publicFigureThreshold
        });

        if (!promptText || !ratio) {
            return NextResponse.json({ error: 'Missing required parameters: promptText and ratio' }, { status: 400 });
        }

        // Handle image sources
        const imageSources: ImageSource[] = [];
        
        // Check for uploaded files
        const uploadedFiles: File[] = [];
        for (const [key, value] of formData.entries()) {
            if (key.startsWith('image_') && value instanceof File) {
                uploadedFiles.push(value);
            }
        }

        // Check for existing image URLs
        const imageUrls = formData.get('imageUrls') as string;
        const imagePositions = formData.get('imagePositions') as string;
        
        if (imageUrls) {
            const urls = JSON.parse(imageUrls);
            const positions = imagePositions ? JSON.parse(imagePositions) : [];
            
            console.log('Received image URLs from client:', urls);
            
            urls.forEach((url: string, index: number) => {
                imageSources.push({
                    type: 'generated',
                    url,
                    position: positions[index] || 'first',
                    id: `existing-${index}`
                });
            });
        }

        // Process uploaded files
        uploadedFiles.forEach((file, index) => {
            imageSources.push({
                type: 'uploaded',
                file,
                position: 'first', // Default position for uploaded files
                id: `uploaded-${index}`
            });
        });

        if (imageSources.length === 0) {
            return NextResponse.json({ error: 'No images provided for video generation' }, { status: 400 });
        }

        // Helper function to convert URLs to data URIs
        const convertToDataUri = async (url: string): Promise<string> => {
            // If it's already a data URI, return as-is
            if (url.startsWith('data:')) {
                return url;
            }
            
            // If it's a blob URL, we can't use it
            if (url.startsWith('blob:')) {
                console.warn('Cannot use blob URLs with Runway API:', url);
                throw new Error('Blob URLs are not supported');
            }
            
            try {
                // For API image URLs, fetch the image and convert to data URI
                if (url.startsWith('/api/image/')) {
                    const filename = url.split('/').pop();
                    if (!filename) {
                        throw new Error('Invalid image URL format');
                    }
                    
                    const storageMode = process.env.NEXT_PUBLIC_IMAGE_STORAGE_MODE === 'indexeddb' ? 'indexeddb' : 'fs';
                    
                    if (storageMode === 'indexeddb') {
                        // Fetch from IndexedDB
                        const { db } = await import('@/lib/db');
                        const imageRecord = await db.images.get(filename);
                        
                        if (!imageRecord || !imageRecord.blob) {
                            throw new Error('Image not found in IndexedDB');
                        }
                        
                        // Convert blob to data URI
                        const arrayBuffer = await imageRecord.blob.arrayBuffer();
                        const base64 = Buffer.from(arrayBuffer).toString('base64');
                        const mimeType = imageRecord.blob.type || 'image/png';
                        return `data:${mimeType};base64,${base64}`;
                    } else {
                        // Fetch from filesystem
                        const fs = await import('fs/promises');
                        const path = await import('path');
                        const imageBaseDir = path.resolve(process.cwd(), 'generated-images');
                        const filepath = path.join(imageBaseDir, filename);
                        
                        const fileBuffer = await fs.readFile(filepath);
                        const base64 = fileBuffer.toString('base64');
                        
                        // Detect MIME type from extension
                        const ext = path.extname(filename).toLowerCase();
                        let mimeType = 'image/png';
                        if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
                        else if (ext === '.webp') mimeType = 'image/webp';
                        else if (ext === '.gif') mimeType = 'image/gif';
                        
                        return `data:${mimeType};base64,${base64}`;
                    }
                }
                
                throw new Error('Unsupported URL format');
            } catch (error) {
                console.error('Error converting URL to data URI:', error);
                throw error;
            }
        };

        // Prepare images for Runway API
        let promptImage: string | Array<{ uri: string; position: 'first' | 'last' }>;

        if (imageSources.length === 1) {
            const source = imageSources[0];
            if (source.url) {
                try {
                    promptImage = await convertToDataUri(source.url);
                } catch (error) {
                    console.error('Error converting URL to data URI:', error);
                    return NextResponse.json({ error: 'Failed to process image: ' + error.message }, { status: 400 });
                }
            } else if (source.file) {
                // Convert file to data URI
                const buffer = Buffer.from(await source.file.arrayBuffer());
                const base64 = buffer.toString('base64');
                const mimeType = source.file.type;
                promptImage = `data:${mimeType};base64,${base64}`;
            } else {
                return NextResponse.json({ error: 'Invalid image source' }, { status: 400 });
            }
        } else {
            // Multiple images - create prompt image objects
            const promptImages = [];
            
            for (const source of imageSources) {
                let uri: string;
                
                if (source.url) {
                    try {
                        uri = await convertToDataUri(source.url);
                    } catch (error) {
                        console.error('Error converting URL to data URI:', error);
                        continue;
                    }
                } else if (source.file) {
                    const buffer = Buffer.from(await source.file.arrayBuffer());
                    const base64 = buffer.toString('base64');
                    const mimeType = source.file.type;
                    uri = `data:${mimeType};base64,${base64}`;
                } else {
                    continue;
                }
                
                promptImages.push({
                    uri,
                    position: source.position
                });
            }
            
            if (promptImages.length === 0) {
                return NextResponse.json({ error: 'No valid images could be processed' }, { status: 400 });
            }
            
            promptImage = promptImages;
        }

        // Log the final promptImage for debugging
        console.log('Final promptImage being sent to Runway:', JSON.stringify(promptImage, null, 2));

        // Create video generation request
        const videoRequest: VideoGenerationRequest = {
            promptImage,
            promptText,
            model: model as 'gen4_turbo',
            ratio,
            duration,
            seed,
            contentModeration: {
                publicFigureThreshold: publicFigureThreshold as 'auto' | 'low'
            }
        };

        // Validate request
        const validation = validateVideoRequest(videoRequest);
        if (!validation.valid) {
            return NextResponse.json({ 
                error: 'Invalid video generation request', 
                details: validation.errors 
            }, { status: 400 });
        }

        // Create video generation task
        const task = await createVideoGeneration(videoRequest);
        
        console.log('Video generation task created successfully:', task.id);

        return NextResponse.json({
            taskId: task.id,
            estimatedCost,
            status: 'PENDING',
            message: 'Video generation started'
        });

    } catch (error: unknown) {
        console.error('Error in /api/video-generate:', error);

        let errorMessage = 'An unexpected error occurred.';
        let status = 500;

        if (error instanceof Error) {
            errorMessage = error.message;
            
            // Handle specific error types
            if (error.message.includes('API key')) {
                status = 401;
            } else if (error.message.includes('rate limit')) {
                status = 429;
            } else if (error.message.includes('Invalid')) {
                status = 400;
            }
        }

        return NextResponse.json({ error: errorMessage }, { status });
    }
}, 'videoGeneration');