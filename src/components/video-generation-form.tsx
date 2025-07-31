'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ImageSelector } from '@/components/image-selector';
import { VideoPlayer } from '@/components/video-player';
import { cn } from '@/lib/utils';
import { 
    Loader2, 
    Video, 
    Sparkles, 
    Play, 
    Square, 
    Download,
    RotateCcw,
    Settings,
    Lightbulb
} from 'lucide-react';
import * as React from 'react';
import type { 
    VideoGenerationFormData, 
    ImageSource, 
    VideoHistoryItem, 
    RunwayTask,
    ASPECT_RATIOS,
    DURATION_OPTIONS,
    MOTION_TEMPLATES
} from '@/types/video';

interface VideoGenerationFormProps {
    onSubmit: (data: VideoGenerationFormData) => Promise<string>; // Returns taskId
    onTaskStatusCheck: (taskId: string) => Promise<RunwayTask>;
    isLoading: boolean;
    availableImages: Array<{ filename: string; path: string; createdAt: string }>;
    onVideoGenerated?: (video: VideoHistoryItem) => void;
    clientPasswordHash: string | null;
}

export function VideoGenerationForm({
    onSubmit,
    onTaskStatusCheck,
    isLoading,
    availableImages,
    onVideoGenerated,
    clientPasswordHash
}: VideoGenerationFormProps) {
    // Form state
    const [selectedImages, setSelectedImages] = React.useState<ImageSource[]>([]);
    const [promptText, setPromptText] = React.useState('');
    const [ratio, setRatio] = React.useState<typeof ASPECT_RATIOS[number]['value']>('1280:720');
    const [duration, setDuration] = React.useState<5 | 10>(10);
    const [seed, setSeed] = React.useState<string>('');
    const [publicFigureThreshold, setPublicFigureThreshold] = React.useState<'auto' | 'low'>('auto');
    
    // Generation state
    const [currentTask, setCurrentTask] = React.useState<string | null>(null);
    const [taskStatus, setTaskStatus] = React.useState<RunwayTask | null>(null);
    const [generatedVideo, setGeneratedVideo] = React.useState<VideoHistoryItem | null>(null);
    const [error, setError] = React.useState<string | null>(null);
    const [showAdvanced, setShowAdvanced] = React.useState(false);
    const [estimatedCost, setEstimatedCost] = React.useState<number>(0);

    // Polling for task status
    const pollTaskStatus = React.useCallback(async (taskId: string) => {
        try {
            const status = await onTaskStatusCheck(taskId);
            setTaskStatus(status);

            if (status.status === 'SUCCEEDED' && status.output) {
                // Task completed successfully
                // Runway returns output as an array, get the first video URL
                console.log('Video generation output:', status.output);
                let videoUrl: string;
                
                if (Array.isArray(status.output)) {
                    videoUrl = status.output[0];
                } else if (typeof status.output === 'string') {
                    videoUrl = status.output;
                } else if (status.output && typeof status.output === 'object' && 'videoUrl' in status.output) {
                    videoUrl = status.output.videoUrl;
                } else {
                    console.error('Unexpected output format:', status.output);
                    setError('Invalid video URL format received');
                    return;
                }
                
                console.log('Extracted video URL:', videoUrl);
                
                const videoItem: VideoHistoryItem = {
                    id: `video-${Date.now()}`,
                    taskId: taskId,
                    createdAt: new Date().toISOString(),
                    sourceImages: selectedImages.map(img => ({
                        filename: img.filename || 'uploaded',
                        url: img.url || '',
                        position: img.position
                    })),
                    promptText,
                    model: 'gen4_turbo',
                    ratio,
                    duration,
                    seed: seed ? parseInt(seed) : undefined,
                    status: 'completed',
                    videoUrl: videoUrl,
                    cost: estimatedCost,
                    metadata: {
                        fileSize: 0, // Will be determined when downloading
                        format: 'mp4'
                    }
                };

                setGeneratedVideo(videoItem);
                setCurrentTask(null);
                onVideoGenerated?.(videoItem);
            } else if (status.status === 'FAILED') {
                // Task failed
                setError(status.failureReason || 'Video generation failed');
                setCurrentTask(null);
            } else if (status.status === 'PENDING' || status.status === 'RUNNING') {
                // Still processing, continue polling
                setTimeout(() => pollTaskStatus(taskId), 5000);
            }
        } catch (error) {
            console.error('Error polling task status:', error);
            setError(`Failed to check generation status: ${error instanceof Error ? error.message : 'Unknown error'}`);
            setCurrentTask(null);
        }
    }, [selectedImages, promptText, ratio, duration, seed, estimatedCost, onTaskStatusCheck, onVideoGenerated]);

    // Handle form submission
    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        
        if (selectedImages.length === 0) {
            setError('Vælg mindst ét billede');
            return;
        }

        if (!promptText.trim()) {
            setError('Indtast en bevægelse prompt');
            return;
        }

        setError(null);
        setGeneratedVideo(null);

        const formData: VideoGenerationFormData = {
            sourceImages: selectedImages,
            promptText: promptText.trim(),
            model: 'gen4_turbo',
            ratio,
            duration,
            seed: seed ? parseInt(seed) : undefined,
            contentModeration: {
                publicFigureThreshold
            }
        };

        try {
            const taskId = await onSubmit(formData);
            setCurrentTask(taskId);
            setTaskStatus(null);
            
            // Start polling for status
            setTimeout(() => pollTaskStatus(taskId), 2000);
        } catch (error) {
            console.error('Error submitting video generation:', error);
            setError(`Fejl ved video generering: ${error instanceof Error ? error.message : 'Ukendt fejl'}`);
        }
    };

    // Apply motion template
    const applyMotionTemplate = (template: string) => {
        setPromptText(template);
    };

    // Calculate estimated cost
    React.useEffect(() => {
        const baseCost = 1.0;
        const durationMultiplier = duration / 5;
        const resolutionMultiplier = ratio.includes('1584') ? 1.5 : 1.0;
        setEstimatedCost(baseCost * durationMultiplier * resolutionMultiplier);
    }, [duration, ratio]);

    const isGenerating = currentTask !== null;
    const canSubmit = selectedImages.length > 0 && promptText.trim().length > 0 && !isGenerating;

    return (
        <Card className='flex h-full w-full flex-col overflow-hidden rounded-lg border border-white/10 bg-black'>
            <CardHeader className='border-b border-white/10 pb-4'>
                <div className='flex items-center gap-2'>
                    <Video className='h-5 w-5 text-white' />
                    <CardTitle className='text-lg font-medium text-white'>
                        Skab videoer med AI
                    </CardTitle>
                </div>
                <CardDescription className='text-white/60'>
                    Transformer dine billeder til levende videoer med Runway Gen-4 Turbo
                </CardDescription>
            </CardHeader>

            <form onSubmit={handleSubmit} className='flex h-full flex-1 flex-col overflow-hidden'>
                <CardContent className='flex-1 space-y-6 overflow-y-auto p-6'>
                    
                    {/* Error Display */}
                    {error && (
                        <div className='rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-red-400'>
                            {error}
                        </div>
                    )}

                    {/* Image Selection */}
                    <div className='space-y-4'>
                        <ImageSelector
                            selectedImages={selectedImages}
                            onSelectionChange={setSelectedImages}
                            availableImages={availableImages}
                            maxImages={2}
                            disabled={isGenerating}
                        />
                    </div>

                    {/* Motion Prompt */}
                    <div className='space-y-3'>
                        <div className='flex items-center justify-between'>
                            <Label className='text-white'>Bevægelse beskrivelse</Label>
                            <Button
                                type='button'
                                variant='ghost'
                                size='sm'
                                className='text-white/60 hover:text-white'>
                                <Lightbulb className='mr-2 h-4 w-4' />
                                Inspiration
                            </Button>
                        </div>

                        <Textarea
                            value={promptText}
                            onChange={(e) => setPromptText(e.target.value)}
                            placeholder='Beskriv hvordan videoen skal bevæge sig. F.eks: "Langsom rotation af produktet med elegant belysning" eller "Blid bevægelse i baggrunden med fokus på produktet"'
                            disabled={isGenerating}
                            className='min-h-20 border-white/20 bg-black/50 text-white placeholder:text-white/40'
                            maxLength={1000}
                        />
                        <div className='flex items-center justify-between text-xs text-white/60'>
                            <span>{promptText.length}/1000 tegn</span>
                            {estimatedCost > 0 && (
                                <span>Anslået omkostning: ~${estimatedCost.toFixed(2)}</span>
                            )}
                        </div>

                        {/* Motion Templates */}
                        <div className='space-y-2'>
                            <Label className='text-sm text-white/80'>Hurtige skabeloner</Label>
                            <div className='grid grid-cols-2 gap-2'>
                                {Object.entries({
                                    'Cinematisk still life': 'The scene gently comes to life as soft light shifts across the surfaces. The glassware catches subtle reflections as ambient light moves slowly through the space. Liquids in vessels gently ripple with barely perceptible movement. Shadows move elongate and shift gradually across the tabletop. Delicate natural elements sway slightly as if touched by a gentle breeze. Subtle atmospheric particles float through shafts of light. Locked camera with minimal depth of field changes. Cinematic lighting with natural color grading and subtle change in reflections and shadow.',
                                    'Produkt rotation': 'Langsom 360-graders rotation af produktet med elegant belysning',
                                    'Zoom ind': 'Gradvist zoom ind på produktet med blød fokus transition',
                                    'Levitating': 'Produktet svæver let op og ned med subtil skygge'
                                }).map(([name, template]) => (
                                    <Button
                                        key={name}
                                        type='button'
                                        variant='outline'
                                        size='sm'
                                        onClick={() => applyMotionTemplate(template)}
                                        disabled={isGenerating}
                                        className='justify-start text-left border-white/20 text-white/80 hover:bg-white/10'>
                                        {name}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Video Settings */}
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                        {/* Aspect Ratio */}
                        <div className='space-y-2'>
                            <Label className='text-white'>Aspect ratio</Label>
                            <select
                                value={ratio}
                                onChange={(e) => setRatio(e.target.value as any)}
                                disabled={isGenerating}
                                className='w-full rounded border border-white/20 bg-black/50 p-2 text-white'>
                                {[
                                    { value: '1280:720', label: '16:9 Landskab', description: '1280×720' },
                                    { value: '720:1280', label: '9:16 Portræt', description: '720×1280' },
                                    { value: '1104:832', label: '4:3 Landskab', description: '1104×832' },
                                    { value: '832:1104', label: '3:4 Portræt', description: '832×1104' },
                                    { value: '960:960', label: '1:1 Kvadrat', description: '960×960' },
                                    { value: '1584:672', label: 'Ultra-bred', description: '1584×672' }
                                ].map(option => (
                                    <option key={option.value} value={option.value}>
                                        {option.label} ({option.description})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Duration */}
                        <div className='space-y-2'>
                            <Label className='text-white'>Varighed</Label>
                            <select
                                value={duration}
                                onChange={(e) => setDuration(parseInt(e.target.value) as 5 | 10)}
                                disabled={isGenerating}
                                className='w-full rounded border border-white/20 bg-black/50 p-2 text-white'>
                                <option value={5}>5 sekunder</option>
                                <option value={10}>10 sekunder</option>
                            </select>
                        </div>
                    </div>

                    {/* Advanced Settings */}
                    <div className='space-y-3'>
                        <Button
                            type='button'
                            variant='ghost'
                            size='sm'
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className='text-white/60 hover:text-white'>
                            <Settings className='mr-2 h-4 w-4' />
                            Avancerede indstillinger
                        </Button>

                        {showAdvanced && (
                            <div className='space-y-4 rounded border border-white/10 bg-white/5 p-4'>
                                <div className='space-y-2'>
                                    <Label className='text-white'>Seed (valgfri)</Label>
                                    <Input
                                        type='number'
                                        value={seed}
                                        onChange={(e) => setSeed(e.target.value)}
                                        placeholder='Tilfældigt tal for reproducerbare resultater'
                                        disabled={isGenerating}
                                        className='border-white/20 bg-black/50 text-white placeholder:text-white/40'
                                        min={0}
                                        max={4294967295}
                                    />
                                    <p className='text-xs text-white/60'>
                                        Samme seed giver samme resultat med identiske indstillinger
                                    </p>
                                </div>

                                <div className='space-y-2'>
                                    <Label className='text-white'>Indhold moderation</Label>
                                    <select
                                        value={publicFigureThreshold}
                                        onChange={(e) => setPublicFigureThreshold(e.target.value as 'auto' | 'low')}
                                        disabled={isGenerating}
                                        className='w-full rounded border border-white/20 bg-black/50 p-2 text-white'>
                                        <option value='auto'>Standard</option>
                                        <option value='low'>Mindre strikt</option>
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Generation Status */}
                    {isGenerating && taskStatus && (
                        <div className='space-y-3 rounded border border-blue-500/20 bg-blue-500/10 p-4'>
                            <div className='flex items-center gap-2'>
                                <Loader2 className='h-4 w-4 animate-spin text-blue-400' />
                                <span className='text-blue-400'>Genererer video...</span>
                            </div>
                            
                            <div className='space-y-2'>
                                <div className='flex justify-between text-sm'>
                                    <span className='text-white/80'>Status:</span>
                                    <span className='text-blue-400'>
                                        {taskStatus.status === 'PENDING' && 'I kø'}
                                        {taskStatus.status === 'RUNNING' && 'Behandler'}
                                        {taskStatus.status === 'SUCCEEDED' && 'Færdig'}
                                        {taskStatus.status === 'FAILED' && 'Fejlet'}
                                    </span>
                                </div>
                                
                                {taskStatus.progress !== undefined && (
                                    <div className='space-y-1'>
                                        <div className='flex justify-between text-sm'>
                                            <span className='text-white/80'>Fremgang:</span>
                                            <span className='text-blue-400'>{Math.round(taskStatus.progress * 100)}%</span>
                                        </div>
                                        <div className='h-1 w-full overflow-hidden rounded-full bg-white/20'>
                                            <div 
                                                className='h-full bg-blue-500 transition-all duration-300'
                                                style={{ width: `${taskStatus.progress * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                )}
                                
                                <p className='text-xs text-white/60'>
                                    Dette kan tage op til 2 minutter
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Generated Video */}
                    {generatedVideo && generatedVideo.videoUrl && typeof generatedVideo.videoUrl === 'string' && (
                        <div className='space-y-3'>
                            <Label className='text-white'>Genereret video</Label>
                            <VideoPlayer
                                src={generatedVideo.videoUrl}
                                className='w-full max-h-96'
                                autoPlay
                                loop
                                controls
                                downloadFileName={`video-${generatedVideo.id}.mp4`}
                            />
                            <div className='flex items-center justify-between text-sm text-white/80'>
                                <span>Varighed: {generatedVideo.duration}s</span>
                                <span>Format: {generatedVideo.ratio}</span>
                                <span>Omkostning: ${generatedVideo.cost.toFixed(2)}</span>
                            </div>
                        </div>
                    )}

                </CardContent>

                <CardFooter className='border-t border-white/10 p-4'>
                    <Button
                        type='submit'
                        disabled={!canSubmit}
                        className='flex w-full items-center justify-center gap-2 rounded-md bg-white text-black hover:bg-white/90 disabled:bg-white/10 disabled:text-white/40'>
                        {isGenerating ? (
                            <>
                                <Loader2 className='h-4 w-4 animate-spin' />
                                Genererer video...
                            </>
                        ) : (
                            <>
                                <Play className='h-4 w-4' />
                                Generer video
                            </>
                        )}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
}