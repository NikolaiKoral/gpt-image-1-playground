'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useStyleAnalysis, type StyleAnalysis, type StyleAnalysisSection } from '@/hooks/useStyleAnalysis';
import { isPdfFile, formatFileSize } from '@/lib/pdf-utils';
import { cn } from '@/lib/utils';
import {
    Camera,
    Palette,
    Lightbulb,
    Layout,
    Package,
    Sparkles,
    Upload,
    X,
    Copy,
    Check,
    Loader2,
    Image as ImageIcon,
    AlertCircle,
    FileText
} from 'lucide-react';
import * as React from 'react';

interface StyleAnalyzerProps {
    onApplyPrompt: (prompt: string) => void;
    className?: string;
}

const SECTION_ICONS = {
    lighting: Lightbulb,
    composition: Layout,
    colorMood: Palette,
    technical: Camera,
    styling: Package,
    overallStyle: Sparkles
};

const SECTION_TITLES = {
    lighting: 'Belysning',
    composition: 'Komposition & Indramning',
    colorMood: 'Farver & Stemning',
    technical: 'Tekniske Indstillinger',
    styling: 'Styling & Props',
    overallStyle: 'Overordnet Stil'
};

export function StyleAnalyzer({ onApplyPrompt, className }: StyleAnalyzerProps) {
    const [files, setFiles] = React.useState<File[]>([]);
    const [previewUrls, setPreviewUrls] = React.useState<string[]>([]);
    const [analysis, setAnalysis] = React.useState<StyleAnalysis | null>(null);
    const [copiedSection, setCopiedSection] = React.useState<string | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const { analyzeStyle, isAnalyzing, error } = useStyleAnalysis();

    // Cleanup preview URLs on unmount
    React.useEffect(() => {
        return () => {
            previewUrls.forEach(url => URL.revokeObjectURL(url));
        };
    }, [previewUrls]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(e.target.files || []);
        if (selectedFiles.length === 0) return;

        // No limit on files to leverage 1M token context
        // But check total size (20MB per file limit)
        const validFiles = selectedFiles.filter(file => {
            if (file.size > 20 * 1024 * 1024) {
                console.warn(`File ${file.name} is too large (${formatFileSize(file.size)}). Max 20MB per file.`);
                return false;
            }
            return true;
        });
        
        // Create preview URLs for images only
        const newPreviewUrls = validFiles.map(file => {
            if (isPdfFile(file)) {
                return ''; // No preview for PDFs
            }
            return URL.createObjectURL(file);
        });
        
        // Clean up old preview URLs
        previewUrls.forEach(url => {
            if (url) URL.revokeObjectURL(url);
        });
        
        setFiles(validFiles);
        setPreviewUrls(newPreviewUrls);
        setAnalysis(null);
    };

    const handleRemoveFile = (index: number) => {
        const newFiles = files.filter((_, i) => i !== index);
        const newUrls = previewUrls.filter((_, i) => i !== index);
        
        // Clean up removed URL if it exists
        if (previewUrls[index]) {
            URL.revokeObjectURL(previewUrls[index]);
        }
        
        setFiles(newFiles);
        setPreviewUrls(newUrls);
        
        if (newFiles.length === 0) {
            setAnalysis(null);
        }
    };

    const handleAnalyze = async () => {
        if (files.length === 0) return;
        
        const result = await analyzeStyle(files);
        if (result) {
            setAnalysis(result);
        }
    };

    const handleCopySection = async (text: string, sectionKey: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedSection(sectionKey);
            setTimeout(() => setCopiedSection(null), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const handleApplyFullPrompt = () => {
        if (analysis?.promptSuggestion) {
            onApplyPrompt(analysis.promptSuggestion);
        }
    };

    const renderAnalysisSection = (key: string, section: StyleAnalysisSection) => {
        const Icon = SECTION_ICONS[key as keyof typeof SECTION_ICONS];
        const title = SECTION_TITLES[key as keyof typeof SECTION_TITLES];
        
        return (
            <div key={key} className="space-y-3 p-4 rounded-lg border border-white/10 bg-black/20">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                        <Icon className="h-5 w-5 text-primary" />
                        <h4 className="font-medium">{title}</h4>
                    </div>
                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => handleCopySection(section.description, key)}
                    >
                        {copiedSection === key ? (
                            <Check className="h-4 w-4 text-green-600" />
                        ) : (
                            <Copy className="h-4 w-4" />
                        )}
                    </Button>
                </div>
                <p className="text-sm text-muted-foreground">{section.description}</p>
                <div className="flex flex-wrap gap-2">
                    {section.keyElements.map((element, idx) => (
                        <span
                            key={idx}
                            className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                        >
                            {element}
                        </span>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className={cn('space-y-4', className)}>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ImageIcon className="h-5 w-5" />
                        Stil Inspiration
                    </CardTitle>
                    <CardDescription>
                        Upload billeder eller PDF-magasiner/kataloger for at analysere deres fotografiske stil (maks 20MB pr. fil)
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* File Input */}
                    <div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*,.pdf,application/pdf"
                            multiple
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                        <Button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isAnalyzing}
                            variant="outline"
                            className="w-full"
                        >
                            <Upload className="mr-2 h-4 w-4" />
                            Vælg billeder eller PDF-magasiner
                        </Button>
                    </div>

                    {/* File Previews */}
                    {files.length > 0 && (
                        <div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                {files.map((file, index) => {
                                    const isPdf = isPdfFile(file);
                                    const url = previewUrls[index];
                                    
                                    return (
                                        <div key={index} className="relative">
                                            <div className="aspect-square rounded-lg border border-white/10 bg-black/20 overflow-hidden">
                                                {isPdf ? (
                                                    <div className="flex flex-col items-center justify-center h-full p-4">
                                                        <FileText className="h-12 w-12 text-primary mb-2" />
                                                        <p className="text-xs text-center text-muted-foreground line-clamp-2">
                                                            {file.name}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground mt-1">
                                                            {formatFileSize(file.size)}
                                                        </p>
                                                    </div>
                                                ) : url ? (
                                                    <img
                                                        src={url}
                                                        alt={`Reference ${index + 1}`}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : null}
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                className="absolute top-1 right-1 h-6 w-6 p-0"
                                                onClick={() => handleRemoveFile(index)}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    );
                                })}
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                                {files.length} fil{files.length !== 1 ? 'er' : ''} valgt
                            </p>
                        </div>
                    )}

                    {/* Analyze Button */}
                    {files.length > 0 && !analysis && (
                        <Button
                            onClick={handleAnalyze}
                            disabled={isAnalyzing}
                            className="w-full"
                        >
                            {isAnalyzing ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Analyserer stil...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="mr-2 h-4 w-4" />
                                    Analyser stil med AI
                                </>
                            )}
                        </Button>
                    )}

                    {/* Error Display */}
                    {error && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-200">
                            <AlertCircle className="h-4 w-4" />
                            <span className="text-sm">{error}</span>
                        </div>
                    )}

                    {/* Analysis Results */}
                    {analysis && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold">Stilanalyse</h3>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                        setAnalysis(null);
                                        setFiles([]);
                                        setPreviewUrls([]);
                                    }}
                                >
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Ny analyse
                                </Button>
                            </div>

                            <div className="space-y-3">
                                {Object.entries(analysis).map(([key, value]) => {
                                    if (key === 'promptSuggestion') return null;
                                    return renderAnalysisSection(key, value as StyleAnalysisSection);
                                })}
                            </div>

                            {/* Full Prompt Suggestion */}
                            {analysis.promptSuggestion && (
                                <Card className="border-primary/20 bg-primary/5">
                                    <CardHeader>
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <Sparkles className="h-4 w-4" />
                                            Komplet Prompt Forslag
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <p className="text-sm">{analysis.promptSuggestion}</p>
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                onClick={handleApplyFullPrompt}
                                                className="flex-1"
                                            >
                                                Brug denne prompt
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleCopySection(analysis.promptSuggestion, 'prompt')}
                                            >
                                                {copiedSection === 'prompt' ? (
                                                    <Check className="h-4 w-4" />
                                                ) : (
                                                    <Copy className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

// Fix for missing RefreshCw import
import { RefreshCw } from 'lucide-react';