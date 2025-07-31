'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { MultiImageDropZone } from '@/components/multi-image-drop-zone';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { 
    Sparkles, 
    Upload, 
    Download, 
    Trash2, 
    Image, 
    Loader2, 
    AlertCircle,
    Maximize,
    CropIcon
} from 'lucide-react';
import * as React from 'react';

interface MoodImageEditorProps {
    clientPasswordHash: string | null;
}

interface ProcessedMoodImage {
    filename: string;
    url: string;
    size?: number;
}

export function MoodImageEditor({ clientPasswordHash }: MoodImageEditorProps) {
    const [inputImages, setInputImages] = React.useState<File[]>([]);
    const [processedImages, setProcessedImages] = React.useState<ProcessedMoodImage[]>([]);
    const [isProcessing, setIsProcessing] = React.useState(false);
    const [progress, setProgress] = React.useState(0);
    const [progressText, setProgressText] = React.useState('');
    const [error, setError] = React.useState<string | null>(null);
    
    // Settings
    const [detectBorders, setDetectBorders] = React.useState(true);
    const [trimThreshold, setTrimThreshold] = React.useState([240]);
    const [maintainAspectRatio, setMaintainAspectRatio] = React.useState(true);
    const [outputFormat, setOutputFormat] = React.useState<'square' | 'original' | 'cover'>('square');
    const [isPngFormat, setIsPngFormat] = React.useState(true);
    const [selectedImages, setSelectedImages] = React.useState<string[]>([]);

    // Handle file upload
    const handleFilesAdded = (files: File[]) => {
        setInputImages(files);
        setError(null);
    };

    // Process images
    const handleProcess = async () => {
        if (inputImages.length === 0) {
            setError('Vælg mindst ét billede at behandle');
            return;
        }

        setIsProcessing(true);
        setProgress(0);
        setProgressText('Forbereder billeder...');
        setError(null);

        try {
            // Upload images
            const formData = new FormData();
            inputImages.forEach(file => {
                formData.append('files', file);
            });
            if (clientPasswordHash) {
                formData.append('passwordHash', clientPasswordHash);
            }

            setProgressText('Uploader billeder...');
            const uploadResponse = await fetch('/api/image-edit/mood/upload', {
                method: 'POST',
                body: formData,
            });

            if (!uploadResponse.ok) {
                const errorData = await uploadResponse.json();
                throw new Error(errorData.error || 'Upload fejlede');
            }

            // Process images
            setProgressText('Behandler stemningsbilleder...');
            setProgress(30);

            const processResponse = await fetch('/api/image-edit/mood/process', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    detectBorders,
                    trimThreshold: trimThreshold[0],
                    maintainAspectRatio,
                    outputFormat,
                    passwordHash: clientPasswordHash,
                }),
            });

            if (!processResponse.ok) {
                const errorData = await processResponse.json();
                throw new Error(errorData.error || 'Behandling fejlede');
            }

            const result = await processResponse.json();
            setProgress(100);
            setProgressText('Færdig!');
            
            // Load processed images
            await loadProcessedImages();

        } catch (err) {
            console.error('Error processing mood images:', err);
            setError(err instanceof Error ? err.message : 'Ukendt fejl opstod');
        } finally {
            setIsProcessing(false);
            setTimeout(() => {
                setProgress(0);
                setProgressText('');
            }, 2000);
        }
    };

    // Load processed images
    const loadProcessedImages = async () => {
        try {
            const response = await fetch('/api/image-edit/mood/list');
            if (!response.ok) {
                throw new Error('Kunne ikke hente behandlede billeder');
            }
            const data = await response.json();
            setProcessedImages(data.images || []);
        } catch (err) {
            console.error('Error loading processed images:', err);
            setError('Kunne ikke hente behandlede billeder');
        }
    };

    // Clear all images
    const handleClearAll = async () => {
        try {
            const response = await fetch('/api/image-edit/mood/clear', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ passwordHash: clientPasswordHash }),
            });

            if (!response.ok) {
                throw new Error('Kunne ikke rydde billeder');
            }

            setInputImages([]);
            setProcessedImages([]);
            setError(null);
        } catch (err) {
            console.error('Error clearing images:', err);
            setError('Kunne ikke rydde billeder');
        }
    };

    // Download single image
    const handleDownloadImage = async (image: ProcessedMoodImage) => {
        try {
            const response = await fetch(image.url);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = image.filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            console.error('Error downloading image:', err);
            setError('Download fejlede');
        }
    };

    // Download all images as ZIP
    const handleDownloadAll = async () => {
        try {
            const response = await fetch('/api/image-edit/mood/download-all', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    passwordHash: clientPasswordHash,
                    format: isPngFormat ? 'png' : 'jpg'
                }),
            });

            if (!response.ok) {
                throw new Error('Download fejlede');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `mood-images-${Date.now()}.zip`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            console.error('Error downloading all images:', err);
            setError('Download fejlede');
        }
    };

    // Download selected images as ZIP
    const handleDownloadSelected = async () => {
        if (selectedImages.length === 0) return;

        try {
            const response = await fetch('/api/image-edit/mood/download-selected', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    passwordHash: clientPasswordHash,
                    format: isPngFormat ? 'png' : 'jpg',
                    selectedFiles: selectedImages
                }),
            });

            if (!response.ok) {
                throw new Error('Download fejlede');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `mood-selected-${Date.now()}.zip`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            console.error('Error downloading selected images:', err);
            setError('Download fejlede');
        }
    };

    // Load processed images on mount
    React.useEffect(() => {
        loadProcessedImages();
    }, []);

    return (
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
            {/* Input Section */}
            <Card className='border-white/10 bg-black/50'>
                <CardHeader>
                    <CardTitle className='flex items-center gap-2 text-white'>
                        <Upload className='h-5 w-5' />
                        Upload billeder
                    </CardTitle>
                    <CardDescription className='text-white/60'>
                        Upload billeder til stemnings behandling
                    </CardDescription>
                </CardHeader>
                <CardContent className='space-y-4'>
                    <MultiImageDropZone
                        onFilesAdded={handleFilesAdded}
                        maxImages={20}
                        disabled={isProcessing}
                        className='min-h-[200px]'
                    />
                    
                    {inputImages.length > 0 && (
                        <div className='space-y-2'>
                            <Label className='text-white'>Uploadede billeder ({inputImages.length})</Label>
                            <ScrollArea className='h-32 rounded border border-white/10 p-2'>
                                {inputImages.map((file, index) => (
                                    <div key={index} className='text-sm text-white/80'>
                                        {file.name}
                                    </div>
                                ))}
                            </ScrollArea>
                        </div>
                    )}

                    {/* Settings */}
                    <div className='space-y-4 pt-4 border-t border-white/10'>
                        <div className='flex items-center justify-between'>
                            <Label htmlFor='detect-borders' className='text-white'>
                                Registrer kanter
                            </Label>
                            <Switch
                                id='detect-borders'
                                checked={detectBorders}
                                onCheckedChange={setDetectBorders}
                                disabled={isProcessing}
                            />
                        </div>
                        
                        {detectBorders && (
                            <div className='space-y-2'>
                                <Label className='text-white'>
                                    Trim grænse: {trimThreshold[0]}
                                </Label>
                                <Slider
                                    value={trimThreshold}
                                    onValueChange={setTrimThreshold}
                                    max={255}
                                    min={1}
                                    step={1}
                                    disabled={isProcessing}
                                    className='w-full'
                                />
                                <p className='text-xs text-white/60'>
                                    Højere værdi = mere aggressiv trimning af lyse kanter
                                </p>
                            </div>
                        )}

                        <div className='flex items-center justify-between'>
                            <Label htmlFor='maintain-aspect' className='text-white'>
                                Bevar billedformat
                            </Label>
                            <Switch
                                id='maintain-aspect'
                                checked={maintainAspectRatio}
                                onCheckedChange={setMaintainAspectRatio}
                                disabled={isProcessing}
                            />
                        </div>

                        <div className='space-y-2'>
                            <Label className='text-white'>Output format</Label>
                            <div className='grid grid-cols-3 gap-2'>
                                <Button
                                    variant={outputFormat === 'square' ? 'default' : 'outline'}
                                    size='sm'
                                    onClick={() => setOutputFormat('square')}
                                    disabled={isProcessing}
                                    className={outputFormat === 'square' ? 'bg-white text-black' : 'border-white/20 text-white'}>
                                    <CropIcon className='mr-2 h-4 w-4' />
                                    Kvadrat
                                </Button>
                                <Button
                                    variant={outputFormat === 'original' ? 'default' : 'outline'}
                                    size='sm'
                                    onClick={() => setOutputFormat('original')}
                                    disabled={isProcessing}
                                    className={outputFormat === 'original' ? 'bg-white text-black' : 'border-white/20 text-white'}>
                                    <Maximize className='mr-2 h-4 w-4' />
                                    Original
                                </Button>
                                <Button
                                    variant={outputFormat === 'cover' ? 'default' : 'outline'}
                                    size='sm'
                                    onClick={() => setOutputFormat('cover')}
                                    disabled={isProcessing}
                                    className={outputFormat === 'cover' ? 'bg-white text-black' : 'border-white/20 text-white'}>
                                    <Image className='mr-2 h-4 w-4' />
                                    Fyld
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Progress */}
                    {isProcessing && (
                        <div className='space-y-2'>
                            <Progress value={progress} className='h-2' />
                            <p className='text-sm text-white/60 text-center'>{progressText}</p>
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div className='rounded-lg border border-red-500/20 bg-red-500/10 p-3'>
                            <div className='flex items-center gap-2 text-red-400'>
                                <AlertCircle className='h-4 w-4' />
                                <span className='text-sm'>{error}</span>
                            </div>
                        </div>
                    )}
                </CardContent>
                <CardFooter className='flex gap-2'>
                    <Button
                        onClick={handleProcess}
                        disabled={isProcessing || inputImages.length === 0}
                        className='flex-1 bg-white text-black hover:bg-white/90'>
                        {isProcessing ? (
                            <>
                                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                                Behandler...
                            </>
                        ) : (
                            <>
                                <Sparkles className='mr-2 h-4 w-4' />
                                Start behandling
                            </>
                        )}
                    </Button>
                    <Button
                        onClick={handleClearAll}
                        variant='outline'
                        disabled={isProcessing}
                        className='border-white/20 text-white hover:bg-white/10'>
                        <Trash2 className='h-4 w-4' />
                    </Button>
                </CardFooter>
            </Card>

            {/* Output Section */}
            <Card className='border-white/10 bg-black/50'>
                <CardHeader>
                    <div className='flex items-center justify-between'>
                        <div>
                            <CardTitle className='flex items-center gap-2 text-white'>
                                <Image className='h-5 w-5' />
                                Behandlede stemningsbilleder
                            </CardTitle>
                            <CardDescription className='text-white/60'>
                                Dine optimerede billeder
                            </CardDescription>
                        </div>
                        {processedImages.length > 0 && (
                            <div className='flex items-center gap-4'>
                                <div className='flex items-center gap-2'>
                                    <Label className='text-sm text-white/60'>Format:</Label>
                                    <div className='flex items-center gap-2'>
                                        <Switch
                                            checked={isPngFormat}
                                            onCheckedChange={setIsPngFormat}
                                            className='data-[state=checked]:bg-white data-[state=unchecked]:bg-white/30'
                                        />
                                        <span className='text-sm text-white'>{isPngFormat ? 'PNG' : 'JPG'}</span>
                                    </div>
                                </div>
                                <Button
                                    onClick={handleDownloadAll}
                                    size='sm'
                                    variant='outline'
                                    className='border-white/20 text-white hover:bg-white/10'>
                                    <Download className='mr-2 h-4 w-4' />
                                    Download alle
                                </Button>
                                {selectedImages.length > 0 && (
                                    <Button
                                        onClick={handleDownloadSelected}
                                        size='sm'
                                        variant='outline'
                                        className='border-white/20 text-white hover:bg-white/10'>
                                        <Download className='mr-2 h-4 w-4' />
                                        Download valgte ({selectedImages.length})
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {processedImages.length === 0 ? (
                        <div className='flex flex-col items-center justify-center py-12 text-center'>
                            <Sparkles className='h-12 w-12 text-white/20 mb-4' />
                            <p className='text-white/60'>
                                Ingen behandlede billeder endnu.
                                <br />
                                Upload og behandl billeder for at se dem her.
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className='flex items-center gap-2 mb-4'>
                                <Checkbox
                                    checked={selectedImages.length === processedImages.length}
                                    onCheckedChange={(checked) => {
                                        if (checked) {
                                            setSelectedImages(processedImages.map(img => img.filename));
                                        } else {
                                            setSelectedImages([]);
                                        }
                                    }}
                                    className='border-white/40 data-[state=checked]:bg-white data-[state=checked]:text-black'
                                />
                                <Label className='text-sm text-white/80 cursor-pointer'>
                                    Vælg alle
                                </Label>
                            </div>
                            <div className='grid grid-cols-2 gap-4'>
                            {processedImages.map((image, index) => (
                                <div
                                    key={index}
                                    className='group relative aspect-square rounded-lg border border-white/10 bg-white/5 overflow-hidden'>
                                    <div className='absolute top-2 left-2 z-10'>
                                        <Checkbox
                                            checked={selectedImages.includes(image.filename)}
                                            onCheckedChange={(checked) => {
                                                if (checked) {
                                                    setSelectedImages([...selectedImages, image.filename]);
                                                } else {
                                                    setSelectedImages(selectedImages.filter(f => f !== image.filename));
                                                }
                                            }}
                                            className='border-white/60 bg-black/50 data-[state=checked]:bg-white data-[state=checked]:text-black'
                                        />
                                    </div>
                                    <img
                                        src={image.url}
                                        alt={image.filename}
                                        className='h-full w-full object-contain'
                                    />
                                    <div className='absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2'>
                                        <Button
                                            onClick={() => handleDownloadImage(image)}
                                            size='sm'
                                            variant='secondary'>
                                            <Download className='h-4 w-4' />
                                        </Button>
                                    </div>
                                    <div className='absolute bottom-0 left-0 right-0 bg-black/80 p-2'>
                                        <p className='text-xs text-white truncate'>{image.filename}</p>
                                    </div>
                                </div>
                            ))}
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}