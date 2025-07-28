'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
    Download,
    Grid3X3,
    LayoutGrid,
    Maximize2,
    RotateCcw,
    Share2,
    Eye,
    Copy,
    Check,
    X
} from 'lucide-react';
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

export function MoodboardCenter({
    images,
    onBatchDownload,
    onRegenerateWithPreset,
    className
}: MoodboardCenterProps) {
    const [viewMode, setViewMode] = React.useState<ViewMode>('grid');
    const [gridSize, setGridSize] = React.useState<GridSize>('2x2');
    const [selectedImages, setSelectedImages] = React.useState<string[]>([]);
    const [detailImage, setDetailImage] = React.useState<GeneratedImage | null>(null);
    const [copiedImageId, setCopiedImageId] = React.useState<string | null>(null);

    const handleImageToggle = (imageId: string) => {
        setSelectedImages(prev =>
            prev.includes(imageId)
                ? prev.filter(id => id !== imageId)
                : [...prev, imageId]
        );
    };

    const handleSelectAll = () => {
        if (selectedImages.length === images.length) {
            setSelectedImages([]);
        } else {
            setSelectedImages(images.map(img => img.id));
        }
    };

    const handleBatchDownloadSelected = () => {
        const selectedImageObjects = images.filter(img => selectedImages.includes(img.id));
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
            case '2x2': return 'grid-cols-2';
            case '3x3': return 'grid-cols-3';
            case '4x4': return 'grid-cols-4';
            default: return 'grid-cols-2';
        }
    };

    const groupedImages = React.useMemo(() => {
        const groups: Record<string, GeneratedImage[]> = {};
        images.forEach(image => {
            const key = image.presetName || 'No Preset';
            if (!groups[key]) groups[key] = [];
            groups[key].push(image);
        });
        return groups;
    }, [images]);

    return (
        <div className={cn('space-y-4', className)}>
            <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)} className="w-full">
                <div className="flex items-center justify-between">
                    <TabsList>
                        <TabsTrigger value="grid" className="flex items-center gap-2">
                            <LayoutGrid className="h-4 w-4" />
                            Grid View
                        </TabsTrigger>
                        <TabsTrigger value="comparison" className="flex items-center gap-2">
                            <Grid3X3 className="h-4 w-4" />
                            Compare
                        </TabsTrigger>
                        <TabsTrigger value="detail" className="flex items-center gap-2">
                            <Eye className="h-4 w-4" />
                            Detail
                        </TabsTrigger>
                    </TabsList>

                    <div className="flex items-center gap-2">
                        {images.length > 0 && (
                            <>
                                <span className="text-sm text-muted-foreground">
                                    {selectedImages.length} of {images.length} selected
                                </span>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={handleSelectAll}
                                >
                                    {selectedImages.length === images.length ? 'Deselect All' : 'Select All'}
                                </Button>
                                {selectedImages.length > 0 && (
                                    <Button
                                        size="sm"
                                        onClick={handleBatchDownloadSelected}
                                        className="flex items-center gap-2"
                                    >
                                        <Download className="h-4 w-4" />
                                        Download ({selectedImages.length})
                                    </Button>
                                )}
                            </>
                        )}
                    </div>
                </div>

                <TabsContent value="grid" className="space-y-4">
                    {images.length === 0 ? (
                        <Card>
                            <CardContent className="pt-6">
                                <div className="text-center py-12">
                                    <LayoutGrid className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                                    <h3 className="text-xl font-semibold mb-2">No Images Generated</h3>
                                    <p className="text-muted-foreground mb-6">
                                        Generate images with different presets to see them here
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">Grid Size:</span>
                                {(['2x2', '3x3', '4x4'] as GridSize[]).map(size => (
                                    <Button
                                        key={size}
                                        size="sm"
                                        variant={gridSize === size ? "default" : "outline"}
                                        onClick={() => setGridSize(size)}
                                    >
                                        {size}
                                    </Button>
                                ))}
                            </div>

                            <div className={cn('grid gap-4', getGridColumns(gridSize))}>
                                {images.map(image => {
                                    const isSelected = selectedImages.includes(image.id);
                                    return (
                                        <Card
                                            key={image.id}
                                            className={cn(
                                                'group relative cursor-pointer transition-all duration-200 hover:shadow-lg',
                                                isSelected && 'ring-2 ring-primary'
                                            )}
                                            onClick={() => handleImageToggle(image.id)}
                                        >
                                            <div className="aspect-square relative overflow-hidden rounded-t-lg">
                                                <Image
                                                    src={image.url}
                                                    alt={`Generated with ${image.presetName || 'preset'}`}
                                                    fill
                                                    className="object-cover transition-transform group-hover:scale-105"
                                                    sizes="(max-width: 768px) 50vw, 33vw"
                                                />

                                                {/* Overlay Controls */}
                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                                                    <div className="flex gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="secondary"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setDetailImage(image);
                                                                setViewMode('detail');
                                                            }}
                                                        >
                                                            <Maximize2 className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="secondary"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleCopyImageUrl(image);
                                                            }}
                                                        >
                                                            {copiedImageId === image.id ? (
                                                                <Check className="h-4 w-4 text-green-600" />
                                                            ) : (
                                                                <Copy className="h-4 w-4" />
                                                            )}
                                                        </Button>
                                                    </div>
                                                </div>

                                                {/* Selection Indicator */}
                                                {isSelected && (
                                                    <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                                                        <Check className="h-3 w-3" />
                                                    </div>
                                                )}

                                                {/* Preset Badge */}
                                                {image.presetName && (
                                                    <div className="absolute top-2 left-2 bg-background/90 text-foreground px-2 py-1 rounded text-xs font-medium">
                                                        {image.presetName}
                                                    </div>
                                                )}
                                            </div>

                                            <CardContent className="p-3">
                                                <div className="space-y-2">
                                                    <p className="text-xs font-medium truncate" title={image.prompt}>
                                                        {image.prompt}
                                                    </p>
                                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                                        <span>{new Date(image.timestamp).toLocaleTimeString()}</span>
                                                        {image.costDetails && (
                                                            <span>${image.costDetails.estimated_cost_usd.toFixed(4)}</span>
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

                <TabsContent value="comparison" className="space-y-4">
                    {Object.keys(groupedImages).length === 0 ? (
                        <Card>
                            <CardContent className="pt-6">
                                <div className="text-center py-12">
                                    <Grid3X3 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                                    <h3 className="text-xl font-semibold mb-2">No Presets to Compare</h3>
                                    <p className="text-muted-foreground mb-6">
                                        Generate images with different moodboard presets to compare them
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-6">
                            {Object.entries(groupedImages).map(([presetName, presetImages]) => (
                                <Card key={presetName}>
                                    <CardHeader>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <CardTitle className="text-lg">{presetName}</CardTitle>
                                                <CardDescription>
                                                    {presetImages.length} image{presetImages.length !== 1 ? 's' : ''}
                                                </CardDescription>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => presetImages[0]?.presetId && onRegenerateWithPreset(presetImages[0].presetId)}
                                                disabled={!presetImages[0]?.presetId}
                                            >
                                                <RotateCcw className="h-4 w-4 mr-2" />
                                                Regenerate
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                            {presetImages.map(image => (
                                                <div key={image.id} className="space-y-2">
                                                    <div className="aspect-square relative overflow-hidden rounded-lg">
                                                        <Image
                                                            src={image.url}
                                                            alt={`${presetName} variant`}
                                                            fill
                                                            className="object-cover"
                                                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                                        />
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="flex-1"
                                                            onClick={() => {
                                                                setDetailImage(image);
                                                                setViewMode('detail');
                                                            }}
                                                        >
                                                            <Eye className="h-3 w-3 mr-1" />
                                                            View
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => onBatchDownload([image])}
                                                        >
                                                            <Download className="h-3 w-3" />
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

                <TabsContent value="detail" className="space-y-4">
                    {!detailImage ? (
                        <Card>
                            <CardContent className="pt-6">
                                <div className="text-center py-12">
                                    <Eye className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                                    <h3 className="text-xl font-semibold mb-2">No Image Selected</h3>
                                    <p className="text-muted-foreground mb-6">
                                        Select an image from the grid to view details
                                    </p>
                                    <Button onClick={() => setViewMode('grid')}>
                                        Browse Images
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid lg:grid-cols-2 gap-6">
                            {/* Image Display */}
                            <Card>
                                <CardContent className="p-0">
                                    <div className="aspect-square relative">
                                        <Image
                                            src={detailImage.url}
                                            alt="Detailed view"
                                            fill
                                            className="object-cover rounded-lg"
                                            sizes="50vw"
                                        />
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            className="absolute top-4 right-4"
                                            onClick={() => setDetailImage(null)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Image Details */}
                            <div className="space-y-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Image Details</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div>
                                            <label className="text-sm font-medium text-muted-foreground">Preset</label>
                                            <p className="font-medium">{detailImage.presetName || 'No Preset'}</p>
                                        </div>

                                        <div>
                                            <label className="text-sm font-medium text-muted-foreground">Prompt</label>
                                            <p className="text-sm bg-muted p-2 rounded">{detailImage.prompt}</p>
                                        </div>

                                        <div>
                                            <label className="text-sm font-medium text-muted-foreground">Generated</label>
                                            <p>{new Date(detailImage.timestamp).toLocaleString()}</p>
                                        </div>

                                        {detailImage.costDetails && (
                                            <div>
                                                <label className="text-sm font-medium text-muted-foreground">Cost</label>
                                                <p>${detailImage.costDetails.estimated_cost_usd.toFixed(4)} USD</p>
                                            </div>
                                        )}

                                        <div className="flex gap-2 pt-4">
                                            <Button onClick={() => onBatchDownload([detailImage])} className="flex-1">
                                                <Download className="h-4 w-4 mr-2" />
                                                Download
                                            </Button>
                                            <Button 
                                                variant="outline" 
                                                onClick={() => handleCopyImageUrl(detailImage)}
                                            >
                                                {copiedImageId === detailImage.id ? (
                                                    <Check className="h-4 w-4 text-green-600" />
                                                ) : (
                                                    <Share2 className="h-4 w-4" />
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