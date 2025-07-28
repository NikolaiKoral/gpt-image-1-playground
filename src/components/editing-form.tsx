'use client';

import { ModeToggle } from '@/components/mode-toggle';
import { MultiImageDropZone, type ImageFile } from '@/components/multi-image-dropzone';
import { PromptTemplateSelector } from '@/components/prompt-template-selector';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
// import { Input } from '@/components/ui/input'; // Commented out - mask functionality removed
import { Label } from '@/components/ui/label';
// import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'; // Commented out - quality/size selectors removed
import { Slider } from '@/components/ui/slider';
import {
    // Eraser, // Commented out - mask functionality removed
    // Save, // Commented out - mask functionality removed
    // Square, // Commented out - size selector removed
    // RectangleHorizontal, // Commented out - size selector removed
    // RectangleVertical, // Commented out - size selector removed
    // Sparkles, // Commented out - auto options removed
    // Tally1, // Commented out - quality selector removed
    // Tally2, // Commented out - quality selector removed
    // Tally3, // Commented out - quality selector removed
    Loader2,
    // ScanEye, // Commented out - mask functionality removed
    // UploadCloud, // Commented out - mask functionality removed
    Lock,
    LockOpen
} from 'lucide-react';
// import Image from 'next/image'; // Commented out - mask functionality removed
import * as React from 'react';

// type DrawnPoint = { // Commented out - mask functionality removed
//     x: number;
//     y: number;
//     size: number;
// };

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
    // editSize: EditingFormData['size']; // Commented out - size is now fixed to square
    // setEditSize: React.Dispatch<React.SetStateAction<EditingFormData['size']>>; // Commented out - size is now fixed to square
    // editQuality: EditingFormData['quality']; // Commented out - quality is now fixed to high
    // setEditQuality: React.Dispatch<React.SetStateAction<EditingFormData['quality']>>; // Commented out - quality is now fixed to high
    // editBrushSize: number[]; // Commented out - mask functionality removed
    // setEditBrushSize: React.Dispatch<React.SetStateAction<number[]>>; // Commented out - mask functionality removed
    // editShowMaskEditor: boolean; // Commented out - mask functionality removed
    // setEditShowMaskEditor: React.Dispatch<React.SetStateAction<boolean>>; // Commented out - mask functionality removed
    // editGeneratedMaskFile: File | null; // Commented out - mask functionality removed
    // setEditGeneratedMaskFile: React.Dispatch<React.SetStateAction<File | null>>; // Commented out - mask functionality removed
    // editIsMaskSaved: boolean; // Commented out - mask functionality removed
    // setEditIsMaskSaved: React.Dispatch<React.SetStateAction<boolean>>; // Commented out - mask functionality removed
    // editOriginalImageSize: { width: number; height: number } | null; // Commented out - mask functionality removed
    // setEditOriginalImageSize: React.Dispatch<React.SetStateAction<{ width: number; height: number } | null>>; // Commented out - mask functionality removed
    // editDrawnPoints: DrawnPoint[]; // Commented out - mask functionality removed
    // setEditDrawnPoints: React.Dispatch<React.SetStateAction<DrawnPoint[]>>; // Commented out - mask functionality removed
    // editMaskPreviewUrl: string | null; // Commented out - mask functionality removed
    // setEditMaskPreviewUrl: React.Dispatch<React.SetStateAction<string | null>>; // Commented out - mask functionality removed
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
    // editSize, // Commented out - size is now fixed to square  
    // setEditSize, // Commented out - size is now fixed to square
    // editQuality, // Commented out - quality is now fixed to high
    // setEditQuality, // Commented out - quality is now fixed to high
    // editBrushSize, // Commented out - mask functionality removed
    // setEditBrushSize, // Commented out - mask functionality removed
    // editShowMaskEditor, // Commented out - mask functionality removed
    // setEditShowMaskEditor, // Commented out - mask functionality removed
    // editGeneratedMaskFile, // Commented out - mask functionality removed
    // setEditGeneratedMaskFile, // Commented out - mask functionality removed
    // editIsMaskSaved, // Commented out - mask functionality removed
    // setEditIsMaskSaved, // Commented out - mask functionality removed
    // editOriginalImageSize, // Commented out - mask functionality removed
    // setEditOriginalImageSize, // Commented out - mask functionality removed
    // editDrawnPoints, // Commented out - mask functionality removed
    // setEditDrawnPoints, // Commented out - mask functionality removed
    // editMaskPreviewUrl, // Commented out - mask functionality removed
    // setEditMaskPreviewUrl // Commented out - mask functionality removed
}: EditingFormProps) {
    // const [firstImagePreviewUrl, setFirstImagePreviewUrl] = React.useState<string | null>(null); // Commented out - mask functionality removed
    const [imageDropZoneFiles, setImageDropZoneFiles] = React.useState<ImageFile[]>([]);

    // const canvasRef = React.useRef<HTMLCanvasElement>(null); // Commented out - mask functionality removed
    // const visualFeedbackCanvasRef = React.useRef<HTMLCanvasElement | null>(null); // Commented out - mask functionality removed
    // const isDrawing = React.useRef(false); // Commented out - mask functionality removed
    // const lastPos = React.useRef<{ x: number; y: number } | null>(null); // Commented out - mask functionality removed
    // const maskInputRef = React.useRef<HTMLInputElement>(null); // Commented out - mask functionality removed

    // React.useEffect(() => { // Commented out - mask functionality removed
    //     if (editOriginalImageSize) {
    //         if (!visualFeedbackCanvasRef.current) {
    //             visualFeedbackCanvasRef.current = document.createElement('canvas');
    //         }
    //         visualFeedbackCanvasRef.current.width = editOriginalImageSize.width;
    //         visualFeedbackCanvasRef.current.height = editOriginalImageSize.height;
    //     }
    // }, [editOriginalImageSize]);

    // React.useEffect(() => { // Commented out - mask functionality removed
    //     setEditGeneratedMaskFile(null);
    //     setEditIsMaskSaved(false);
    //     setEditOriginalImageSize(null);
    //     setFirstImagePreviewUrl(null);
    //     setEditDrawnPoints([]);
    //     setEditMaskPreviewUrl(null);

    //     if (imageFiles.length > 0 && sourceImagePreviewUrls.length > 0) {
    //         const img = new window.Image();
    //         img.onload = () => {
    //             setEditOriginalImageSize({ width: img.width, height: img.height });
    //         };
    //         img.src = sourceImagePreviewUrls[0];
    //         setFirstImagePreviewUrl(sourceImagePreviewUrls[0]);
    //     } else {
    //         setEditShowMaskEditor(false);
    //     }
    // }, [
    //     imageFiles,
    //     sourceImagePreviewUrls,
    //     setEditGeneratedMaskFile,
    //     setEditIsMaskSaved,
    //     setEditOriginalImageSize,
    //     setEditDrawnPoints,
    //     setEditMaskPreviewUrl,
    //     setEditShowMaskEditor
    // ]);

    // React.useEffect(() => { // Commented out - mask functionality removed
    //     const displayCtx = canvasRef.current?.getContext('2d');
    //     const displayCanvas = canvasRef.current;
    //     const feedbackCanvas = visualFeedbackCanvasRef.current;

    //     if (!displayCtx || !displayCanvas || !feedbackCanvas || !editOriginalImageSize) return;

    //     const feedbackCtx = feedbackCanvas.getContext('2d');
    //     if (!feedbackCtx) return;

    //     feedbackCtx.clearRect(0, 0, feedbackCanvas.width, feedbackCanvas.height);
    //     feedbackCtx.fillStyle = 'red';
    //     editDrawnPoints.forEach((point) => {
    //         feedbackCtx.beginPath();
    //         feedbackCtx.arc(point.x, point.y, point.size, 0, Math.PI * 2);
    //         feedbackCtx.fill();
    //     });

    //     displayCtx.clearRect(0, 0, displayCanvas.width, displayCanvas.height);
    //     displayCtx.save();
    //     displayCtx.globalAlpha = 0.5;
    //     displayCtx.drawImage(feedbackCanvas, 0, 0, displayCanvas.width, displayCanvas.height);
    //     displayCtx.restore();
    // }, [editDrawnPoints, editOriginalImageSize]);

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

    /* // All mask-related functions commented out - mask functionality removed
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
    }; */

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (imageFiles.length === 0) {
            alert('Please select at least one image to edit.');
            return;
        }
        // Mask validation removed since masks are no longer used

        const formData: EditingFormData = {
            prompt: editPrompt,
            n: editN[0],
            size: '1024x1024', // Always use square format
            quality: 'high', // Always use high quality
            imageFiles: imageFiles,
            maskFile: null // No mask functionality
        };
        onSubmit(formData);
    };


    return (
        <Card className='flex h-full w-full flex-col overflow-hidden rounded-lg border border-white/10 bg-black'>
            <CardHeader className='flex items-start justify-between border-b border-white/10 pb-4'>
                <div>
                    <div className='flex items-center'>
                        <CardTitle className='py-1 text-lg font-medium text-white'>Edit Image</CardTitle>
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
                    <CardDescription className='mt-1 text-white/60'>Modify an image using gpt-image-1.</CardDescription>
                </div>
                <ModeToggle currentMode={currentMode} onModeChange={onModeChange} />
            </CardHeader>
            <form onSubmit={handleSubmit} className='flex h-full flex-1 flex-col overflow-hidden'>
                <CardContent className='flex-1 space-y-5 overflow-y-auto p-4'>
                    <div className='space-y-1.5'>
                        <Label className='text-white'>
                            Prompt
                        </Label>
                        <PromptTemplateSelector 
                            value={editPrompt}
                            onChange={setEditPrompt}
                        />
                    </div>

                    <div className='space-y-2'>
                        <Label className='text-white'>Source Images</Label>
                        <MultiImageDropZone
                            images={imageDropZoneFiles}
                            onImagesChange={handleDropZoneImagesChange}
                            maxImages={maxImages}
                            disabled={isLoading}
                        />
                    </div>

                    {/* Mask functionality removed - no mask selector needed */}

                    {/* Size is now fixed to square (1024x1024) - no UI selector needed */}

                    {/* Quality is now fixed to high - no UI selector needed */}

                    <div className='space-y-2'>
                        <Label htmlFor='edit-n-slider' className='text-white'>
                            Number of Images: {editN[0]}
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
                        {isLoading ? 'Editing...' : 'Edit Image'}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
}
