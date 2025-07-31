import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createVideoGeneration, validateVideoRequest, estimateVideoCost, createPromptImages } from '@/lib/runway-client';
import type { VideoGenerationRequest, ImageSource } from '@/types/video';

function sha256(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
}

export async function POST(request: NextRequest) {
    console.log('Received POST request to /api/video-generate');

    if (!process.env.RUNWAY_API_KEY) {
        console.error('RUNWAY_API_KEY is not set.');
        return NextResponse.json({ error: 'Server configuration error: Runway API key not found.' }, { status: 500 });
    }

    try {
        const formData = await request.formData();

        // Check password authentication if enabled
        if (process.env.APP_PASSWORD) {
            const clientPasswordHash = formData.get('passwordHash') as string | null;
            if (!clientPasswordHash) {
                console.error('Missing password hash.');
                return NextResponse.json({ error: 'Unauthorized: Missing password hash.' }, { status: 401 });
            }
            const serverPasswordHash = sha256(process.env.APP_PASSWORD);
            if (clientPasswordHash !== serverPasswordHash) {
                console.error('Invalid password hash.');
                return NextResponse.json({ error: 'Unauthorized: Invalid password.' }, { status: 401 });
            }
        }

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

        // Prepare images for Runway API
        let promptImage: string | Array<{ uri: string; position: 'first' | 'last' }>;

        if (imageSources.length === 1) {
            const source = imageSources[0];
            if (source.url) {
                promptImage = source.url;
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
                    uri = source.url;
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
            
            promptImage = promptImages;
        }

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

        // Estimate cost
        const estimatedCost = estimateVideoCost(duration, ratio);
        console.log('Estimated video generation cost:', estimatedCost);

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
}