'use client';

import { ModeToggle } from '@/components/mode-toggle';
import { MultiImageDropZone, type ImageFile } from '@/components/multi-image-dropzone';
import { PromptTemplateSelector } from '@/components/prompt-template-selector';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
    Eraser,
    Save,
    Loader2,
    ScanEye,
    UploadCloud,
    Lock,
    LockOpen
} from 'lucide-react';
import Image from 'next/image';
import * as React from 'react';

type DrawnPoint = {
    x: number;
    y: number;
    size: number;
};

export type EditingFormData = {
    prompt: string;
    n: number;
    size: '1024x1024' | '1536x1024' | '1024x1536' | 'auto';
    quality: 'low' | 'medium' | 'high' | 'auto';
    imageFiles: File[];
    maskFile: File | null;
};

type EditingFormProps = {
    onSubmit: (data: EditingFormData) => void;
    isLoading: boolean;
    currentMode: 'generate' | 'edit';
    onModeChange: (mode: 'generate' | 'edit') => void;
    isPasswordRequiredByBackend: boolean | null;
    clientPasswordHash: string | null;
    onOpenPasswordDialog: () => void;
    imageFiles: File[];
    sourceImagePreviewUrls: string[];
    setImageFiles: React.Dispatch<React.SetStateAction<File[]>>;
    setSourceImagePreviewUrls: React.Dispatch<React.SetStateAction<string[]>>;
    maxImages: number;
    editPrompt: string;
    setEditPrompt: React.Dispatch<React.SetStateAction<string>>;
    editN: number[];
    setEditN: React.Dispatch<React.SetStateAction<number[]>>;
    isEditingGeneratedImage: boolean;
    editBrushSize: number[];
    setEditBrushSize: React.Dispatch<React.SetStateAction<number[]>>;
    editShowMaskEditor: boolean;
    setEditShowMaskEditor: React.Dispatch<React.SetStateAction<boolean>>;
    editGeneratedMaskFile: File | null;
    setEditGeneratedMaskFile: React.Dispatch<React.SetStateAction<File | null>>;
    editIsMaskSaved: boolean;
    setEditIsMaskSaved: React.Dispatch<React.SetStateAction<boolean>>;
    editOriginalImageSize: { width: number; height: number } | null;
    setEditOriginalImageSize: React.Dispatch<React.SetStateAction<{ width: number; height: number } | null>>;
    editDrawnPoints: DrawnPoint[];
    setEditDrawnPoints: React.Dispatch<React.SetStateAction<DrawnPoint[]>>;
    editMaskPreviewUrl: string | null;
    setEditMaskPreviewUrl: React.Dispatch<React.SetStateAction<string | null>>;
};

// const RadioItemWithIcon = ({ // Commented out - radio selectors removed  
//     value,
//     id,
//     label,
//     Icon
// }: {
//     value: string;
//     id: string;
//     label: string;
//     Icon: React.ElementType;
// }) => (
//     <div className='flex items-center space-x-2'>
//         <RadioGroupItem
//             value={value}
//             id={id}
//             className='border-white/40 text-white data-[state=checked]:border-white data-[state=checked]:text-white'
//         />
//         <Label htmlFor={id} className='flex cursor-pointer items-center gap-2 text-base text-white/80'>
//             <Icon className='h-5 w-5 text-white/60' />
//             {label}
//         </Label>
//     </div>
// );

export function EditingForm({
    onSubmit,
    isLoading,
    currentMode,
    onModeChange,
    isPasswordRequiredByBackend,
    clientPasswordHash,
    onOpenPasswordDialog,
    imageFiles,
    sourceImagePreviewUrls,
    setImageFiles,
    setSourceImagePreviewUrls,
    maxImages,
    editPrompt,
    setEditPrompt,
    editN,
    setEditN,
    isEditingGeneratedImage,
    editBrushSize,
    setEditBrushSize,
    editShowMaskEditor,
    setEditShowMaskEditor,
    editGeneratedMaskFile,
    setEditGeneratedMaskFile,
    editIsMaskSaved,
    setEditIsMaskSaved,
    editOriginalImageSize,
    setEditOriginalImageSize,
    editDrawnPoints,
    setEditDrawnPoints,
    editMaskPreviewUrl,
    setEditMaskPreviewUrl
}: EditingFormProps) {
    const [firstImagePreviewUrl, setFirstImagePreviewUrl] = React.useState<string | null>(null);
    const [imageDropZoneFiles, setImageDropZoneFiles] = React.useState<ImageFile[]>([]);

    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const visualFeedbackCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
    const isDrawing = React.useRef(false);
    const lastPos = React.useRef<{ x: number; y: number } | null>(null);
    const maskInputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        if (isEditingGeneratedImage && editOriginalImageSize) {
            if (!visualFeedbackCanvasRef.current) {
                visualFeedbackCanvasRef.current = document.createElement('canvas');
            }
            visualFeedbackCanvasRef.current.width = editOriginalImageSize.width;
            visualFeedbackCanvasRef.current.height = editOriginalImageSize.height;
        }
    }, [editOriginalImageSize, isEditingGeneratedImage]);

    React.useEffect(() => {
        setEditGeneratedMaskFile(null);
        setEditIsMaskSaved(false);
        setEditOriginalImageSize(null);
        setFirstImagePreviewUrl(null);
        setEditDrawnPoints([]);
        setEditMaskPreviewUrl(null);

        if (imageFiles.length > 0 && sourceImagePreviewUrls.length > 0) {
            const img = new window.Image();
            img.onload = () => {
                setEditOriginalImageSize({ width: img.width, height: img.height });
            };
            img.src = sourceImagePreviewUrls[0];
            setFirstImagePreviewUrl(sourceImagePreviewUrls[0]);
        } else {
            setEditShowMaskEditor(false);
        }
    }, [
        imageFiles,
        sourceImagePreviewUrls,
        setEditGeneratedMaskFile,
        setEditIsMaskSaved,
        setEditOriginalImageSize,
        setEditDrawnPoints,
        setEditMaskPreviewUrl,
        setEditShowMaskEditor
    ]);

    React.useEffect(() => {
        if (!isEditingGeneratedImage) return;
        
        const displayCtx = canvasRef.current?.getContext('2d');
        const displayCanvas = canvasRef.current;
        const feedbackCanvas = visualFeedbackCanvasRef.current;

        if (!displayCtx || !displayCanvas || !feedbackCanvas || !editOriginalImageSize) return;

        const feedbackCtx = feedbackCanvas.getContext('2d');
        if (!feedbackCtx) return;

        feedbackCtx.clearRect(0, 0, feedbackCanvas.width, feedbackCanvas.height);
        feedbackCtx.fillStyle = 'red';
        editDrawnPoints.forEach((point) => {
            feedbackCtx.beginPath();
            feedbackCtx.arc(point.x, point.y, point.size, 0, Math.PI * 2);
            feedbackCtx.fill();
        });

        displayCtx.clearRect(0, 0, displayCanvas.width, displayCanvas.height);
        displayCtx.save();
        displayCtx.globalAlpha = 0.5;
        displayCtx.drawImage(feedbackCanvas, 0, 0, displayCanvas.width, displayCanvas.height);
        displayCtx.restore();
    }, [editDrawnPoints, editOriginalImageSize, isEditingGeneratedImage]);

    // Sync between old imageFiles format and new ImageFile format
    React.useEffect(() => {
        const newImageFiles: ImageFile[] = imageFiles.map((file, index) => ({
            file,
            previewUrl: sourceImagePreviewUrls[index] || URL.createObjectURL(file),
            id: `existing-${index}-${file.name}-${Date.now()}`
        }));
        setImageDropZoneFiles(newImageFiles);
    }, [imageFiles, sourceImagePreviewUrls]);

    // Handle dropzone image changes
    const handleDropZoneImagesChange = React.useCallback((newImageFiles: ImageFile[]) => {
        setImageDropZoneFiles(newImageFiles);
        
        // Update the legacy imageFiles and sourceImagePreviewUrls states
        const files = newImageFiles.map(imageFile => imageFile.file);
        const previewUrls = newImageFiles.map(imageFile => imageFile.previewUrl);
        
        setImageFiles(files);
        setSourceImagePreviewUrls(previewUrls);
    }, [setImageFiles, setSourceImagePreviewUrls]);

    // All mask-related functions - conditional on isEditingGeneratedImage
    const getMousePos = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    };

    const addPoint = (x: number, y: number) => {
        setEditDrawnPoints((prevPoints) => [...prevPoints, { x, y, size: editBrushSize[0] }]);
        setEditIsMaskSaved(false);
        setEditMaskPreviewUrl(null);
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        isDrawing.current = true;
        const currentPos = getMousePos(e);
        if (!currentPos) return;
        lastPos.current = currentPos;
        addPoint(currentPos.x, currentPos.y);
    };

    const drawLine = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing.current) return;
        e.preventDefault();
        const currentPos = getMousePos(e);
        if (!currentPos || !lastPos.current) return;

        const dist = Math.hypot(currentPos.x - lastPos.current.x, currentPos.y - lastPos.current.y);
        const angle = Math.atan2(currentPos.y - lastPos.current.y, currentPos.x - lastPos.current.x);
        const step = Math.max(1, editBrushSize[0] / 4);

        for (let i = step; i < dist; i += step) {
            const x = lastPos.current.x + Math.cos(angle) * i;
            const y = lastPos.current.y + Math.sin(angle) * i;
            addPoint(x, y);
        }
        addPoint(currentPos.x, currentPos.y);

        lastPos.current = currentPos;
    };

    const drawMaskStroke = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    };

    const stopDrawing = () => {
        isDrawing.current = false;
        lastPos.current = null;
    };

    const handleClearMask = () => {
        setEditDrawnPoints([]);
        setEditGeneratedMaskFile(null);
        setEditIsMaskSaved(false);
        setEditMaskPreviewUrl(null);
    };

    const generateAndSaveMask = () => {
        if (!editOriginalImageSize || editDrawnPoints.length === 0) {
            setEditGeneratedMaskFile(null);
            setEditIsMaskSaved(false);
            setEditMaskPreviewUrl(null);
            return;
        }

        const offscreenCanvas = document.createElement('canvas');
        offscreenCanvas.width = editOriginalImageSize.width;
        offscreenCanvas.height = editOriginalImageSize.height;
        const offscreenCtx = offscreenCanvas.getContext('2d');

        if (!offscreenCtx) return;

        offscreenCtx.fillStyle = '#000000';
        offscreenCtx.fillRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);
        offscreenCtx.globalCompositeOperation = 'destination-out';
        editDrawnPoints.forEach((point) => {
            drawMaskStroke(offscreenCtx, point.x, point.y, point.size);
        });

        try {
            const dataUrl = offscreenCanvas.toDataURL('image/png');
            setEditMaskPreviewUrl(dataUrl);
        } catch (e) {
            console.error('Error generating mask preview data URL:', e);
            setEditMaskPreviewUrl(null);
        }

        offscreenCanvas.toBlob((blob) => {
            if (blob) {
                const maskFile = new File([blob], 'generated-mask.png', { type: 'image/png' });
                setEditGeneratedMaskFile(maskFile);
                setEditIsMaskSaved(true);
                console.log('Mask generated and saved to state:', maskFile);
            } else {
                console.error('Failed to generate mask blob.');
                setEditIsMaskSaved(false);
                setEditMaskPreviewUrl(null);
            }
        }, 'image/png');
    };



    const handleMaskFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !editOriginalImageSize) {
            event.target.value = '';
            return;
        }

        if (file.type !== 'image/png') {
            alert('Invalid file type. Please upload a PNG file for the mask.');
            event.target.value = '';
            return;
        }

        const reader = new FileReader();
        const img = new window.Image();
        const objectUrl = URL.createObjectURL(file);

        img.onload = () => {
            if (img.width !== editOriginalImageSize.width || img.height !== editOriginalImageSize.height) {
                alert(
                    `Mask dimensions (${img.width}x${img.height}) must match the source image dimensions (${editOriginalImageSize.width}x${editOriginalImageSize.height}).`
                );
                URL.revokeObjectURL(objectUrl);
                event.target.value = '';
                return;
            }

            setEditGeneratedMaskFile(file);
            setEditIsMaskSaved(true);
            setEditDrawnPoints([]);

            reader.onloadend = () => {
                setEditMaskPreviewUrl(reader.result as string);
                URL.revokeObjectURL(objectUrl);
            };
            reader.onerror = () => {
                console.error('Error reading mask file for preview.');
                setEditMaskPreviewUrl(null);
                URL.revokeObjectURL(objectUrl);
            };
            reader.readAsDataURL(file);

            event.target.value = '';
        };

        img.onerror = () => {
            alert('Failed to load the uploaded mask image to check dimensions.');
            URL.revokeObjectURL(objectUrl);
            event.target.value = '';
        };

        img.src = objectUrl;
    };

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (imageFiles.length === 0) {
            alert('Please select at least one image to edit.');
            return;
        }
        // Validate mask if editing generated image
        if (isEditingGeneratedImage && editShowMaskEditor && editDrawnPoints.length > 0 && !editIsMaskSaved) {
            alert('Please save your mask before submitting.');
            return;
        }

        const formData: EditingFormData = {
            prompt: editPrompt,
            n: editN[0],
            size: '1024x1024', // Always use square format
            quality: 'high', // Always use high quality
            imageFiles: imageFiles,
            maskFile: isEditingGeneratedImage ? editGeneratedMaskFile : null
        };
        onSubmit(formData);
    };


    return (
        <Card className='flex h-full w-full flex-col overflow-hidden rounded-lg border border-white/10 bg-black'>
            <CardHeader className='flex items-start justify-between border-b border-white/10 pb-4'>
                <div>
                    <div className='flex items-center'>
                        <CardTitle className='py-1 text-lg font-medium text-white'>Skab miljøbilleder ud fra packshots</CardTitle>
                        {isPasswordRequiredByBackend && (
                            <Button
                                variant='ghost'
                                size='icon'
                                onClick={onOpenPasswordDialog}
                                className='ml-2 text-white/60 hover:text-white'
                                aria-label='Configure Password'>
                                {clientPasswordHash ? <Lock className='h-4 w-4' /> : <LockOpen className='h-4 w-4' />}
                            </Button>
                        )}
                    </div>
                    <CardDescription className='mt-1 text-white/60'>Upload et eller flere packshots og vælg en template eller lav eget prompt.</CardDescription>
                </div>
                <ModeToggle currentMode={currentMode} onModeChange={onModeChange} />
            </CardHeader>
            <form onSubmit={handleSubmit} className='flex h-full flex-1 flex-col overflow-hidden'>
                <CardContent className='flex-1 space-y-5 overflow-y-auto p-4'>
                    <div className='space-y-2'>
                        <Label className='text-white'>Kildebilleder</Label>
                        <MultiImageDropZone
                            images={imageDropZoneFiles}
                            onImagesChange={handleDropZoneImagesChange}
                            maxImages={maxImages}
                            disabled={isLoading}
                        />
                    </div>

                    <div className='space-y-1.5'>
                        <Label className='text-white'>
                            Prompt
                        </Label>
                        <PromptTemplateSelector 
                            value={editPrompt}
                            onChange={setEditPrompt}
                            imageFiles={imageFiles}
                        />
                    </div>

                    {/* Conditional Mask Editor - only for generated images */}
                    {isEditingGeneratedImage && firstImagePreviewUrl && (
                        <div className='space-y-4'>
                            <div className='flex items-center justify-between'>
                                <Label className='text-white'>Mask editor (valgfri)</Label>
                                <Button
                                    type='button'
                                    variant='outline'
                                    size='sm'
                                    onClick={() => setEditShowMaskEditor(!editShowMaskEditor)}
                                    className='border-white/20 text-white/80 hover:bg-white/10 hover:text-white'>
                                    <ScanEye className='mr-2 h-4 w-4' />
                                    {editShowMaskEditor ? 'Skjul mask editor' : 'Vis mask editor'}
                                </Button>
                            </div>
                            
                            {editShowMaskEditor && (
                                <div className='space-y-4 rounded-lg border border-white/10 bg-white/5 p-4'>
                                    <div className='space-y-2'>
                                        <Label htmlFor='brush-size-slider' className='text-white'>
                                            Penselstørrelse: {editBrushSize[0]}px
                                        </Label>
                                        <Slider
                                            id='brush-size-slider'
                                            min={5}
                                            max={50}
                                            step={1}
                                            value={editBrushSize}
                                            onValueChange={setEditBrushSize}
                                            disabled={isLoading}
                                            className='[&>button]:border-black [&>button]:bg-white [&>button]:ring-offset-black [&>span:first-child]:h-1 [&>span:first-child>span]:bg-white'
                                        />
                                    </div>
                                    
                                    <div className='space-y-2'>
                                        <Label className='text-white'>Lærred</Label>
                                        <div className='relative overflow-hidden rounded border border-white/20'>
                                            <Image
                                                src={firstImagePreviewUrl}
                                                alt='Base image for mask editing'
                                                width={editOriginalImageSize?.width || 512}
                                                height={editOriginalImageSize?.height || 512}
                                                className='max-h-64 w-full object-contain'
                                                unoptimized
                                            />
                                            <canvas
                                                ref={canvasRef}
                                                width={editOriginalImageSize?.width || 512}
                                                height={editOriginalImageSize?.height || 512}
                                                className='absolute inset-0 max-h-64 w-full cursor-crosshair'
                                                style={{ 
                                                    width: '100%', 
                                                    height: 'auto',
                                                    maxHeight: '16rem',
                                                    objectFit: 'contain'
                                                }}
                                                onMouseDown={startDrawing}
                                                onMouseMove={drawLine}
                                                onMouseUp={stopDrawing}
                                                onTouchStart={startDrawing}
                                                onTouchMove={drawLine}
                                                onTouchEnd={stopDrawing}
                                            />
                                        </div>
                                        <p className='text-xs text-white/60'>
                                            Tegn på billedet for at markere områder, du vil redigere. Røde områder vil blive erstattet.
                                        </p>
                                    </div>
                                    
                                    <div className='flex gap-2'>
                                        <Button
                                            type='button'
                                            variant='outline'
                                            size='sm'
                                            onClick={handleClearMask}
                                            disabled={isLoading}
                                            className='border-white/20 text-white/80 hover:bg-white/10 hover:text-white'>
                                            <Eraser className='mr-2 h-4 w-4' />
                                            Ryd mask
                                        </Button>
                                        
                                        <Button
                                            type='button'
                                            variant='outline'
                                            size='sm'
                                            onClick={generateAndSaveMask}
                                            disabled={isLoading || editDrawnPoints.length === 0}
                                            className='border-white/20 text-white/80 hover:bg-white/10 hover:text-white disabled:opacity-50'>
                                            <Save className='mr-2 h-4 w-4' />
                                            {editIsMaskSaved ? 'Mask gemt' : 'Gem mask'}
                                        </Button>
                                        
                                        <Input
                                            ref={maskInputRef}
                                            type='file'
                                            accept='image/png'
                                            onChange={handleMaskFileChange}
                                            className='hidden'
                                        />
                                        <Button
                                            type='button'
                                            variant='outline'
                                            size='sm'
                                            onClick={() => maskInputRef.current?.click()}
                                            disabled={isLoading}
                                            className='border-white/20 text-white/80 hover:bg-white/10 hover:text-white'>
                                            <UploadCloud className='mr-2 h-4 w-4' />
                                            Upload mask
                                        </Button>
                                    </div>
                                    
                                    {editMaskPreviewUrl && (
                                        <div className='space-y-2'>
                                            <Label className='text-white'>Mask preview</Label>
                                            <div className='overflow-hidden rounded border border-white/20'>
                                                <Image
                                                    src={editMaskPreviewUrl}
                                                    alt='Mask preview'
                                                    width={editOriginalImageSize?.width || 512}
                                                    height={editOriginalImageSize?.height || 512}
                                                    className='max-h-32 w-full object-contain'
                                                    unoptimized
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Size is now fixed to square (1024x1024) - no UI selector needed */}

                    {/* Quality is now fixed to high - no UI selector needed */}

                    <div className='space-y-2'>
                        <Label htmlFor='edit-n-slider' className='text-white'>
                            Antal billeder: {editN[0]}
                        </Label>
                        <Slider
                            id='edit-n-slider'
                            min={1}
                            max={10}
                            step={1}
                            value={editN}
                            onValueChange={setEditN}
                            disabled={isLoading}
                            className='mt-3 [&>button]:border-black [&>button]:bg-white [&>button]:ring-offset-black [&>span:first-child]:h-1 [&>span:first-child>span]:bg-white'
                        />
                    </div>
                </CardContent>
                <CardFooter className='border-t border-white/10 p-4'>
                    <Button
                        type='submit'
                        disabled={isLoading || !editPrompt || imageFiles.length === 0}
                        className='flex w-full items-center justify-center gap-2 rounded-md bg-white text-black hover:bg-white/90 disabled:bg-white/10 disabled:text-white/40'>
                        {isLoading && <Loader2 className='h-4 w-4 animate-spin' />}
                        {isLoading ? 'Skaber miljøbilleder...' : 'Skab miljøbilleder'}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
}
