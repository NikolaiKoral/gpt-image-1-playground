'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { MultiImageDropZone } from '@/components/multi-image-drop-zone';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
    FileType, 
    Upload, 
    Download, 
    Trash2, 
    Image, 
    Loader2, 
    AlertCircle,
    CheckCircle
} from 'lucide-react';
import * as React from 'react';

interface ImageConverterProps {
    clientPasswordHash: string | null;
}

interface ConvertedFile {
    url: string;
    originalName: string;
    outputFormat: string;
}

const FORMAT_OPTIONS = [
    { value: 'jpg', label: 'JPG' },
    { value: 'png', label: 'PNG' },
    { value: 'webp', label: 'WebP' },
    { value: 'gif', label: 'GIF' },
    { value: 'tiff', label: 'TIFF' },
    { value: 'bmp', label: 'BMP' },
];

export function ImageConverter({ clientPasswordHash }: ImageConverterProps) {
    const [inputFiles, setInputFiles] = React.useState<File[]>([]);
    const [convertedFiles, setConvertedFiles] = React.useState<ConvertedFile[]>([]);
    const [isConverting, setIsConverting] = React.useState(false);
    const [progress, setProgress] = React.useState(0);
    const [progressText, setProgressText] = React.useState('');
    const [error, setError] = React.useState<string | null>(null);
    
    // Settings
    const [outputFormat, setOutputFormat] = React.useState('jpg');
    const [quality, setQuality] = React.useState([85]);

    // Handle file upload
    const handleFilesAdded = (files: File[]) => {
        setInputFiles(files);
        setError(null);
    };

    // Convert files
    const handleConvert = async () => {
        if (inputFiles.length === 0) {
            setError('Vælg mindst ét billede at konvertere');
            return;
        }

        setIsConverting(true);
        setProgress(0);
        setProgressText('Konverterer billeder...');
        setError(null);
        setConvertedFiles([]);

        try {
            const totalFiles = inputFiles.length;
            const results: ConvertedFile[] = [];

            for (let i = 0; i < totalFiles; i++) {
                const file = inputFiles[i];
                setProgress(Math.round((i / totalFiles) * 100));
                setProgressText(`Konverterer ${i + 1} af ${totalFiles}...`);

                const formData = new FormData();
                formData.append('file', file);
                formData.append('outputFormat', outputFormat);
                formData.append('quality', quality[0].toString());
                if (clientPasswordHash) {
                    formData.append('passwordHash', clientPasswordHash);
                }

                const response = await fetch('/api/konverter/convert/convert', {
                    method: 'POST',
                    body: formData,
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    console.error(`Failed to convert ${file.name}:`, errorData.error);
                    continue;
                }

                const result = await response.json();
                results.push({
                    url: result.convertedPath,
                    originalName: result.originalName,
                    outputFormat: result.outputFormat
                });
            }

            setConvertedFiles(results);
            setProgress(100);
            setProgressText('Konvertering fuldført!');

        } catch (err) {
            console.error('Error converting files:', err);
            setError(err instanceof Error ? err.message : 'Ukendt fejl opstod');
        } finally {
            setIsConverting(false);
            setTimeout(() => {
                setProgress(0);
                setProgressText('');
            }, 2000);
        }
    };

    // Download all as ZIP
    const handleDownloadAll = async () => {
        try {
            const response = await fetch('/api/konverter/convert/download-all', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    files: convertedFiles.map(f => f.url),
                    passwordHash: clientPasswordHash 
                }),
            });

            if (!response.ok) {
                throw new Error('Download fejlede');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `converted-images-${Date.now()}.zip`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            console.error('Error downloading files:', err);
            setError('Download fejlede');
        }
    };

    // Clear all files
    const handleClearAll = async () => {
        try {
            const response = await fetch('/api/konverter/convert/clear-all', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ passwordHash: clientPasswordHash }),
            });

            if (!response.ok) {
                throw new Error('Kunne ikke rydde filer');
            }

            setInputFiles([]);
            setConvertedFiles([]);
            setError(null);
        } catch (err) {
            console.error('Error clearing files:', err);
            setError('Kunne ikke rydde filer');
        }
    };

    // Download single file
    const handleDownloadSingle = (file: ConvertedFile) => {
        const a = document.createElement('a');
        a.href = file.url;
        a.download = file.originalName.replace(/\.[^/.]+$/, `.${file.outputFormat}`);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    return (
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
            {/* Input Section */}
            <Card className='border-white/10 bg-black/50'>
                <CardHeader>
                    <CardTitle className='flex items-center gap-2 text-white'>
                        <FileType className='h-5 w-5' />
                        Format Konverter
                    </CardTitle>
                    <CardDescription className='text-white/60'>
                        Konverter billeder mellem forskellige formater
                    </CardDescription>
                </CardHeader>
                <CardContent className='space-y-4'>
                    <MultiImageDropZone
                        onFilesAdded={handleFilesAdded}
                        maxImages={50}
                        disabled={isConverting}
                        className='min-h-[200px]'
                    />
                    
                    {inputFiles.length > 0 && (
                        <div className='space-y-2'>
                            <Label className='text-white'>Valgte filer ({inputFiles.length})</Label>
                            <ScrollArea className='h-32 rounded border border-white/10 p-2'>
                                {inputFiles.map((file, index) => (
                                    <div key={index} className='text-sm text-white/80'>
                                        {file.name}
                                    </div>
                                ))}
                            </ScrollArea>
                        </div>
                    )}

                    {/* Settings */}
                    <div className='space-y-4 pt-4 border-t border-white/10'>
                        <div className='space-y-2'>
                            <Label className='text-white'>Output format</Label>
                            <Select value={outputFormat} onValueChange={setOutputFormat}>
                                <SelectTrigger className='bg-white/5 border-white/10 text-white'>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {FORMAT_OPTIONS.map(option => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {(outputFormat === 'jpg' || outputFormat === 'webp') && (
                            <div className='space-y-2'>
                                <Label className='text-white'>
                                    Kvalitet: {quality[0]}%
                                </Label>
                                <Slider
                                    value={quality}
                                    onValueChange={setQuality}
                                    max={100}
                                    min={1}
                                    step={1}
                                    disabled={isConverting}
                                    className='w-full'
                                />
                                <p className='text-xs text-white/60'>
                                    Højere kvalitet = større filstørrelse
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Progress */}
                    {isConverting && (
                        <div className='space-y-2'>
                            <Progress value={progress} className='h-2' />
                            <p className='text-sm text-white/60 text-center'>{progressText}</p>
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <Alert variant='destructive' className='border-red-500/20 bg-red-500/10'>
                            <AlertCircle className='h-4 w-4' />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                </CardContent>
                <CardFooter className='flex gap-2'>
                    <Button
                        onClick={handleConvert}
                        disabled={isConverting || inputFiles.length === 0}
                        className='flex-1 bg-white text-black hover:bg-white/90'>
                        {isConverting ? (
                            <>
                                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                                Konverterer...
                            </>
                        ) : (
                            <>
                                <FileType className='mr-2 h-4 w-4' />
                                Konverter til {outputFormat.toUpperCase()}
                            </>
                        )}
                    </Button>
                    <Button
                        onClick={handleClearAll}
                        variant='outline'
                        disabled={isConverting}
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
                                Konverterede billeder
                            </CardTitle>
                            <CardDescription className='text-white/60'>
                                Dine billeder i det nye format
                            </CardDescription>
                        </div>
                        {convertedFiles.length > 0 && (
                            <Button
                                onClick={handleDownloadAll}
                                size='sm'
                                variant='outline'
                                className='border-white/20 text-white hover:bg-white/10'>
                                <Download className='mr-2 h-4 w-4' />
                                Download alle
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {convertedFiles.length === 0 ? (
                        <div className='flex flex-col items-center justify-center py-12 text-center'>
                            <FileType className='h-12 w-12 text-white/20 mb-4' />
                            <p className='text-white/60'>
                                Ingen konverterede billeder endnu.
                                <br />
                                Vælg billeder og format for at starte.
                            </p>
                        </div>
                    ) : (
                        <div className='grid grid-cols-2 gap-4'>
                            {convertedFiles.map((file, index) => (
                                <div
                                    key={index}
                                    className='group relative aspect-square rounded-lg border border-white/10 bg-white/5 overflow-hidden'>
                                    <img
                                        src={file.url}
                                        alt={file.originalName}
                                        className='h-full w-full object-cover'
                                    />
                                    <div className='absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center'>
                                        <Button
                                            onClick={() => handleDownloadSingle(file)}
                                            size='sm'
                                            variant='secondary'>
                                            <Download className='h-4 w-4' />
                                        </Button>
                                    </div>
                                    <div className='absolute bottom-0 left-0 right-0 bg-black/80 p-2'>
                                        <p className='text-xs text-white truncate'>{file.originalName}</p>
                                        <p className='text-xs text-white/60'>{file.outputFormat.toUpperCase()}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}