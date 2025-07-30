import { prepareImageForGemini } from '@/lib/image-utils';
import { useState } from 'react';

interface UsePromptRefinementReturn {
    refinePrompt: (prompt: string, imageFiles?: File[], selectedTags?: string[]) => Promise<string | null>;
    isRefining: boolean;
    error: string | null;
}

export function usePromptRefinement(): UsePromptRefinementReturn {
    const [isRefining, setIsRefining] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refinePrompt = async (
        prompt: string,
        imageFiles?: File[],
        selectedTags?: string[]
    ): Promise<string | null> => {
        if (!prompt.trim()) {
            setError('Indtast først en prompt');
            return null;
        }

        setIsRefining(true);
        setError(null);

        try {
            let imageData: string | undefined;

            // Process first image if provided (primary product image)
            if (imageFiles && imageFiles.length > 0) {
                const primaryImage = imageFiles[0];
                const imageResult = await prepareImageForGemini(primaryImage);

                if (!imageResult.success) {
                    throw new Error(imageResult.error || 'Fejl ved behandling af billede');
                }

                imageData = imageResult.data!.base64;
            }

            const requestBody = {
                prompt: prompt.trim(),
                imageData,
                selectedTags: selectedTags || []
            };

            const response = await fetch('/api/refine-prompt', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Der opstod en fejl');
            }

            return data.refinedPrompt;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Ukendt fejl opstod';
            setError(errorMessage);
            return null;
        } finally {
            setIsRefining(false);
        }
    };

    return {
        refinePrompt,
        isRefining,
        error
    };
}
