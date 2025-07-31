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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
    Zap, 
    Upload, 
    Download, 
    Trash2, 
    Image, 
    Loader2, 
    AlertCircle,
    TrendingDown,
    FileDown
} from 'lucide-react';
import * as React from 'react';

interface ImageCompressorProps {
    clientPasswordHash: string | null;
}

interface CompressedFile {
    url: string;
    originalName: string;
    originalSize: number;
    compressedSize: number;
    savedBytes: number;
    savedPercentage: number;
}

interface AnalysisResult {
    q95: { size: number; savedPercentage: number };
    q85: { size: number; savedPercentage: number };
    q70: { size: number; savedPercentage: number };
    q60: { size: number; savedPercentage: number };
    webp: { size: number; savedPercentage: number };
}

const QUALITY_PRESETS = [
    { value: 'high', label: 'Høj kvalitet', quality: 95 },
    { value: 'web', label: 'Web standard', quality: 85 },
    { value: 'email', label: 'Email', quality: 70 },
    { value: 'storage', label: 'Lager', quality: 60 },
    { value: 'custom', label: 'Brugerdefineret', quality: null },
];

export function ImageCompressor({ clientPasswordHash }: ImageCompressorProps) {
    const [inputFiles, setInputFiles] = React.useState<File[]>([]);
    const [compressedFiles, setCompressedFiles] = React.useState<CompressedFile[]>([]);
    const [isCompressing, setIsCompressing] = React.useState(false);
    const [isAnalyzing, setIsAnalyzing] = React.useState(false);
    const [progress, setProgress] = React.useState(0);
    const [progressText, setProgressText] = React.useState('');
    const [error, setError] = React.useState<string | null>(null);
    const [analysisResult, setAnalysisResult] = React.useState<AnalysisResult | null>(null);
    
    // Settings
    const [qualityPreset, setQualityPreset] = React.useState('web');
    const [customQuality, setCustomQuality] = React.useState([85]);
    const [outputFormat, setOutputFormat] = React.useState('original');

    // Get effective quality value
    const getEffectiveQuality = () => {
        if (qualityPreset === 'custom') {
            return customQuality[0];
        }
        const preset = QUALITY_PRESETS.find(p => p.value === qualityPreset);
        return preset?.quality || 85;
    };

    // Handle file upload
    const handleFilesAdded = (files: File[]) => {
        setInputFiles(files);
        setError(null);
        setAnalysisResult(null);
    };

    // Analyze compression potential
    const handleAnalyze = async () => {
        if (inputFiles.length === 0) return;

        setIsAnalyzing(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('file', inputFiles[0]); // Analyze first file
            if (clientPasswordHash) {
                formData.append('passwordHash', clientPasswordHash);
            }

            const response = await fetch('/api/konverter/compress/analyze', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Analyse fejlede');
            }

            const result = await response.json();
            setAnalysisResult(result.results);

        } catch (err) {
            console.error('Error analyzing file:', err);
            setError(err instanceof Error ? err.message : 'Ukendt fejl opstod');
        } finally {
            setIsAnalyzing(false);
        }
    };

    // Compress files
    const handleCompress = async () => {
        if (inputFiles.length === 0) {
            setError('Vælg mindst ét billede at komprimere');
            return;
        }

        setIsCompressing(true);
        setProgress(0);
        setProgressText('Komprimerer billeder...');
        setError(null);
        setCompressedFiles([]);

        try {
            const totalFiles = inputFiles.length;
            const results: CompressedFile[] = [];
            const quality = getEffectiveQuality();

            for (let i = 0; i < totalFiles; i++) {
                const file = inputFiles[i];
                setProgress(Math.round((i / totalFiles) * 100));
                setProgressText(`Komprimerer ${i + 1} af ${totalFiles}...`);

                const formData = new FormData();
                formData.append('file', file);
                formData.append('quality', quality.toString());
                formData.append('preset', qualityPreset === 'custom' ? '' : qualityPreset);
                formData.append('format', outputFormat);
                if (clientPasswordHash) {
                    formData.append('passwordHash', clientPasswordHash);
                }

                const response = await fetch('/api/konverter/compress/compress', {
                    method: 'POST',
                    body: formData,
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    console.error(`Failed to compress ${file.name}:`, errorData.error);
                    continue;
                }

                const result = await response.json();
                results.push({
                    url: result.compressedPath,
                    originalName: result.originalName,
                    originalSize: result.originalSize,
                    compressedSize: result.compressedSize,
                    savedBytes: result.savedBytes,
                    savedPercentage: result.savedPercentage
                });
            }

            setCompressedFiles(results);
            setProgress(100);
            
            // Calculate total savings
            const totalOriginal = results.reduce((sum, f) => sum + f.originalSize, 0);
            const totalCompressed = results.reduce((sum, f) => sum + f.compressedSize, 0);
            const totalSaved = totalOriginal - totalCompressed;
            const totalSavedPercent = Math.round((totalSaved / totalOriginal) * 100);
            
            setProgressText(`Komprimering fuldført! Sparet ${totalSavedPercent}% (${formatFileSize(totalSaved)})`);

        } catch (err) {
            console.error('Error compressing files:', err);
            setError(err instanceof Error ? err.message : 'Ukendt fejl opstod');
        } finally {
            setIsCompressing(false);
            setTimeout(() => {
                setProgress(0);
                setProgressText('');
            }, 3000);
        }
    };

    // Download all as ZIP
    const handleDownloadAll = async () => {
        try {
            const response = await fetch('/api/konverter/compress/download-all', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    files: compressedFiles.map(f => f.url),
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
            a.download = `compressed-images-${Date.now()}.zip`;
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
            const response = await fetch('/api/konverter/compress/clear-all', {
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
            setCompressedFiles([]);
            setAnalysisResult(null);
            setError(null);
        } catch (err) {
            console.error('Error clearing files:', err);
            setError('Kunne ikke rydde filer');
        }
    };

    // Format file size
    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    // Download single file
    const handleDownloadSingle = (file: CompressedFile) => {
        const a = document.createElement('a');
        a.href = file.url;
        a.download = file.originalName.replace(/(\.[^.]+)$/, '-compressed$1');
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
                        <Zap className='h-5 w-5' />
                        Billede Kompressor
                    </CardTitle>
                    <CardDescription className='text-white/60'>
                        Reducer filstørrelse uden synligt kvalitetstab
                    </CardDescription>
                </CardHeader>
                <CardContent className='space-y-4'>
                    <MultiImageDropZone
                        onFilesAdded={handleFilesAdded}
                        maxImages={50}
                        disabled={isCompressing}
                        className='min-h-[200px]'
                    />
                    
                    {inputFiles.length > 0 && (
                        <div className='space-y-2'>
                            <div className='flex items-center justify-between'>
                                <Label className='text-white'>Valgte filer ({inputFiles.length})</Label>
                                {inputFiles.length === 1 && !isAnalyzing && !analysisResult && (
                                    <Button
                                        onClick={handleAnalyze}
                                        size='sm'
                                        variant='outline'
                                        className='border-white/20 text-white hover:bg-white/10'>
                                        <TrendingDown className='mr-2 h-3 w-3' />
                                        Analyser
                                    </Button>
                                )}
                            </div>
                            <ScrollArea className='h-32 rounded border border-white/10 p-2'>
                                {inputFiles.map((file, index) => (
                                    <div key={index} className='text-sm text-white/80'>
                                        {file.name} ({formatFileSize(file.size)})
                                    </div>
                                ))}
                            </ScrollArea>
                        </div>
                    )}

                    {/* Analysis Results */}
                    {analysisResult && (
                        <div className='rounded-lg border border-white/10 bg-white/5 p-4 space-y-2'>
                            <p className='text-sm font-medium text-white mb-2'>Komprimeringsanalyse:</p>
                            <div className='space-y-1 text-sm'>
                                <p className='text-white/80'>Høj (95%): -{analysisResult.q95.savedPercentage}%</p>
                                <p className='text-white/80'>Standard (85%): -{analysisResult.q85.savedPercentage}%</p>
                                <p className='text-white/80'>Email (70%): -{analysisResult.q70.savedPercentage}%</p>
                                <p className='text-white/80'>Lager (60%): -{analysisResult.q60.savedPercentage}%</p>
                                <p className='text-purple-400'>WebP (85%): -{analysisResult.webp.savedPercentage}%</p>
                            </div>
                        </div>
                    )}

                    {/* Settings */}
                    <div className='space-y-4 pt-4 border-t border-white/10'>
                        <div className='space-y-3'>
                            <Label className='text-white'>Kvalitetsindstilling</Label>
                            <RadioGroup value={qualityPreset} onValueChange={setQualityPreset}>
                                {QUALITY_PRESETS.map(preset => (
                                    <div key={preset.value} className='flex items-center space-x-2'>
                                        <RadioGroupItem value={preset.value} id={preset.value} />
                                        <Label htmlFor={preset.value} className='text-white/80 font-normal cursor-pointer'>
                                            {preset.label} {preset.quality && `(${preset.quality}%)`}
                                        </Label>
                                    </div>
                                ))}
                            </RadioGroup>
                        </div>

                        {qualityPreset === 'custom' && (
                            <div className='space-y-2'>
                                <Label className='text-white'>
                                    Brugerdefineret kvalitet: {customQuality[0]}%
                                </Label>
                                <Slider
                                    value={customQuality}
                                    onValueChange={setCustomQuality}
                                    max={100}
                                    min={1}
                                    step={1}
                                    disabled={isCompressing}
                                    className='w-full'
                                />
                            </div>
                        )}

                        <div className='space-y-2'>
                            <Label className='text-white'>Output format</Label>
                            <Select value={outputFormat} onValueChange={setOutputFormat}>
                                <SelectTrigger className='bg-white/5 border-white/10 text-white'>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value='original'>Original format</SelectItem>
                                    <SelectItem value='jpg'>Konverter til JPG</SelectItem>
                                    <SelectItem value='webp'>Konverter til WebP</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Progress */}
                    {(isCompressing || isAnalyzing) && (
                        <div className='space-y-2'>
                            <Progress value={progress} className='h-2' />
                            <p className='text-sm text-white/60 text-center'>
                                {isAnalyzing ? 'Analyserer...' : progressText}
                            </p>
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
                        onClick={handleCompress}
                        disabled={isCompressing || inputFiles.length === 0}
                        className='flex-1 bg-white text-black hover:bg-white/90'>
                        {isCompressing ? (
                            <>
                                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                                Komprimerer...
                            </>
                        ) : (
                            <>
                                <Zap className='mr-2 h-4 w-4' />
                                Komprimer ({getEffectiveQuality()}%)
                            </>
                        )}
                    </Button>
                    <Button
                        onClick={handleClearAll}
                        variant='outline'
                        disabled={isCompressing}
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
                                <FileDown className='h-5 w-5' />
                                Komprimerede billeder
                            </CardTitle>
                            <CardDescription className='text-white/60'>
                                Optimerede billeder med reduceret filstørrelse
                            </CardDescription>
                        </div>
                        {compressedFiles.length > 0 && (
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
                    {compressedFiles.length === 0 ? (
                        <div className='flex flex-col items-center justify-center py-12 text-center'>
                            <Zap className='h-12 w-12 text-white/20 mb-4' />
                            <p className='text-white/60'>
                                Ingen komprimerede billeder endnu.
                                <br />
                                Vælg billeder og kvalitet for at starte.
                            </p>
                        </div>
                    ) : (
                        <ScrollArea className='h-[400px]'>
                            <div className='space-y-3'>
                                {compressedFiles.map((file, index) => (
                                    <div
                                        key={index}
                                        className='p-4 rounded-lg border border-white/10 bg-white/5 space-y-2'>
                                        <div className='flex items-center justify-between'>
                                            <p className='text-sm font-medium text-white truncate flex-1'>
                                                {file.originalName}
                                            </p>
                                            <Button
                                                onClick={() => handleDownloadSingle(file)}
                                                size='sm'
                                                variant='ghost'
                                                className='text-white hover:bg-white/10'>
                                                <Download className='h-4 w-4' />
                                            </Button>
                                        </div>
                                        <div className='flex items-center justify-between text-xs text-white/60'>
                                            <span>{formatFileSize(file.originalSize)}</span>
                                            <span className='text-green-400'>
                                                → {formatFileSize(file.compressedSize)} (-{file.savedPercentage}%)
                                            </span>
                                        </div>
                                        <div className='w-full bg-white/10 rounded-full h-2'>
                                            <div 
                                                className='bg-green-500 h-2 rounded-full transition-all'
                                                style={{ width: `${100 - file.savedPercentage}%` }}
                                            />
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