import { prepareImageForGemini } from '@/lib/image-utils';
import { preparePdfForGemini, isPdfFile } from '@/lib/pdf-utils';
import { useState } from 'react';

export interface StyleAnalysisSection {
    description: string;
    keyElements: string[];
}

export interface StyleAnalysis {
    lighting: StyleAnalysisSection;
    composition: StyleAnalysisSection;
    colorMood: StyleAnalysisSection;
    technical: StyleAnalysisSection;
    styling: StyleAnalysisSection;
    overallStyle: StyleAnalysisSection;
    promptSuggestion: string;
}

interface UseStyleAnalysisReturn {
    analyzeStyle: (files: File[]) => Promise<StyleAnalysis | null>;
    isAnalyzing: boolean;
    error: string | null;
}

export function useStyleAnalysis(): UseStyleAnalysisReturn {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const analyzeStyle = async (files: File[]): Promise<StyleAnalysis | null> => {
        if (!files || files.length === 0) {
            setError('Vælg mindst én fil til analyse');
            return null;
        }

        setIsAnalyzing(true);
        setError(null);

        try {
            // Process all files (images and PDFs)
            const fileDataPromises = files.map(async (file) => {
                if (isPdfFile(file)) {
                    // Handle PDF files
                    const result = await preparePdfForGemini(file);
                    if (!result.success) {
                        throw new Error(result.error || `Fejl ved behandling af PDF: ${file.name}`);
                    }
                    return {
                        base64: result.data!.base64,
                        mimeType: result.data!.mimeType
                    };
                } else {
                    // Handle image files
                    const result = await prepareImageForGemini(file);
                    if (!result.success) {
                        throw new Error(result.error || `Fejl ved behandling af billede: ${file.name}`);
                    }
                    return {
                        base64: result.data!.base64,
                        mimeType: result.data!.mimeType
                    };
                }
            });

            const filesData = await Promise.all(fileDataPromises);

            const response = await fetch('/api/analyze-style', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ files: filesData })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Der opstod en fejl ved stilanalyse');
            }

            return data.styleAnalysis as StyleAnalysis;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Ukendt fejl opstod';
            setError(errorMessage);
            return null;
        } finally {
            setIsAnalyzing(false);
        }
    };

    return {
        analyzeStyle,
        isAnalyzing,
        error
    };
}