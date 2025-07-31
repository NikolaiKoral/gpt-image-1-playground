'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { VideoPlayer } from '@/components/video-player';
import { cn } from '@/lib/utils';
import type { VideoHistoryItem } from '@/types/video';
import { 
    Download, 
    Trash2, 
    Clock, 
    Video, 
    DollarSign,
    FileVideo,
    Calendar,
    Play
} from 'lucide-react';
import * as React from 'react';

interface VideoHistoryPanelProps {
    videos: VideoHistoryItem[];
    onDelete?: (videoId: string) => void;
    onDownload?: (video: VideoHistoryItem) => void;
    className?: string;
}

export function VideoHistoryPanel({
    videos,
    onDelete,
    onDownload,
    className
}: VideoHistoryPanelProps) {
    const [selectedVideo, setSelectedVideo] = React.useState<VideoHistoryItem | null>(null);
    const [isDeleting, setIsDeleting] = React.useState<string | null>(null);

    const handleDelete = async (videoId: string) => {
        if (isDeleting) return;
        
        setIsDeleting(videoId);
        try {
            await onDelete?.(videoId);
        } finally {
            setIsDeleting(null);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('da-DK', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    };

    const formatDuration = (seconds: number) => {
        return `${seconds}s`;
    };

    const formatCost = (cost?: number) => {
        if (!cost) return 'N/A';
        return `$${cost.toFixed(2)}`;
    };

    const getTotalCost = () => {
        return videos.reduce((sum, video) => sum + (video.cost || 0), 0);
    };

    if (videos.length === 0) {
        return (
            <Card className={cn('bg-white/5 border-white/10', className)}>
                <CardContent className='flex flex-col items-center justify-center py-12'>
                    <Video className='h-12 w-12 text-white/20 mb-4' />
                    <p className='text-white/60 text-center'>
                        Ingen videoer genereret endnu.
                        <br />
                        Generer din første video for at se den her.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className={cn('bg-white/5 border-white/10', className)}>
            <CardHeader className='pb-3'>
                <div className='flex items-center justify-between'>
                    <CardTitle className='text-white flex items-center gap-2'>
                        <Clock className='h-5 w-5' />
                        Video historik
                    </CardTitle>
                    <div className='text-sm text-white/60'>
                        Total: {formatCost(getTotalCost())}
                    </div>
                </div>
            </CardHeader>
            <CardContent className='p-0'>
                <ScrollArea className='h-[600px]'>
                    <div className='p-4 space-y-3'>
                        {videos.map((video) => (
                            <Card 
                                key={video.id}
                                className={cn(
                                    'bg-white/5 border-white/10 cursor-pointer transition-all',
                                    'hover:bg-white/10',
                                    selectedVideo?.id === video.id && 'ring-2 ring-blue-500'
                                )}
                                onClick={() => setSelectedVideo(video)}>
                                <CardContent className='p-4'>
                                    <div className='flex gap-4'>
                                        {/* Thumbnail */}
                                        <div className='relative w-32 h-20 bg-black/50 rounded overflow-hidden flex-shrink-0'>
                                            {video.status === 'completed' && video.videoUrl && typeof video.videoUrl === 'string' ? (
                                                <video
                                                    src={video.videoUrl}
                                                    className='w-full h-full object-cover'
                                                    muted
                                                />
                                            ) : (
                                                <div className='w-full h-full flex items-center justify-center'>
                                                    <FileVideo className='h-8 w-8 text-white/20' />
                                                </div>
                                            )}
                                            <div className='absolute bottom-1 right-1 bg-black/80 px-1 rounded text-xs text-white'>
                                                {formatDuration(video.duration)}
                                            </div>
                                        </div>

                                        {/* Info */}
                                        <div className='flex-1 min-w-0'>
                                            <div className='flex items-start justify-between mb-1'>
                                                <h4 className='text-sm font-medium text-white truncate pr-2'>
                                                    {video.promptText.substring(0, 50)}...
                                                </h4>
                                                <span className='text-xs text-white/60 flex-shrink-0'>
                                                    {formatCost(video.cost)}
                                                </span>
                                            </div>
                                            
                                            <div className='flex items-center gap-4 text-xs text-white/60'>
                                                <span className='flex items-center gap-1'>
                                                    <Calendar className='h-3 w-3' />
                                                    {formatDate(video.createdAt)}
                                                </span>
                                                <span>{video.ratio}</span>
                                                <span className={cn(
                                                    'px-2 py-0.5 rounded',
                                                    video.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                                                    video.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                                                    'bg-yellow-500/20 text-yellow-400'
                                                )}>
                                                    {video.status === 'completed' ? 'Færdig' :
                                                     video.status === 'failed' ? 'Fejlet' : 'Behandler'}
                                                </span>
                                            </div>

                                            {/* Actions */}
                                            <div className='flex gap-2 mt-2'>
                                                {video.status === 'completed' && video.videoUrl && (
                                                    <>
                                                        <Button
                                                            size='sm'
                                                            variant='ghost'
                                                            className='h-7 text-xs'
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onDownload?.(video);
                                                            }}>
                                                            <Download className='h-3 w-3 mr-1' />
                                                            Download
                                                        </Button>
                                                        <Button
                                                            size='sm'
                                                            variant='ghost'
                                                            className='h-7 text-xs text-blue-400 hover:text-blue-300'
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedVideo(video);
                                                            }}>
                                                            <Play className='h-3 w-3 mr-1' />
                                                            Afspil
                                                        </Button>
                                                    </>
                                                )}
                                                <Button
                                                    size='sm'
                                                    variant='ghost'
                                                    className='h-7 text-xs text-red-400 hover:text-red-300 ml-auto'
                                                    disabled={isDeleting === video.id}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDelete(video.id);
                                                    }}>
                                                    <Trash2 className='h-3 w-3' />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </ScrollArea>
            </CardContent>

            {/* Video Preview Modal */}
            {selectedVideo?.status === 'completed' && selectedVideo.videoUrl && typeof selectedVideo.videoUrl === 'string' && (
                <div 
                    className='fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4'
                    onClick={() => setSelectedVideo(null)}>
                    <div 
                        className='max-w-4xl w-full'
                        onClick={e => e.stopPropagation()}>
                        <div className='mb-4 flex items-center justify-between'>
                            <h3 className='text-white text-lg font-medium'>
                                Video preview
                            </h3>
                            <Button
                                size='sm'
                                variant='ghost'
                                className='text-white'
                                onClick={() => setSelectedVideo(null)}>
                                Luk
                            </Button>
                        </div>
                        <VideoPlayer
                            src={selectedVideo.videoUrl}
                            className='w-full'
                            autoPlay
                        />
                    </div>
                </div>
            )}
        </Card>
    );
}