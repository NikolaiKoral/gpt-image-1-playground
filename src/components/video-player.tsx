'use client';

import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { 
    Play, 
    Pause, 
    Volume2, 
    VolumeX, 
    Maximize, 
    Minimize, 
    Download,
    RotateCcw,
    Settings
} from 'lucide-react';
import * as React from 'react';

interface VideoPlayerProps {
    src: string;
    poster?: string;
    className?: string;
    autoPlay?: boolean;
    loop?: boolean;
    muted?: boolean;
    controls?: boolean;
    onDownload?: () => void;
    downloadFileName?: string;
}

export function VideoPlayer({
    src,
    poster,
    className,
    autoPlay = false,
    loop = false,
    muted = false,
    controls = true,
    onDownload,
    downloadFileName = 'video.mp4'
}: VideoPlayerProps) {
    const videoRef = React.useRef<HTMLVideoElement>(null);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const [isPlaying, setIsPlaying] = React.useState(false);
    const [currentTime, setCurrentTime] = React.useState(0);
    const [duration, setDuration] = React.useState(0);
    const [volume, setVolume] = React.useState(1);
    const [isMuted, setIsMuted] = React.useState(muted);
    const [isFullscreen, setIsFullscreen] = React.useState(false);
    const [showControls, setShowControls] = React.useState(true);
    const [isLoading, setIsLoading] = React.useState(true);
    const [playbackRate, setPlaybackRate] = React.useState(1);

    const hideControlsTimeoutRef = React.useRef<NodeJS.Timeout>();

    // Handle play/pause
    const togglePlayPause = React.useCallback(() => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
        }
    }, [isPlaying]);

    // Handle volume change
    const handleVolumeChange = React.useCallback((newVolume: number[]) => {
        const vol = newVolume[0];
        setVolume(vol);
        if (videoRef.current) {
            videoRef.current.volume = vol;
            setIsMuted(vol === 0);
        }
    }, []);

    // Handle mute toggle
    const toggleMute = React.useCallback(() => {
        if (videoRef.current) {
            const newMuted = !isMuted;
            setIsMuted(newMuted);
            videoRef.current.muted = newMuted;
        }
    }, [isMuted]);

    // Handle fullscreen
    const toggleFullscreen = React.useCallback(() => {
        if (containerRef.current) {
            if (!isFullscreen) {
                containerRef.current.requestFullscreen?.();
            } else {
                document.exitFullscreen?.();
            }
        }
    }, [isFullscreen]);

    // Handle time seek
    const handleTimeSeek = React.useCallback((newTime: number[]) => {
        const time = newTime[0];
        setCurrentTime(time);
        if (videoRef.current) {
            videoRef.current.currentTime = time;
        }
    }, []);

    // Format time display
    const formatTime = React.useCallback((time: number) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }, []);

    // Auto-hide controls
    const resetControlsTimer = React.useCallback(() => {
        if (hideControlsTimeoutRef.current) {
            clearTimeout(hideControlsTimeoutRef.current);
        }
        setShowControls(true);
        
        if (isPlaying) {
            hideControlsTimeoutRef.current = setTimeout(() => {
                setShowControls(false);
            }, 3000);
        }
    }, [isPlaying]);

    // Handle download
    const handleDownload = React.useCallback(async () => {
        if (onDownload) {
            onDownload();
            return;
        }

        try {
            const response = await fetch(src);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = downloadFileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading video:', error);
        }
    }, [src, onDownload, downloadFileName]);

    // Video event handlers
    React.useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleLoadedMetadata = () => {
            setDuration(video.duration);
            setIsLoading(false);
        };

        const handleTimeUpdate = () => {
            setCurrentTime(video.currentTime);
        };

        const handlePlay = () => {
            setIsPlaying(true);
        };

        const handlePause = () => {
            setIsPlaying(false);
        };

        const handleEnded = () => {
            setIsPlaying(false);
            setCurrentTime(0);
        };

        const handleVolumeChange = () => {
            setVolume(video.volume);
            setIsMuted(video.muted);
        };

        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        video.addEventListener('timeupdate', handleTimeUpdate);
        video.addEventListener('play', handlePlay);
        video.addEventListener('pause', handlePause);
        video.addEventListener('ended', handleEnded);
        video.addEventListener('volumechange', handleVolumeChange);

        return () => {
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
            video.removeEventListener('timeupdate', handleTimeUpdate);
            video.removeEventListener('play', handlePlay);
            video.removeEventListener('pause', handlePause);
            video.removeEventListener('ended', handleEnded);
            video.removeEventListener('volumechange', handleVolumeChange);
        };
    }, []);

    // Fullscreen change handler
    React.useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // Mouse move handler for controls
    React.useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleMouseMove = () => {
            resetControlsTimer();
        };

        const handleMouseLeave = () => {
            if (isPlaying) {
                setShowControls(false);
            }
        };

        container.addEventListener('mousemove', handleMouseMove);
        container.addEventListener('mouseleave', handleMouseLeave);

        return () => {
            container.removeEventListener('mousemove', handleMouseMove);
            container.removeEventListener('mouseleave', handleMouseLeave);
            if (hideControlsTimeoutRef.current) {
                clearTimeout(hideControlsTimeoutRef.current);
            }
        };
    }, [resetControlsTimer, isPlaying]);

    return (
        <div
            ref={containerRef}
            className={cn(
                'relative bg-black rounded-lg overflow-hidden group',
                className
            )}
            onMouseEnter={() => setShowControls(true)}>
            
            <video
                ref={videoRef}
                src={src}
                poster={poster}
                autoPlay={autoPlay}
                loop={loop}
                muted={muted}
                className='w-full h-full object-contain'
                onClick={togglePlayPause}
                onDoubleClick={toggleFullscreen}
            />

            {isLoading && (
                <div className='absolute inset-0 flex items-center justify-center bg-black/50'>
                    <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-white'></div>
                </div>
            )}

            {controls && (
                <div
                    className={cn(
                        'absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300',
                        showControls ? 'opacity-100' : 'opacity-0'
                    )}>
                    
                    {/* Progress bar */}
                    <div className='mb-3'>
                        <Slider
                            value={[currentTime]}
                            onValueChange={handleTimeSeek}
                            max={duration || 100}
                            step={0.1}
                            className='w-full [&>button]:w-3 [&>button]:h-3'
                        />
                        <div className='flex justify-between text-xs text-white/70 mt-1'>
                            <span>{formatTime(currentTime)}</span>
                            <span>{formatTime(duration)}</span>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-2'>
                            <Button
                                variant='ghost'
                                size='icon'
                                onClick={togglePlayPause}
                                className='text-white hover:bg-white/20'>
                                {isPlaying ? (
                                    <Pause className='h-5 w-5' />
                                ) : (
                                    <Play className='h-5 w-5' />
                                )}
                            </Button>

                            <Button
                                variant='ghost'
                                size='icon'
                                onClick={() => {
                                    if (videoRef.current) {
                                        videoRef.current.currentTime = 0;
                                        setCurrentTime(0);
                                    }
                                }}
                                className='text-white hover:bg-white/20'>
                                <RotateCcw className='h-4 w-4' />
                            </Button>

                            <div className='flex items-center gap-2 ml-2'>
                                <Button
                                    variant='ghost'
                                    size='icon'
                                    onClick={toggleMute}
                                    className='text-white hover:bg-white/20'>
                                    {isMuted || volume === 0 ? (
                                        <VolumeX className='h-4 w-4' />
                                    ) : (
                                        <Volume2 className='h-4 w-4' />
                                    )}
                                </Button>
                                <Slider
                                    value={[isMuted ? 0 : volume]}
                                    onValueChange={handleVolumeChange}
                                    max={1}
                                    step={0.01}
                                    className='w-20 [&>button]:w-2 [&>button]:h-2'
                                />
                            </div>
                        </div>

                        <div className='flex items-center gap-2'>
                            <select
                                value={playbackRate}
                                onChange={(e) => {
                                    const rate = parseFloat(e.target.value);
                                    setPlaybackRate(rate);
                                    if (videoRef.current) {
                                        videoRef.current.playbackRate = rate;
                                    }
                                }}
                                className='bg-transparent text-white text-sm border border-white/20 rounded px-2 py-1'>
                                <option value={0.5}>0.5x</option>
                                <option value={0.75}>0.75x</option>
                                <option value={1}>1x</option>
                                <option value={1.25}>1.25x</option>
                                <option value={1.5}>1.5x</option>
                                <option value={2}>2x</option>
                            </select>

                            {onDownload && (
                                <Button
                                    variant='ghost'
                                    size='icon'
                                    onClick={handleDownload}
                                    className='text-white hover:bg-white/20'>
                                    <Download className='h-4 w-4' />
                                </Button>
                            )}

                            <Button
                                variant='ghost'
                                size='icon'
                                onClick={toggleFullscreen}
                                className='text-white hover:bg-white/20'>
                                {isFullscreen ? (
                                    <Minimize className='h-4 w-4' />
                                ) : (
                                    <Maximize className='h-4 w-4' />
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}