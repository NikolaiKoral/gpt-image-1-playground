import { NextRequest, NextResponse } from 'next/server';
import { getTaskStatus, cancelTask } from '@/lib/runway-client';

interface RouteParams {
    params: {
        taskId: string;
    };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    const { taskId } = params;

    if (!taskId) {
        return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    if (!process.env.RUNWAYML_API_SECRET) {
        console.error('RUNWAYML_API_SECRET is not set.');
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    try {
        console.log('Checking video generation status for task:', taskId);
        
        const task = await getTaskStatus(taskId);
        
        // Log status for debugging
        console.log('Task status retrieved:', {
            id: task.id,
            status: task.status,
            progress: task.progress,
            hasOutput: !!task.output
        });

        // Return task status with appropriate data
        const response = {
            id: task.id,
            status: task.status,
            createdAt: task.createdAt,
            updatedAt: task.updatedAt,
            progress: task.progress,
            failureReason: task.failureReason,
            output: task.output
        };

        return NextResponse.json(response);

    } catch (error: unknown) {
        console.error('Error checking video status:', error);

        let errorMessage = 'Failed to check video status';
        let status = 500;

        if (error instanceof Error) {
            errorMessage = error.message;
            
            // Handle specific error types
            if (error.message.includes('not found') || error.message.includes('404')) {
                status = 404;
                errorMessage = 'Video generation task not found';
            } else if (error.message.includes('API key')) {
                status = 401;
            } else if (error.message.includes('rate limit')) {
                status = 429;
            }
        }

        return NextResponse.json({ error: errorMessage }, { status });
    }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
    const { taskId } = params;

    if (!taskId) {
        return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    if (!process.env.RUNWAYML_API_SECRET) {
        console.error('RUNWAYML_API_SECRET is not set.');
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    try {
        console.log('Canceling video generation task:', taskId);
        
        await cancelTask(taskId);
        
        console.log('Video generation task canceled successfully:', taskId);

        return NextResponse.json({ 
            message: 'Video generation task canceled successfully',
            taskId 
        });

    } catch (error: unknown) {
        console.error('Error canceling video task:', error);

        let errorMessage = 'Failed to cancel video generation task';
        let status = 500;

        if (error instanceof Error) {
            errorMessage = error.message;
            
            if (error.message.includes('not found') || error.message.includes('404')) {
                status = 404;
                errorMessage = 'Video generation task not found';
            } else if (error.message.includes('API key')) {
                status = 401;
            } else if (error.message.includes('rate limit')) {
                status = 429;
            }
        }

        return NextResponse.json({ error: errorMessage }, { status });
    }
}