'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { Download, Grid3X3, LayoutGrid, Maximize2, RotateCcw, Share2, Eye, Copy, Check, X } from 'lucide-react';
import Image from 'next/image';
import * as React from 'react';

export interface GeneratedImage {
    id: string;
    filename: string;
    url: string;
    presetId?: string;
    presetName?: string;
    prompt: string;
    timestamp: number;
    costDetails?: {
        estimated_cost_usd: number;
    };
}

interface MoodboardCenterProps {
    images: GeneratedImage[];
    onBatchDownload: (images: GeneratedImage[]) => void;
    onRegenerateWithPreset: (presetId: string) => void;
    className?: string;
}

type ViewMode = 'grid' | 'comparison' | 'detail';
type GridSize = '2x2' | '3x3' | '4x4';

export function MoodboardCenter({ images, onBatchDownload, onRegenerateWithPreset, className }: MoodboardCenterProps) {
    const [viewMode, setViewMode] = React.useState<ViewMode>('grid');
    const [gridSize, setGridSize] = React.useState<GridSize>('2x2');
    const [selectedImages, setSelectedImages] = React.useState<string[]>([]);
    const [detailImage, setDetailImage] = React.useState<GeneratedImage | null>(null);
    const [copiedImageId, setCopiedImageId] = React.useState<string | null>(null);

    const handleImageToggle = (imageId: string) => {
        setSelectedImages((prev) =>
            prev.includes(imageId) ? prev.filter((id) => id !== imageId) : [...prev, imageId]
        );
    };

    const handleSelectAll = () => {
        if (selectedImages.length === images.length) {
            setSelectedImages([]);
        } else {
            setSelectedImages(images.map((img) => img.id));
        }
    };

    const handleBatchDownloadSelected = () => {
        const selectedImageObjects = images.filter((img) => selectedImages.includes(img.id));
        onBatchDownload(selectedImageObjects);
    };

    const handleCopyImageUrl = async (image: GeneratedImage) => {
        try {
            await navigator.clipboard.writeText(image.url);
            setCopiedImageId(image.id);
            setTimeout(() => setCopiedImageId(null), 2000);
        } catch (err) {
            console.error('Failed to copy image URL:', err);
        }
    };

    const getGridColumns = (size: GridSize): string => {
        switch (size) {
            case '2x2':
                return 'grid-cols-2';
            case '3x3':
                return 'grid-cols-3';
            case '4x4':
                return 'grid-cols-4';
            default:
                return 'grid-cols-2';
        }
    };

    const groupedImages = React.useMemo(() => {
        const groups: Record<string, GeneratedImage[]> = {};
        images.forEach((image) => {
            const key = image.presetName || 'No Preset';
            if (!groups[key]) groups[key] = [];
            groups[key].push(image);
        });
        return groups;
    }, [images]);

    return (
        <div className={cn('space-y-4', className)}>
            <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)} className='w-full'>
                <div className='flex items-center justify-between'>
                    <TabsList>
                        <TabsTrigger value='grid' className='flex items-center gap-2'>
                            <LayoutGrid className='h-4 w-4' />
                            Grid View
                        </TabsTrigger>
                        <TabsTrigger value='comparison' className='flex items-center gap-2'>
                            <Grid3X3 className='h-4 w-4' />
                            Compare
                        </TabsTrigger>
                        <TabsTrigger value='detail' className='flex items-center gap-2'>
                            <Eye className='h-4 w-4' />
                            Detail
                        </TabsTrigger>
                    </TabsList>

                    <div className='flex items-center gap-2'>
                        {images.length > 0 && (
                            <>
                                <span className='text-muted-foreground text-sm'>
                                    {selectedImages.length} of {images.length} selected
                                </span>
                                <Button size='sm' variant='outline' onClick={handleSelectAll}>
                                    {selectedImages.length === images.length ? 'Deselect All' : 'Select All'}
                                </Button>
                                {selectedImages.length > 0 && (
                                    <Button
                                        size='sm'
                                        onClick={handleBatchDownloadSelected}
                                        className='flex items-center gap-2'>
                                        <Download className='h-4 w-4' />
                                        Download ({selectedImages.length})
                                    </Button>
                                )}
                            </>
                        )}
                    </div>
                </div>

                <TabsContent value='grid' className='space-y-4'>
                    {images.length === 0 ? (
                        <Card>
                            <CardContent className='pt-6'>
                                <div className='py-12 text-center'>
                                    <LayoutGrid className='text-muted-foreground mx-auto mb-4 h-16 w-16' />
                                    <h3 className='mb-2 text-xl font-semibold'>No Images Generated</h3>
                                    <p className='text-muted-foreground mb-6'>
                                        Generate images with different presets to see them here
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <>
                            <div className='flex items-center gap-2'>
                                <span className='text-sm font-medium'>Grid Size:</span>
                                {(['2x2', '3x3', '4x4'] as GridSize[]).map((size) => (
                                    <Button
                                        key={size}
                                        size='sm'
                                        variant={gridSize === size ? 'default' : 'outline'}
                                        onClick={() => setGridSize(size)}>
                                        {size}
                                    </Button>
                                ))}
                            </div>

                            <div className={cn('grid gap-4', getGridColumns(gridSize))}>
                                {images.map((image) => {
                                    const isSelected = selectedImages.includes(image.id);
                                    return (
                                        <Card
                                            key={image.id}
                                            className={cn(
                                                'group relative cursor-pointer transition-all duration-200 hover:shadow-lg',
                                                isSelected && 'ring-primary ring-2'
                                            )}
                                            onClick={() => handleImageToggle(image.id)}>
                                            <div className='relative aspect-square overflow-hidden rounded-t-lg'>
                                                <Image
                                                    src={image.url}
                                                    alt={`Generated with ${image.presetName || 'preset'}`}
                                                    fill
                                                    className='object-cover transition-transform group-hover:scale-105'
                                                    sizes='(max-width: 768px) 50vw, 33vw'
                                                />

                                                {/* Overlay Controls */}
                                                <div className='absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity duration-200 group-hover:opacity-100'>
                                                    <div className='flex gap-2'>
                                                        <Button
                                                            size='sm'
                                                            variant='secondary'
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setDetailImage(image);
                                                                setViewMode('detail');
                                                            }}>
                                                            <Maximize2 className='h-4 w-4' />
                                                        </Button>
                                                        <Button
                                                            size='sm'
                                                            variant='secondary'
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleCopyImageUrl(image);
                                                            }}>
                                                            {copiedImageId === image.id ? (
                                                                <Check className='h-4 w-4 text-green-600' />
                                                            ) : (
                                                                <Copy className='h-4 w-4' />
                                                            )}
                                                        </Button>
                                                    </div>
                                                </div>

                                                {/* Selection Indicator */}
                                                {isSelected && (
                                                    <div className='bg-primary text-primary-foreground absolute top-2 right-2 rounded-full p-1'>
                                                        <Check className='h-3 w-3' />
                                                    </div>
                                                )}

                                                {/* Preset Badge */}
                                                {image.presetName && (
                                                    <div className='bg-background/90 text-foreground absolute top-2 left-2 rounded px-2 py-1 text-xs font-medium'>
                                                        {image.presetName}
                                                    </div>
                                                )}
                                            </div>

                                            <CardContent className='p-3'>
                                                <div className='space-y-2'>
                                                    <p className='truncate text-xs font-medium' title={image.prompt}>
                                                        {image.prompt}
                                                    </p>
                                                    <div className='text-muted-foreground flex items-center justify-between text-xs'>
                                                        <span>{new Date(image.timestamp).toLocaleTimeString()}</span>
                                                        {image.costDetails && (
                                                            <span>
                                                                ${image.costDetails.estimated_cost_usd.toFixed(4)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </TabsContent>

                <TabsContent value='comparison' className='space-y-4'>
                    {Object.keys(groupedImages).length === 0 ? (
                        <Card>
                            <CardContent className='pt-6'>
                                <div className='py-12 text-center'>
                                    <Grid3X3 className='text-muted-foreground mx-auto mb-4 h-16 w-16' />
                                    <h3 className='mb-2 text-xl font-semibold'>No Presets to Compare</h3>
                                    <p className='text-muted-foreground mb-6'>
                                        Generate images with different moodboard presets to compare them
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className='space-y-6'>
                            {Object.entries(groupedImages).map(([presetName, presetImages]) => (
                                <Card key={presetName}>
                                    <CardHeader>
                                        <div className='flex items-center justify-between'>
                                            <div>
                                                <CardTitle className='text-lg'>{presetName}</CardTitle>
                                                <CardDescription>
                                                    {presetImages.length} image{presetImages.length !== 1 ? 's' : ''}
                                                </CardDescription>
                                            </div>
                                            <Button
                                                size='sm'
                                                variant='outline'
                                                onClick={() =>
                                                    presetImages[0]?.presetId &&
                                                    onRegenerateWithPreset(presetImages[0].presetId)
                                                }
                                                disabled={!presetImages[0]?.presetId}>
                                                <RotateCcw className='mr-2 h-4 w-4' />
                                                Regenerate
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className='grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4'>
                                            {presetImages.map((image) => (
                                                <div key={image.id} className='space-y-2'>
                                                    <div className='relative aspect-square overflow-hidden rounded-lg'>
                                                        <Image
                                                            src={image.url}
                                                            alt={`${presetName} variant`}
                                                            fill
                                                            className='object-cover'
                                                            sizes='(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw'
                                                        />
                                                    </div>
                                                    <div className='flex gap-1'>
                                                        <Button
                                                            size='sm'
                                                            variant='outline'
                                                            className='flex-1'
                                                            onClick={() => {
                                                                setDetailImage(image);
                                                                setViewMode('detail');
                                                            }}>
                                                            <Eye className='mr-1 h-3 w-3' />
                                                            View
                                                        </Button>
                                                        <Button
                                                            size='sm'
                                                            variant='outline'
                                                            onClick={() => onBatchDownload([image])}>
                                                            <Download className='h-3 w-3' />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value='detail' className='space-y-4'>
                    {!detailImage ? (
                        <Card>
                            <CardContent className='pt-6'>
                                <div className='py-12 text-center'>
                                    <Eye className='text-muted-foreground mx-auto mb-4 h-16 w-16' />
                                    <h3 className='mb-2 text-xl font-semibold'>No Image Selected</h3>
                                    <p className='text-muted-foreground mb-6'>
                                        Select an image from the grid to view details
                                    </p>
                                    <Button onClick={() => setViewMode('grid')}>Browse Images</Button>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className='grid gap-6 lg:grid-cols-2'>
                            {/* Image Display */}
                            <Card>
                                <CardContent className='p-0'>
                                    <div className='relative aspect-square'>
                                        <Image
                                            src={detailImage.url}
                                            alt='Detailed view'
                                            fill
                                            className='rounded-lg object-cover'
                                            sizes='50vw'
                                        />
                                        <Button
                                            size='sm'
                                            variant='secondary'
                                            className='absolute top-4 right-4'
                                            onClick={() => setDetailImage(null)}>
                                            <X className='h-4 w-4' />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Image Details */}
                            <div className='space-y-4'>
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Image Details</CardTitle>
                                    </CardHeader>
                                    <CardContent className='space-y-4'>
                                        <div>
                                            <label className='text-muted-foreground text-sm font-medium'>Preset</label>
                                            <p className='font-medium'>{detailImage.presetName || 'No Preset'}</p>
                                        </div>

                                        <div>
                                            <label className='text-muted-foreground text-sm font-medium'>Prompt</label>
                                            <p className='bg-muted rounded p-2 text-sm'>{detailImage.prompt}</p>
                                        </div>

                                        <div>
                                            <label className='text-muted-foreground text-sm font-medium'>
                                                Generated
                                            </label>
                                            <p>{new Date(detailImage.timestamp).toLocaleString()}</p>
                                        </div>

                                        {detailImage.costDetails && (
                                            <div>
                                                <label className='text-muted-foreground text-sm font-medium'>
                                                    Cost
                                                </label>
                                                <p>${detailImage.costDetails.estimated_cost_usd.toFixed(4)} USD</p>
                                            </div>
                                        )}

                                        <div className='flex gap-2 pt-4'>
                                            <Button onClick={() => onBatchDownload([detailImage])} className='flex-1'>
                                                <Download className='mr-2 h-4 w-4' />
                                                Download
                                            </Button>
                                            <Button variant='outline' onClick={() => handleCopyImageUrl(detailImage)}>
                                                {copiedImageId === detailImage.id ? (
                                                    <Check className='h-4 w-4 text-green-600' />
                                                ) : (
                                                    <Share2 className='h-4 w-4' />
                                                )}
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
