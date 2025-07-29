'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useDragDrop } from '@/hooks/use-drag-drop';
import { cn } from '@/lib/utils';
import {
    Upload,
    X,
    Image as ImageIcon,
    AlertCircle,
    Move,
    Plus
} from 'lucide-react';
import Image from 'next/image';
import * as React from 'react';

export interface ImageFile {
    file: File;
    previewUrl: string;
    id: string;
}

interface MultiImageDropZoneProps {
    images: ImageFile[];
    onImagesChange: (images: ImageFile[]) => void;
    maxImages?: number;
    maxFileSize?: number;
    disabled?: boolean;
    className?: string;
}

export function MultiImageDropZone({
    images,
    onImagesChange,
    maxImages = 10,
    maxFileSize = 10 * 1024 * 1024, // 10MB
    disabled = false,
    className
}: MultiImageDropZoneProps) {
    const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);
    const [draggedOverIndex, setDraggedOverIndex] = React.useState<number | null>(null);

    // Helper function to ensure valid preview URL
    const ensureValidPreviewUrl = React.useCallback((imageFile: ImageFile): string => {
        // If preview URL exists and is valid, use it
        if (imageFile.previewUrl && imageFile.previewUrl.startsWith('blob:')) {
            return imageFile.previewUrl;
        }
        
        // Otherwise, create a new one
        console.log(`Recreating preview URL for ${imageFile.file.name}`);
        return URL.createObjectURL(imageFile.file);
    }, []);

    const handleDrop = React.useCallback((newFiles: File[]) => {
        const availableSlots = maxImages - images.length;
        const filesToAdd = newFiles.slice(0, availableSlots);
        
        const newImageFiles: ImageFile[] = filesToAdd.map(file => ({
            file,
            previewUrl: URL.createObjectURL(file),
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        }));

        onImagesChange([...images, ...newImageFiles]);
    }, [images, maxImages, onImagesChange]);

    const {
        isDragActive,
        isDragAccept,
        isDragReject,
        getRootProps,
        getInputProps
    } = useDragDrop({
        onDrop: handleDrop,
        accept: ['image/*'],
        maxFiles: maxImages,
        maxSize: maxFileSize,
        multiple: true,
        disabled: disabled || images.length >= maxImages
    });

    const removeImage = React.useCallback((indexToRemove: number) => {
        const imageToRemove = images[indexToRemove];
        if (imageToRemove?.previewUrl && imageToRemove.previewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(imageToRemove.previewUrl);
        }
        
        const newImages = images.filter((_, index) => index !== indexToRemove);
        onImagesChange(newImages);
    }, [images, onImagesChange]);

    const moveImage = React.useCallback((fromIndex: number, toIndex: number) => {
        if (fromIndex === toIndex) return;
        
        const newImages = [...images];
        const [movedImage] = newImages.splice(fromIndex, 1);
        newImages.splice(toIndex, 0, movedImage);
        onImagesChange(newImages);
    }, [images, onImagesChange]);

    // Cleanup preview URLs on unmount only
    React.useEffect(() => {
        return () => {
            images.forEach(image => {
                if (image.previewUrl && image.previewUrl.startsWith('blob:')) {
                    URL.revokeObjectURL(image.previewUrl);
                }
            });
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only cleanup on unmount, not on images change - intentionally excluding 'images' dependency

    const handleImageDragStart = (e: React.DragEvent, index: number) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleImageDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDraggedOverIndex(index);
    };

    const handleImageDragLeave = () => {
        setDraggedOverIndex(null);
    };

    const handleImageDrop = (e: React.DragEvent, dropIndex: number) => {
        e.preventDefault();
        if (draggedIndex !== null && draggedIndex !== dropIndex) {
            moveImage(draggedIndex, dropIndex);
        }
        setDraggedIndex(null);
        setDraggedOverIndex(null);
    };

    const canAddMoreImages = images.length < maxImages;

    return (
        <div className={cn('space-y-4', className)}>
            {/* Drop Zone */}
            {canAddMoreImages && (
                <Card
                    className={cn(
                        'relative border-2 border-dashed transition-colors duration-200 cursor-pointer',
                        'hover:border-primary/50 hover:bg-primary/5',
                        {
                            'border-green-500 bg-green-50 dark:bg-green-950/20': isDragAccept,
                            'border-red-500 bg-red-50 dark:bg-red-950/20': isDragReject,
                            'border-blue-500 bg-blue-50 dark:bg-blue-950/20': isDragActive && !isDragReject,
                            'opacity-50 cursor-not-allowed': disabled,
                            'border-muted-foreground/25': !isDragActive
                        }
                    )}
                    {...getRootProps()}
                >
                    <input {...getInputProps()} />
                    <div className="flex flex-col items-center justify-center p-8 text-center">
                        {isDragActive ? (
                            isDragAccept ? (
                                <div className="flex flex-col items-center space-y-2 text-green-600">
                                    <Upload className="h-8 w-8" />
                                    <p className="text-sm font-medium">Slip billeder her</p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center space-y-2 text-red-600">
                                    <AlertCircle className="h-8 w-8" />
                                    <p className="text-sm font-medium">Invalid file type</p>
                                </div>
                            )
                        ) : (
                            <div className="flex flex-col items-center space-y-2">
                                <ImageIcon className="h-8 w-8 text-muted-foreground" />
                                <div className="space-y-1">
                                    <p className="text-sm font-medium">
                                        Træk og slip billeder her, eller{' '}
                                        <span className="text-primary underline">gennemse</span>
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        PNG, JPG, WebP op til {Math.round(maxFileSize / (1024 * 1024))}MB
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </Card>
            )}

            {/* Image Grid */}
            {images.length > 0 && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">
                            Selected Images ({images.length}/{maxImages})
                        </p>
                        {!canAddMoreImages && (
                            <p className="text-xs text-muted-foreground">
                                Maksimum antal billeder nået
                            </p>
                        )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                        {images.map((imageFile, index) => (
                            <Card
                                key={imageFile.id}
                                className={cn(
                                    'group relative overflow-hidden cursor-move transition-all duration-200',
                                    'hover:shadow-md hover:scale-105',
                                    {
                                        'ring-2 ring-primary ring-offset-2': draggedIndex === index,
                                        'ring-2 ring-blue-500 ring-offset-2': draggedOverIndex === index && draggedIndex !== index
                                    }
                                )}
                                draggable
                                onDragStart={(e) => handleImageDragStart(e, index)}
                                onDragOver={(e) => handleImageDragOver(e, index)}
                                onDragLeave={handleImageDragLeave}
                                onDrop={(e) => handleImageDrop(e, index)}
                            >
                                <div className="aspect-square relative">
                                    <Image
                                        src={ensureValidPreviewUrl(imageFile)}
                                        alt={`Preview ${index + 1}`}
                                        fill
                                        className="object-cover"
                                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                        onError={(e) => {
                                            console.error(`Failed to load image preview for ${imageFile.file.name}:`, e);
                                            console.log('Preview URL:', imageFile.previewUrl);
                                        }}
                                        onLoad={() => {
                                            console.log(`Successfully loaded preview for ${imageFile.file.name}`);
                                        }}
                                    />
                                    
                                    {/* Overlay with controls */}
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                                        <div className="flex space-x-2">
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                className="h-8 w-8 p-0"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    removeImage(index);
                                                }}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                            <div className="flex items-center justify-center h-8 w-8 bg-background/90 rounded text-xs font-medium">
                                                <Move className="h-3 w-3" />
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Image number badge */}
                                    <div className="absolute top-2 left-2 bg-background/90 text-foreground text-xs font-medium px-2 py-1 rounded">
                                        {index + 1}
                                    </div>
                                </div>
                                
                                {/* File info */}
                                <div className="p-3 space-y-1">
                                    <p className="text-xs font-medium truncate" title={imageFile.file.name}>
                                        {imageFile.file.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {(imageFile.file.size / (1024 * 1024)).toFixed(1)} MB
                                    </p>
                                </div>
                            </Card>
                        ))}
                        
                        {/* Add more button */}
                        {canAddMoreImages && (
                            <Card
                                className="aspect-square border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 hover:bg-primary/5 transition-colors duration-200 cursor-pointer"
                                {...getRootProps()}
                            >
                                <input {...getInputProps()} />
                                <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                                    <Plus className="h-8 w-8 mb-2" />
                                    <p className="text-xs text-center">Tilføj flere</p>
                                </div>
                            </Card>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}