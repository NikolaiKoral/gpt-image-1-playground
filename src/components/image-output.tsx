'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMaskDrawing } from '@/hooks/useMaskDrawing';
import { cn } from '@/lib/utils';
import { Loader2, Grid, Download, Edit3, Sparkles, Paintbrush, Type, Eraser } from 'lucide-react';
import Image from 'next/image';
import * as React from 'react';

type ImageInfo = {
    path: string;
    filename: string;
};

type ImageOutputProps = {
    imageBatch: ImageInfo[] | null;
    viewMode: 'grid' | number;
    onViewChange: (view: 'grid' | number) => void;
    altText?: string;
    isLoading: boolean;
    onSendToEdit: (filename: string) => void;
    onQuickEdit?: (filename: string, editText: string, maskFile?: File | null) => void;
    onDownload?: (filename: string, imageUrl: string) => void;
    onContinueEditing?: (filename: string) => void;
    currentMode: 'generate' | 'edit';
    baseImagePreviewUrl: string | null;
};

const getGridColsClass = (count: number): string => {
    if (count <= 1) return 'grid-cols-1';
    if (count <= 4) return 'grid-cols-2';
    if (count <= 9) return 'grid-cols-3';
    return 'grid-cols-3';
};

const EnhancedLoadingPreview = ({
    baseImagePreviewUrl,
    currentMode
}: {
    baseImagePreviewUrl: string | null;
    currentMode: 'generate' | 'edit';
}) => {
    const [loadingText, setLoadingText] = React.useState('Genererer billede...');
    const [dotCount, setDotCount] = React.useState(0);

    React.useEffect(() => {
        const messages =
            currentMode === 'edit'
                ? ['Redigerer billede...', 'Anvender ændringer...', 'Behandler...', 'Næsten færdig...']
                : ['Genererer billede...', 'Skaber kunstværk...', 'Behandler...', 'Færdiggør...'];

        let messageIndex = 0;
        const interval = setInterval(() => {
            messageIndex = (messageIndex + 1) % messages.length;
            setLoadingText(messages[messageIndex]);
        }, 2000);

        return () => clearInterval(interval);
    }, [currentMode]);

    React.useEffect(() => {
        const interval = setInterval(() => {
            setDotCount((prev) => (prev + 1) % 4);
        }, 500);

        return () => clearInterval(interval);
    }, []);

    const dots = '.'.repeat(dotCount);

    if (currentMode === 'edit' && baseImagePreviewUrl) {
        return (
            <div className='relative flex h-full w-full items-center justify-center'>
                <Image
                    src={baseImagePreviewUrl}
                    alt='Base image for editing'
                    fill
                    style={{ objectFit: 'contain' }}
                    className='blur-md filter transition-all duration-300'
                    unoptimized
                />
                <div className='absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white'>
                    <div className='relative mb-4'>
                        <Loader2 className='h-12 w-12 animate-spin text-white' />
                        <div className='absolute inset-0 h-12 w-12 animate-pulse rounded-full border-2 border-white/20'></div>
                    </div>
                    <div className='text-center'>
                        <p className='text-lg font-medium'>
                            {loadingText}
                            {dots}
                        </p>
                        <p className='mt-1 text-sm text-white/70'>This may take up to 2 minutes</p>
                    </div>
                    <div className='mt-4 h-1 w-48 overflow-hidden rounded-full bg-white/20'>
                        <div className='h-full w-full origin-left animate-pulse bg-white/40 transition-transform duration-1000'></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className='flex flex-col items-center justify-center text-white/80'>
            <div className='relative mb-4'>
                <Loader2 className='h-12 w-12 animate-spin text-white' />
                <div className='absolute inset-0 h-12 w-12 animate-pulse rounded-full border-2 border-white/20'></div>
            </div>
            <div className='text-center'>
                <p className='text-lg font-medium'>
                    {loadingText}
                    {dots}
                </p>
                <p className='mt-1 text-sm text-white/60'>This may take up to 2 minutes</p>
            </div>
            <div className='mt-4 h-1 w-48 overflow-hidden rounded-full bg-white/20'>
                <div className='h-full animate-pulse bg-gradient-to-r from-white/40 to-transparent'></div>
            </div>
        </div>
    );
};

export function ImageOutput({
    imageBatch,
    viewMode,
    onViewChange,
    altText = 'Generated image output',
    isLoading,
    onSendToEdit,
    onQuickEdit,
    onDownload,
    onContinueEditing,
    currentMode,
    baseImagePreviewUrl
}: ImageOutputProps) {
    const [quickEditText, setQuickEditText] = React.useState('');
    const [isQuickEditing, setIsQuickEditing] = React.useState(false);
    const [editMode, setEditMode] = React.useState<'text' | 'mask'>('text');
    
    // Get current image dimensions for mask drawing
    const [imageDimensions, setImageDimensions] = React.useState({ width: 1024, height: 1024 });
    
    // Mask drawing hook
    const {
        canvasRef,
        maskFile,
        maskPreviewUrl,
        brushSize,
        setBrushSize,
        clearMask,
        hasDrawn
    } = useMaskDrawing({
        imageWidth: imageDimensions.width,
        imageHeight: imageDimensions.height,
        enabled: editMode === 'mask'
    });

    const handleQuickEditSubmit = async () => {
        if (
            !quickEditText.trim() ||
            !onQuickEdit ||
            typeof viewMode !== 'number' ||
            !imageBatch ||
            !imageBatch[viewMode]
        ) {
            return;
        }

        setIsQuickEditing(true);
        try {
            await onQuickEdit(imageBatch[viewMode].filename, quickEditText, editMode === 'mask' ? maskFile : null);
            setQuickEditText('');
            if (editMode === 'mask') {
                clearMask();
            }
        } catch (error) {
            console.error('Quick edit failed:', error);
        } finally {
            setIsQuickEditing(false);
        }
    };

    const handleQuickEditKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleQuickEditSubmit();
        }
    };

    const handleDownloadClick = () => {
        if (typeof viewMode === 'number' && imageBatch && imageBatch[viewMode] && onDownload) {
            onDownload(imageBatch[viewMode].filename, imageBatch[viewMode].path);
        }
    };

    const handleContinueEditingClick = () => {
        if (typeof viewMode === 'number' && imageBatch && imageBatch[viewMode] && onContinueEditing) {
            onContinueEditing(imageBatch[viewMode].filename);
        }
    };

    const showCarousel = imageBatch && imageBatch.length > 1;
    const isSingleImageView = typeof viewMode === 'number';
    const canSendToEdit = !isLoading && isSingleImageView && imageBatch && imageBatch[viewMode];

    // Show quick edit field when image is ready and not in grid view
    const showQuickEdit =
        !isLoading && typeof viewMode === 'number' && imageBatch && imageBatch[viewMode] && onQuickEdit;

    return (
        <div className='flex h-full min-h-[300px] w-full flex-col items-center justify-between gap-4 overflow-hidden rounded-lg border border-white/20 bg-black p-4'>
            <div className='relative flex h-full w-full flex-grow items-center justify-center overflow-hidden'>
                {isLoading ? (
                    <EnhancedLoadingPreview baseImagePreviewUrl={baseImagePreviewUrl} currentMode={currentMode} />
                ) : imageBatch && imageBatch.length > 0 ? (
                    viewMode === 'grid' ? (
                        <div
                            className={`grid ${getGridColsClass(imageBatch.length)} max-h-full w-full max-w-full gap-1 p-1`}>
                            {imageBatch.map((img, index) => (
                                <div
                                    key={img.filename}
                                    className='relative aspect-square overflow-hidden rounded border border-white/10'>
                                    <Image
                                        src={img.path}
                                        alt={`Generated image ${index + 1}`}
                                        fill
                                        style={{ objectFit: 'contain' }}
                                        sizes='(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw'
                                        unoptimized
                                    />
                                </div>
                            ))}
                        </div>
                    ) : imageBatch[viewMode] ? (
                        <div className='flex h-full w-full flex-col'>
                            {/* Image Display - Full Width */}
                            <div className='flex flex-1 items-center justify-center'>
                                <Image
                                    src={imageBatch[viewMode].path}
                                    alt={altText}
                                    width={512}
                                    height={512}
                                    className='max-h-full max-w-full object-contain'
                                    unoptimized
                                />
                            </div>

                            {/* Quick Edit Panel - Below Image */}
                            {showQuickEdit && (
                                <div className='mt-4 flex w-full flex-col space-y-3 rounded-lg border border-white/10 bg-neutral-900/50 p-4'>
                                    <div className='flex items-center justify-between'>
                                        <div>
                                            <h3 className='text-sm font-medium text-white/90'>Hurtig redigering</h3>
                                            <p className='text-xs text-white/60'>
                                                Vælg redigeringsmetode og beskriv ændringer
                                            </p>
                                        </div>
                                    </div>

                                    {/* Mode Selector Tabs */}
                                    <Tabs value={editMode} onValueChange={(value) => setEditMode(value as 'text' | 'mask')}>
                                        <TabsList className='grid w-full grid-cols-2 bg-black/50'>
                                            <TabsTrigger value='text' className='flex items-center gap-2'>
                                                <Type className='h-4 w-4' />
                                                Tekst prompt
                                            </TabsTrigger>
                                            <TabsTrigger value='mask' className='flex items-center gap-2'>
                                                <Paintbrush className='h-4 w-4' />
                                                Mask redigering
                                            </TabsTrigger>
                                        </TabsList>

                                        {/* Text Mode Content */}
                                        <TabsContent value='text' className='space-y-3'>
                                            <div className='flex gap-3'>
                                                <Input
                                                    value={quickEditText}
                                                    onChange={(e) => setQuickEditText(e.target.value)}
                                                    onKeyPress={handleQuickEditKeyPress}
                                                    placeholder='Beskriv redigeringsanvisninger...'
                                                    disabled={isQuickEditing}
                                                    className='flex-1 border-white/20 bg-black/50 text-white placeholder:text-white/40'
                                                />
                                                <Button
                                                    onClick={handleQuickEditSubmit}
                                                    disabled={!quickEditText.trim() || isQuickEditing}
                                                    className='bg-blue-600 text-white hover:bg-blue-700'
                                                    size='sm'>
                                                    {isQuickEditing ? (
                                                        <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                                                    ) : (
                                                        <Sparkles className='mr-2 h-4 w-4' />
                                                    )}
                                                    {isQuickEditing ? 'Redigerer...' : 'Start redigering'}
                                                </Button>
                                            </div>
                                            <p className='text-xs text-white/50'>
                                                Eksempler: "tilføj en kop kaffe", "skift baggrunden til en skov", "gør produktet større"
                                            </p>
                                        </TabsContent>

                                        {/* Mask Mode Content */}
                                        <TabsContent value='mask' className='space-y-3'>
                                            <div className='space-y-3'>
                                                {/* Brush Size Control */}
                                                <div className='space-y-2'>
                                                    <Label className='text-xs text-white/80'>Penselstørrelse: {brushSize}px</Label>
                                                    <Slider
                                                        value={[brushSize]}
                                                        onValueChange={([value]) => setBrushSize(value)}
                                                        min={5}
                                                        max={50}
                                                        step={1}
                                                        className='[&>button]:border-black [&>button]:bg-white [&>button]:ring-offset-black [&>span:first-child]:h-1 [&>span:first-child>span]:bg-white'
                                                    />
                                                </div>

                                                {/* Canvas Container */}
                                                <div className='relative overflow-hidden rounded border border-white/20 bg-black'>
                                                    <Image
                                                        src={imageBatch[viewMode].path}
                                                        alt='Base image for mask editing'
                                                        width={imageDimensions.width}
                                                        height={imageDimensions.height}
                                                        className='pointer-events-none max-h-48 w-full object-contain'
                                                        unoptimized
                                                        onLoad={(e) => {
                                                            const img = e.target as HTMLImageElement;
                                                            setImageDimensions({
                                                                width: img.naturalWidth,
                                                                height: img.naturalHeight
                                                            });
                                                        }}
                                                    />
                                                    <canvas
                                                        ref={canvasRef}
                                                        width={imageDimensions.width}
                                                        height={imageDimensions.height}
                                                        className='absolute inset-0 max-h-48 w-full cursor-crosshair'
                                                        style={{
                                                            width: '100%',
                                                            height: 'auto',
                                                            maxHeight: '12rem',
                                                            objectFit: 'contain'
                                                        }}
                                                    />
                                                    {maskPreviewUrl && (
                                                        <Image
                                                            src={maskPreviewUrl}
                                                            alt='Mask overlay'
                                                            width={imageDimensions.width}
                                                            height={imageDimensions.height}
                                                            className='pointer-events-none absolute inset-0 max-h-48 w-full object-contain opacity-50'
                                                            unoptimized
                                                        />
                                                    )}
                                                </div>

                                                {/* Mask Controls */}
                                                <div className='flex items-center gap-2'>
                                                    <Button
                                                        onClick={clearMask}
                                                        disabled={!hasDrawn || isQuickEditing}
                                                        variant='outline'
                                                        size='sm'
                                                        className='border-white/20 text-white/80 hover:bg-white/10'>
                                                        <Eraser className='mr-2 h-4 w-4' />
                                                        Ryd mask
                                                    </Button>
                                                    <Input
                                                        value={quickEditText}
                                                        onChange={(e) => setQuickEditText(e.target.value)}
                                                        onKeyPress={handleQuickEditKeyPress}
                                                        placeholder='Hvad skal erstatte det markerede?'
                                                        disabled={isQuickEditing}
                                                        className='flex-1 border-white/20 bg-black/50 text-white placeholder:text-white/40'
                                                    />
                                                    <Button
                                                        onClick={handleQuickEditSubmit}
                                                        disabled={!hasDrawn || !quickEditText.trim() || isQuickEditing}
                                                        className='bg-blue-600 text-white hover:bg-blue-700'
                                                        size='sm'>
                                                        {isQuickEditing ? (
                                                            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                                                        ) : (
                                                            <Sparkles className='mr-2 h-4 w-4' />
                                                        )}
                                                        {isQuickEditing ? 'Redigerer...' : 'Anvend'}
                                                    </Button>
                                                </div>
                                                <p className='text-xs text-white/50'>
                                                    Tegn på billedet for at markere områder. Røde områder vil blive erstattet med dit prompt.
                                                </p>
                                            </div>
                                        </TabsContent>
                                    </Tabs>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className='text-center text-white/40'>
                            <p>Error displaying image.</p>
                        </div>
                    )
                ) : (
                    <div className='text-center text-white/40'>
                        <p>Dit genererede billede vil vise sig her.</p>
                    </div>
                )}
            </div>

            <div className='flex w-full shrink-0 items-center justify-between gap-4'>
                {showCarousel && (
                    <div className='flex items-center gap-1.5 rounded-md border border-white/10 bg-neutral-800/50 p-1'>
                        <Button
                            variant='ghost'
                            size='icon'
                            className={cn(
                                'h-8 w-8 rounded p-1',
                                viewMode === 'grid'
                                    ? 'bg-white/20 text-white'
                                    : 'text-white/50 hover:bg-white/10 hover:text-white/80'
                            )}
                            onClick={() => onViewChange('grid')}
                            aria-label='Show grid view'>
                            <Grid className='h-4 w-4' />
                        </Button>
                        {imageBatch.map((img, index) => (
                            <Button
                                key={img.filename}
                                variant='ghost'
                                size='icon'
                                className={cn(
                                    'h-8 w-8 overflow-hidden rounded p-0.5',
                                    viewMode === index
                                        ? 'ring-2 ring-white ring-offset-1 ring-offset-black'
                                        : 'opacity-60 hover:opacity-100'
                                )}
                                onClick={() => onViewChange(index)}
                                aria-label={`Select image ${index + 1}`}>
                                <Image
                                    src={img.path}
                                    alt={`Thumbnail ${index + 1}`}
                                    width={28}
                                    height={28}
                                    className='h-full w-full object-cover'
                                    unoptimized
                                />
                            </Button>
                        ))}
                    </div>
                )}

                <div
                    className={cn(
                        'flex items-center gap-2',
                        showCarousel && viewMode === 'grid' ? 'invisible' : 'visible'
                    )}>
                    {onDownload && (
                        <Button
                            variant='outline'
                            size='sm'
                            onClick={handleDownloadClick}
                            disabled={!canSendToEdit}
                            className='shrink-0 border-white/20 text-white/80 hover:bg-white/10 hover:text-white disabled:pointer-events-none disabled:opacity-50'>
                            <Download className='mr-2 h-4 w-4' />
                            Download
                        </Button>
                    )}

                    {onContinueEditing && (
                        <Button
                            variant='outline'
                            size='sm'
                            onClick={handleContinueEditingClick}
                            disabled={!canSendToEdit}
                            className='shrink-0 border-white/20 text-white/80 hover:bg-white/10 hover:text-white disabled:pointer-events-none disabled:opacity-50'>
                            <Edit3 className='mr-2 h-4 w-4' />
                            Fortsæt
                        </Button>
                    )}

                    {/* Send til redigering button removed - replaced with quick edit panel */}
                </div>
            </div>
        </div>
    );
}
