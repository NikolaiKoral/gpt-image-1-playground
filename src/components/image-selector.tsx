'use client';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MultiImageDropZone, type ImageFile } from '@/components/multi-image-dropzone';
import { cn } from '@/lib/utils';
import { Check, Image as ImageIcon, Upload, MoveLeft, MoveRight } from 'lucide-react';
import Image from 'next/image';
import * as React from 'react';
import type { ImageSource } from '@/types/video';

interface ImageSelectorProps {
    selectedImages: ImageSource[];
    onSelectionChange: (images: ImageSource[]) => void;
    availableImages: Array<{ filename: string; path: string; createdAt: string }>;
    maxImages?: number;
    disabled?: boolean;
}

export function ImageSelector({
    selectedImages,
    onSelectionChange,
    availableImages,
    maxImages = 2,
    disabled = false
}: ImageSelectorProps) {
    const [uploadedImages, setUploadedImages] = React.useState<ImageFile[]>([]);
    const [selectedMode, setSelectedMode] = React.useState<'history' | 'upload'>('history');

    // Handle selection from history
    const handleHistoryImageToggle = (image: { filename: string; path: string }) => {
        const isSelected = selectedImages.some(img => img.filename === image.filename);
        
        if (isSelected) {
            // Remove from selection
            onSelectionChange(selectedImages.filter(img => img.filename !== image.filename));
        } else {
            // Add to selection (if under limit)
            if (selectedImages.length < maxImages) {
                const newImage: ImageSource = {
                    type: 'generated',
                    url: image.path,
                    filename: image.filename,
                    position: selectedImages.length === 0 ? 'first' : 'last',
                    id: `history-${image.filename}`
                };
                onSelectionChange([...selectedImages, newImage]);
            }
        }
    };

    // Handle uploaded images
    const handleUploadedImagesChange = React.useCallback(
        (newImageFiles: ImageFile[]) => {
            setUploadedImages(newImageFiles);
            
            // Convert to ImageSource format
            const uploadedSources: ImageSource[] = newImageFiles.map((imageFile, index) => ({
                type: 'uploaded',
                file: imageFile.file,
                url: imageFile.previewUrl,
                position: index === 0 ? 'first' : 'last',
                id: imageFile.id
            }));

            // Replace uploaded images in selection
            const nonUploadedImages = selectedImages.filter(img => img.type !== 'uploaded');
            onSelectionChange([...nonUploadedImages, ...uploadedSources]);
        },
        [selectedImages, onSelectionChange]
    );

    // Handle position change
    const handlePositionChange = (imageId: string, position: 'first' | 'last') => {
        const updatedImages = selectedImages.map(img => 
            img.id === imageId ? { ...img, position } : img
        );
        onSelectionChange(updatedImages);
    };

    const selectedCount = selectedImages.length;
    const canSelectMore = selectedCount < maxImages;

    return (
        <div className='space-y-4'>
            <div className='flex items-center justify-between'>
                <Label className='text-white'>
                    Vælg billeder ({selectedCount}/{maxImages})
                </Label>
                {selectedCount > 0 && (
                    <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => onSelectionChange([])}
                        disabled={disabled}
                        className='text-white/60 hover:text-white'>
                        Ryd valg
                    </Button>
                )}
            </div>

            <Tabs value={selectedMode} onValueChange={(value) => setSelectedMode(value as 'history' | 'upload')}>
                <TabsList className='grid w-full grid-cols-2 bg-black/50'>
                    <TabsTrigger value='history' className='flex items-center gap-2'>
                        <ImageIcon className='h-4 w-4' />
                        Fra historik
                    </TabsTrigger>
                    <TabsTrigger value='upload' className='flex items-center gap-2'>
                        <Upload className='h-4 w-4' />
                        Upload nye
                    </TabsTrigger>
                </TabsList>

                <TabsContent value='history' className='space-y-3'>
                    {availableImages.length === 0 ? (
                        <div className='text-center py-8 text-white/60'>
                            <ImageIcon className='h-12 w-12 mx-auto mb-2 opacity-50' />
                            <p>Ingen billeder i historik</p>
                            <p className='text-sm'>Generer nogle billeder først</p>
                        </div>
                    ) : (
                        <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-64 overflow-y-auto'>
                            {availableImages.map((image) => {
                                const isSelected = selectedImages.some(img => img.filename === image.filename);
                                return (
                                    <div
                                        key={image.filename}
                                        className={cn(
                                            'relative aspect-square rounded border cursor-pointer transition-all',
                                            isSelected
                                                ? 'border-blue-500 ring-2 ring-blue-500/30'
                                                : 'border-white/10 hover:border-white/30',
                                            !canSelectMore && !isSelected && 'opacity-50 cursor-not-allowed',
                                            disabled && 'pointer-events-none opacity-50'
                                        )}
                                        onClick={() => {
                                            if (!disabled && (canSelectMore || isSelected)) {
                                                handleHistoryImageToggle(image);
                                            }
                                        }}>
                                        <Image
                                            src={image.path}
                                            alt={`Generated image`}
                                            fill
                                            className='object-cover rounded'
                                            sizes='(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw'
                                            unoptimized
                                        />
                                        {isSelected && (
                                            <div className='absolute inset-0 bg-blue-500/20 rounded flex items-center justify-center'>
                                                <Check className='h-6 w-6 text-white' />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value='upload' className='space-y-3'>
                    <MultiImageDropZone
                        images={uploadedImages}
                        onImagesChange={handleUploadedImagesChange}
                        maxImages={maxImages}
                        disabled={disabled}
                        accept='image/*'
                    />
                    {uploadedImages.length > 0 && (
                        <p className='text-xs text-white/60'>
                            Uploadede billeder vil blive brugt til video generering
                        </p>
                    )}
                </TabsContent>
            </Tabs>

            {/* Position controls for selected images */}
            {selectedImages.length > 1 && (
                <div className='space-y-2'>
                    <Label className='text-white text-sm'>Billede positioner</Label>
                    <div className='grid gap-2'>
                        {selectedImages.map((image, index) => (
                            <div key={image.id} className='flex items-center gap-3 p-2 rounded bg-white/5'>
                                <div className='w-12 h-12 relative rounded overflow-hidden'>
                                    <Image
                                        src={image.url || ''}
                                        alt={`Selected image ${index + 1}`}
                                        fill
                                        className='object-cover'
                                        sizes='48px'
                                        unoptimized
                                    />
                                </div>
                                <div className='flex-1'>
                                    <p className='text-sm text-white/80'>
                                        {image.filename || `Upload ${index + 1}`}
                                    </p>
                                </div>
                                <div className='flex gap-1'>
                                    <Button
                                        variant={image.position === 'first' ? 'default' : 'outline'}
                                        size='sm'
                                        onClick={() => handlePositionChange(image.id, 'first')}
                                        disabled={disabled}
                                        className='h-8 px-2'>
                                        <MoveLeft className='h-3 w-3 mr-1' />
                                        Start
                                    </Button>
                                    <Button
                                        variant={image.position === 'last' ? 'default' : 'outline'}
                                        size='sm'
                                        onClick={() => handlePositionChange(image.id, 'last')}
                                        disabled={disabled}
                                        className='h-8 px-2'>
                                        <MoveRight className='h-3 w-3 mr-1' />
                                        Slut
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <p className='text-xs text-white/60'>
                        Vælg om billedet skal være første eller sidste frame i videoen
                    </p>
                </div>
            )}

            {!canSelectMore && (
                <p className='text-xs text-yellow-400'>
                    Du kan vælge op til {maxImages} billeder
                </p>
            )}
        </div>
    );
}