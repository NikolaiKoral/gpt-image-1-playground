'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { MultiImageDropZone } from '@/components/multi-image-drop-zone';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { 
    Package, 
    Upload, 
    Download, 
    Trash2, 
    FileText, 
    Loader2, 
    AlertCircle,
    CheckCircle,
    Eye,
    Sparkles,
    ArrowRight
} from 'lucide-react';
import * as React from 'react';

interface EANRenamerProps {
    clientPasswordHash: string | null;
}

interface PreviewFile {
    originalName: string;
    newName: string;
    ean: string | null;
    status: 'will_rename' | 'keep_original';
    extractionMethod: 'pattern' | 'ai';
    confidence?: number;
    size?: number;
}

interface ProcessedFile {
    filename: string;
    url: string;
    originalName: string;
}

export function EANRenamer({ clientPasswordHash }: EANRenamerProps) {
    const [inputFiles, setInputFiles] = React.useState<File[]>([]);
    const [processedFiles, setProcessedFiles] = React.useState<ProcessedFile[]>([]);
    const [previewFiles, setPreviewFiles] = React.useState<PreviewFile[]>([]);
    const [isUploading, setIsUploading] = React.useState(false);
    const [isProcessing, setIsProcessing] = React.useState(false);
    const [isPreviewing, setIsPreviewing] = React.useState(false);
    const [progress, setProgress] = React.useState(0);
    const [progressText, setProgressText] = React.useState('');
    const [error, setError] = React.useState<string | null>(null);
    const [currentStep, setCurrentStep] = React.useState<'upload' | 'preview' | 'completed'>('upload');
    
    // Settings
    const [removeLeadingZeros, setRemoveLeadingZeros] = React.useState(false);
    const [useAiMode, setUseAiMode] = React.useState(false);
    const [aiInstructions, setAiInstructions] = React.useState('');

    // Handle file upload
    const handleFilesAdded = (files: File[]) => {
        setInputFiles(files);
        setError(null);
        setCurrentStep('upload');
    };

    // Upload files to server
    const handleUpload = async () => {
        if (inputFiles.length === 0) {
            setError('Vælg mindst ét billede at behandle');
            return;
        }

        setIsUploading(true);
        setProgress(0);
        setProgressText('Uploader billeder...');
        setError(null);

        try {
            const formData = new FormData();
            inputFiles.forEach(file => {
                formData.append('images', file);
            });
            if (clientPasswordHash) {
                formData.append('passwordHash', clientPasswordHash);
            }

            const response = await fetch('/api/konverter/rename/upload', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Upload fejlede');
            }

            const result = await response.json();
            setProgress(100);
            setProgressText('Upload fuldført!');
            
            // Move to preview step
            await handlePreview();

        } catch (err) {
            console.error('Error uploading files:', err);
            setError(err instanceof Error ? err.message : 'Ukendt fejl opstod');
        } finally {
            setIsUploading(false);
        }
    };

    // Preview files
    const handlePreview = async () => {
        setIsPreviewing(true);
        setProgressText('Analyserer filer...');
        setError(null);

        try {
            const response = await fetch('/api/konverter/rename/preview', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    removeLeadingZeros,
                    useAiMode,
                    aiInstructions,
                    passwordHash: clientPasswordHash,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Preview fejlede');
            }

            const result = await response.json();
            setPreviewFiles(result.files || []);
            setCurrentStep('preview');
            
        } catch (err) {
            console.error('Error previewing files:', err);
            setError(err instanceof Error ? err.message : 'Ukendt fejl opstod');
        } finally {
            setIsPreviewing(false);
            setProgressText('');
        }
    };

    // Process files
    const handleProcess = async () => {
        setIsProcessing(true);
        setProgress(0);
        setProgressText('Omdøber filer...');
        setError(null);

        try {
            const response = await fetch('/api/konverter/rename/process', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    removeLeadingZeros,
                    useAiMode,
                    aiInstructions,
                    passwordHash: clientPasswordHash,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Behandling fejlede');
            }

            const result = await response.json();
            setProgress(100);
            setProgressText('Behandling fuldført!');
            
            // Load processed files
            await loadProcessedFiles();
            setCurrentStep('completed');

        } catch (err) {
            console.error('Error processing files:', err);
            setError(err instanceof Error ? err.message : 'Ukendt fejl opstod');
        } finally {
            setIsProcessing(false);
            setTimeout(() => {
                setProgress(0);
                setProgressText('');
            }, 2000);
        }
    };

    // Load processed files
    const loadProcessedFiles = async () => {
        try {
            const response = await fetch('/api/konverter/rename/images');
            if (!response.ok) {
                throw new Error('Kunne ikke hente behandlede filer');
            }
            const data = await response.json();
            setProcessedFiles(data.images.map((url: string) => ({
                url,
                filename: url.split('/').pop() || '',
                originalName: '' // Will be populated from preview data
            })));
        } catch (err) {
            console.error('Error loading processed files:', err);
            setError('Kunne ikke hente behandlede filer');
        }
    };

    // Clear all files
    const handleClearAll = async () => {
        try {
            const response = await fetch('/api/konverter/rename/clear', {
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
            setProcessedFiles([]);
            setPreviewFiles([]);
            setCurrentStep('upload');
            setError(null);
        } catch (err) {
            console.error('Error clearing files:', err);
            setError('Kunne ikke rydde filer');
        }
    };

    // Download all as ZIP
    const handleDownloadAll = async () => {
        try {
            const response = await fetch('/api/konverter/rename/download-all', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ passwordHash: clientPasswordHash }),
            });

            if (!response.ok) {
                throw new Error('Download fejlede');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ean-renamed-${Date.now()}.zip`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            console.error('Error downloading files:', err);
            setError('Download fejlede');
        }
    };

    // Count statistics
    const willRenameCount = previewFiles.filter(f => f.status === 'will_rename').length;
    const keepOriginalCount = previewFiles.filter(f => f.status === 'keep_original').length;
    const aiProcessedCount = previewFiles.filter(f => f.extractionMethod === 'ai').length;

    return (
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
            {/* Input Section */}
            <Card className='border-white/10 bg-black/50'>
                <CardHeader>
                    <CardTitle className='flex items-center gap-2 text-white'>
                        <Package className='h-5 w-5' />
                        EAN Omdøber
                    </CardTitle>
                    <CardDescription className='text-white/60'>
                        Omdøb billeder baseret på EAN-koder i filnavnene
                    </CardDescription>
                </CardHeader>
                <CardContent className='space-y-4'>
                    {currentStep === 'upload' && (
                        <>
                            <MultiImageDropZone
                                onFilesAdded={handleFilesAdded}
                                maxImages={100}
                                disabled={isUploading}
                                className='min-h-[200px]'
                            />
                            
                            {inputFiles.length > 0 && (
                                <div className='space-y-2'>
                                    <Label className='text-white'>Uploadede filer ({inputFiles.length})</Label>
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
                                <div className='flex items-center justify-between'>
                                    <Label htmlFor='remove-zeros' className='text-white'>
                                        Fjern foranstillede nuller
                                    </Label>
                                    <Switch
                                        id='remove-zeros'
                                        checked={removeLeadingZeros}
                                        onCheckedChange={setRemoveLeadingZeros}
                                        disabled={isUploading}
                                    />
                                </div>
                                
                                <div className='flex items-center justify-between'>
                                    <Label htmlFor='ai-mode' className='text-white'>
                                        AI-drevet filnavngenkendelse
                                    </Label>
                                    <Switch
                                        id='ai-mode'
                                        checked={useAiMode}
                                        onCheckedChange={setUseAiMode}
                                        disabled={isUploading}
                                    />
                                </div>

                                {useAiMode && (
                                    <div className='space-y-2'>
                                        <Label className='text-white'>AI instruktioner (valgfrit)</Label>
                                        <Textarea
                                            placeholder='F.eks. "Fjern det første 0 fra EAN-koden"'
                                            value={aiInstructions}
                                            onChange={(e) => setAiInstructions(e.target.value)}
                                            className='bg-white/5 border-white/10 text-white placeholder:text-white/40'
                                            rows={3}
                                        />
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {currentStep === 'preview' && (
                        <div className='space-y-4'>
                            <div className='rounded-lg border border-white/10 bg-white/5 p-4'>
                                <h4 className='font-medium text-white mb-2'>Forhåndsvisning af ændringer</h4>
                                <div className='space-y-1 text-sm'>
                                    <p className='text-white/80'>
                                        <CheckCircle className='inline h-4 w-4 text-green-500 mr-1' />
                                        {willRenameCount} filer vil blive omdøbt
                                    </p>
                                    <p className='text-white/80'>
                                        <FileText className='inline h-4 w-4 text-blue-500 mr-1' />
                                        {keepOriginalCount} filer beholder originale navne
                                    </p>
                                    {aiProcessedCount > 0 && (
                                        <p className='text-white/80'>
                                            <Sparkles className='inline h-4 w-4 text-purple-500 mr-1' />
                                            {aiProcessedCount} filer behandlet med AI
                                        </p>
                                    )}
                                </div>
                            </div>

                            <ScrollArea className='h-64 rounded border border-white/10'>
                                <div className='p-4 space-y-2'>
                                    {previewFiles.map((file, index) => (
                                        <div key={index} className='flex items-center gap-2 text-sm'>
                                            {file.status === 'will_rename' ? (
                                                <ArrowRight className='h-4 w-4 text-green-500 flex-shrink-0' />
                                            ) : (
                                                <FileText className='h-4 w-4 text-white/40 flex-shrink-0' />
                                            )}
                                            <div className='flex-1 min-w-0'>
                                                <p className='text-white/60 truncate'>{file.originalName}</p>
                                                {file.status === 'will_rename' && (
                                                    <p className='text-white font-medium truncate'>{file.newName}</p>
                                                )}
                                            </div>
                                            {file.extractionMethod === 'ai' && file.confidence && (
                                                <span className='text-xs text-purple-400'>
                                                    AI {Math.round(file.confidence * 100)}%
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                    )}

                    {/* Progress */}
                    {(isUploading || isProcessing || isPreviewing) && (
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
                    {currentStep === 'upload' && (
                        <>
                            <Button
                                onClick={handleUpload}
                                disabled={isUploading || inputFiles.length === 0}
                                className='flex-1 bg-white text-black hover:bg-white/90'>
                                {isUploading ? (
                                    <>
                                        <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                                        Uploader...
                                    </>
                                ) : (
                                    <>
                                        <Eye className='mr-2 h-4 w-4' />
                                        Forhåndsvis
                                    </>
                                )}
                            </Button>
                            <Button
                                onClick={() => {
                                    setInputFiles([]);
                                    setError(null);
                                }}
                                variant='outline'
                                disabled={isUploading || inputFiles.length === 0}
                                className='border-white/20 text-white hover:bg-white/10'>
                                <Trash2 className='h-4 w-4' />
                            </Button>
                        </>
                    )}
                    {currentStep === 'preview' && (
                        <>
                            <Button
                                onClick={() => {
                                    setCurrentStep('upload');
                                    setPreviewFiles([]);
                                }}
                                variant='outline'
                                disabled={isProcessing}
                                className='border-white/20 text-white hover:bg-white/10'>
                                Tilbage
                            </Button>
                            <Button
                                onClick={handleProcess}
                                disabled={isProcessing || willRenameCount === 0}
                                className='flex-1 bg-white text-black hover:bg-white/90'>
                                {isProcessing ? (
                                    <>
                                        <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                                        Omdøber...
                                    </>
                                ) : (
                                    <>
                                        <Package className='mr-2 h-4 w-4' />
                                        Omdøb {willRenameCount} filer
                                    </>
                                )}
                            </Button>
                        </>
                    )}
                    {currentStep === 'completed' && (
                        <Button
                            onClick={handleClearAll}
                            variant='outline'
                            className='flex-1 border-white/20 text-white hover:bg-white/10'>
                            <Trash2 className='mr-2 h-4 w-4' />
                            Start forfra
                        </Button>
                    )}
                </CardFooter>
            </Card>

            {/* Output Section */}
            <Card className='border-white/10 bg-black/50'>
                <CardHeader>
                    <div className='flex items-center justify-between'>
                        <div>
                            <CardTitle className='flex items-center gap-2 text-white'>
                                <FileText className='h-5 w-5' />
                                Omdøbte filer
                            </CardTitle>
                            <CardDescription className='text-white/60'>
                                Dine filer med nye EAN-baserede navne
                            </CardDescription>
                        </div>
                        {processedFiles.length > 0 && (
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
                    {processedFiles.length === 0 ? (
                        <div className='flex flex-col items-center justify-center py-12 text-center'>
                            <Package className='h-12 w-12 text-white/20 mb-4' />
                            <p className='text-white/60'>
                                Ingen omdøbte filer endnu.
                                <br />
                                Upload og behandl filer for at se dem her.
                            </p>
                        </div>
                    ) : (
                        <ScrollArea className='h-[400px]'>
                            <div className='space-y-2'>
                                {processedFiles.map((file, index) => (
                                    <div
                                        key={index}
                                        className='flex items-center justify-between p-3 rounded-lg border border-white/10 bg-white/5'>
                                        <div className='flex items-center gap-3'>
                                            <FileText className='h-5 w-5 text-white/60' />
                                            <span className='text-sm text-white'>{file.filename}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}