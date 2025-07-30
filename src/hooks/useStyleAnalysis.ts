import { prepareImageForGemini } from '@/lib/image-utils';
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
    analyzeStyle: (imageFiles: File[]) => Promise<StyleAnalysis | null>;
    isAnalyzing: boolean;
    error: string | null;
}

export function useStyleAnalysis(): UseStyleAnalysisReturn {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const analyzeStyle = async (imageFiles: File[]): Promise<StyleAnalysis | null> => {
        if (!imageFiles || imageFiles.length === 0) {
            setError('Vælg mindst ét billede til analyse');
            return null;
        }

        if (imageFiles.length > 5) {
            setError('Maksimalt 5 billeder kan analyseres ad gangen');
            return null;
        }

        setIsAnalyzing(true);
        setError(null);

        try {
            // Process all images
            const imageDataPromises = imageFiles.map(async (file) => {
                const result = await prepareImageForGemini(file);
                if (!result.success) {
                    throw new Error(result.error || `Fejl ved behandling af billede: ${file.name}`);
                }
                return result.data!.base64;
            });

            const images = await Promise.all(imageDataPromises);

            const response = await fetch('/api/analyze-style', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ images })
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