import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: NextRequest) {
    try {
        const { prompt, imageData, selectedTags } = await request.json();

        if (!prompt || typeof prompt !== 'string') {
            return NextResponse.json(
                { error: 'Prompt er påkrævet' },
                { status: 400 }
            );
        }

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json(
                { error: 'Gemini API-nøgle ikke konfigureret' },
                { status: 500 }
            );
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });

        // Build system prompt with context
        const tagsText = selectedTags && selectedTags.length > 0 
            ? `Valgte tags: ${selectedTags.join(', ')}`
            : 'Ingen specifikke tags valgt';

        const systemPrompt = `Du er en ekspert i produktfotografering og AI-billedgenerering. ${imageData ? 'Analyser det uploadede billede og' : ''} din opgave er at forbedre og raffinere fotografi-prompts for bedre resultater.

${imageData ? `Når du analyserer billedet, fokuser på:
1. Produkttype, form, størrelse og karakteristika
2. Nuværende materialer, teksturer og overfladefinish
3. Eksisterende belysning, skygger og atmosfære
4. Baggrund, miljø og kompositionsdetaljer
5. Farvepalette og visuel stemning` : ''}

Forbedringer du skal lave:
1. Tilføj specifikke tekniske kamera-indstillinger (objektiv, ISO, blænde, brændvidde)
2. Beskriv professionel belysningssetup og stemning
3. Inkluder præcis komposition og indramning
4. Tilføj detaljerede stil og æstetiske beskrivelser
5. Specificer materialer, teksturer og overfladefinish
6. Forbedr farvepalette og atmosfære med tekniske termer

${tagsText}

Behold det originale produktfokus og den overordnede intention. Gør prompten meget mere præcis, teknisk og specifik, men stadig læsbar. Inkluder professionel fotografiudrustning og indstillinger.

Original prompt: "${prompt}"

Svar kun med den forbedrede prompt på dansk - ingen forklaringer:`;

        // Build content parts for multimodal input
        const contentParts = [{ text: systemPrompt }];

        // Add image if provided
        if (imageData) {
            contentParts.push({
                inlineData: {
                    mimeType: 'image/jpeg',
                    data: imageData
                }
            });
        }

        const result = await model.generateContent({
            contents: [{
                role: 'user',
                parts: contentParts
            }]
        });

        const refinedPrompt = result.response.text().trim();

        return NextResponse.json({ refinedPrompt });

    } catch (error) {
        console.error('Fejl ved forbedring af prompt:', error);
        
        // Handle specific Gemini API errors
        if (error instanceof Error) {
            if (error.message.includes('API_KEY_INVALID')) {
                return NextResponse.json(
                    { error: 'Ugyldig Gemini API-nøgle' },
                    { status: 401 }
                );
            }
            if (error.message.includes('QUOTA_EXCEEDED')) {
                return NextResponse.json(
                    { error: 'API-kvote overskredet. Prøv igen senere.' },
                    { status: 429 }
                );
            }
        }

        return NextResponse.json(
            { error: 'Der opstod en fejl ved forbedring af prompt' },
            { status: 500 }
        );
    }
}