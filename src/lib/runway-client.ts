import RunwayML from '@runwayml/sdk';
import type { VideoGenerationRequest, RunwayTask, PromptImageObject } from '@/types/video';

// Lazy initialization of Runway client
let runwayClient: RunwayML | null = null;

function getRunwayClient(): RunwayML {
    if (!runwayClient) {
        if (!process.env.RUNWAY_API_KEY) {
            throw new Error('RUNWAY_API_KEY is not configured');
        }
        runwayClient = new RunwayML({
            apiKey: process.env.RUNWAY_API_KEY,
        });
    }
    return runwayClient;
}

export async function createVideoGeneration(request: VideoGenerationRequest): Promise<{ id: string }> {
    const client = getRunwayClient();
    
    try {
        console.log('Creating video generation with Runway API:', {
            ...request,
            promptImage: Array.isArray(request.promptImage) ? 
                `[${request.promptImage.length} images]` : 
                request.promptImage ? '[1 image]' : 'none'
        });

        const response = await client.imageToVideo.create({
            model: request.model,
            promptImage: request.promptImage,
            promptText: request.promptText,
            ratio: request.ratio,
            duration: request.duration,
            seed: request.seed,
            contentModeration: request.contentModeration,
        });

        console.log('Runway video generation task created:', response.id);
        return { id: response.id };
    } catch (error) {
        console.error('Error creating video generation:', error);
        throw new Error(`Failed to create video generation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export async function getTaskStatus(taskId: string): Promise<RunwayTask> {
    const client = getRunwayClient();
    
    try {
        const response = await client.tasks.retrieve(taskId);
        
        console.log('Runway task status:', {
            id: response.id,
            status: response.status,
            progress: response.progress || 'N/A'
        });

        // Map Runway API response to our task interface
        const task: RunwayTask = {
            id: response.id,
            status: response.status as RunwayTask['status'],
            createdAt: response.createdAt,
            updatedAt: response.updatedAt,
            progress: response.progress,
            failureReason: response.failureReason,
        };

        // Add output data if task is completed
        if (response.status === 'SUCCEEDED' && response.output) {
            task.output = {
                videoUrl: response.output[0]?.uri || '',
                duration: response.output[0]?.duration || 0,
                width: response.output[0]?.width || 0,
                height: response.output[0]?.height || 0,
            };
        }

        return task;
    } catch (error) {
        console.error('Error getting task status:', error);
        throw new Error(`Failed to get task status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export async function cancelTask(taskId: string): Promise<void> {
    const client = getRunwayClient();
    
    try {
        await client.tasks.cancel(taskId);
        console.log('Runway task canceled:', taskId);
    } catch (error) {
        console.error('Error canceling task:', error);
        throw new Error(`Failed to cancel task: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

// Helper function to prepare image data for Runway API
export function prepareImageForRunway(imageSource: { url?: string; file?: File }): string {
    if (imageSource.url) {
        return imageSource.url;
    }
    
    if (imageSource.file) {
        // For uploaded files, we need to convert to data URI or upload to a URL
        // This will be handled in the API route where we have access to file buffers
        throw new Error('File upload handling should be done in API route');
    }
    
    throw new Error('Image source must have either URL or file');
}

// Helper function to create prompt image objects for multi-image generation
export function createPromptImages(imageSources: Array<{ url: string; position: 'first' | 'last' }>): PromptImageObject[] {
    return imageSources.map(source => ({
        uri: source.url,
        position: source.position
    }));
}

// Helper function to estimate video generation cost
export function estimateVideoCost(duration: number, ratio: string): number {
    // Based on Runway pricing - these are estimates and should be updated with actual pricing
    const baseCost = 1.0; // Base cost per generation
    const durationMultiplier = duration / 5; // 5 seconds is base
    const resolutionMultiplier = ratio.includes('1584') ? 1.5 : 1.0; // Ultra-wide costs more
    
    return baseCost * durationMultiplier * resolutionMultiplier;
}

// Helper function to validate video generation request
export function validateVideoRequest(request: VideoGenerationRequest): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!request.promptText || request.promptText.trim().length === 0) {
        errors.push('Motion prompt is required');
    }
    
    if (request.promptText && request.promptText.length > 1000) {
        errors.push('Motion prompt must be 1000 characters or less');
    }
    
    if (!request.promptImage || (Array.isArray(request.promptImage) && request.promptImage.length === 0)) {
        errors.push('At least one image is required');
    }
    
    if (request.duration !== 5 && request.duration !== 10) {
        errors.push('Duration must be 5 or 10 seconds');
    }
    
    const validRatios = ['1280:720', '720:1280', '1104:832', '832:1104', '960:960', '1584:672'];
    if (!validRatios.includes(request.ratio)) {
        errors.push('Invalid aspect ratio');
    }
    
    if (request.seed !== undefined && (request.seed < 0 || request.seed > 4294967295)) {
        errors.push('Seed must be between 0 and 4294967295');
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
}