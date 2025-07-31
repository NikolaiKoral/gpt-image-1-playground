import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: NextRequest) {
    try {
        const { files } = await request.json();

        if (!files || !Array.isArray(files) || files.length === 0) {
            return NextResponse.json({ error: 'Mindst én fil er påkrævet' }, { status: 400 });
        }

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: 'Gemini API-nøgle ikke konfigureret' }, { status: 500 });
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });

        const systemPrompt = `Du er en ekspert visuel analytiker med speciale i at identificere og beskrive visuelle stilarter fra både billeder og PDF-dokumenter. Analyser de uploadede filer og giv en detaljeret beskrivelse af den visuelle stil.

Analyser følgende aspekter:

1. **Belysning**:
   - Type (naturligt, studielys, blandet)
   - Retning og kvalitet (hårdt/blødt)
   - Nøglelyskilde og fyldlys
   - Skygger og højlys

2. **Komposition & Indramning**:
   - Kameravinkel og perspektiv
   - Regel om tredjedele eller andre kompositionsteknikker
   - Dybdeskarphed og fokuspunkter
   - Negativ plads og balance

3. **Farver & Stemning**:
   - Farvepalette og temperatur
   - Kontrast og mætning
   - Farvegrading og stilisering
   - Overordnet stemning og atmosfære

4. **Tekniske Indstillinger**:
   - Estimeret blænde (f-stop)
   - Brændvidde og objektivtype
   - ISO og støjniveau
   - Lukkertid (hvis synlig bevægelse)

5. **Styling & Props**:
   - Rekvisitter og deres placering
   - Baggrund og miljø
   - Teksturer og materialer
   - Overordnet æstetik

6. **Fotografisk Stil**:
   - Genre (kommerciel, redaktionel, kunstnerisk)
   - Inspirationskilder eller lignende stilarter
   - Professionel vs. naturlig stil
   - Unikke stilistiske elementer

Formatér dit svar som struktureret JSON med følgende format:
{
  "lighting": {
    "description": "Detaljeret beskrivelse af belysning",
    "keyElements": ["element1", "element2", "element3"]
  },
  "composition": {
    "description": "Detaljeret beskrivelse af komposition",
    "keyElements": ["element1", "element2", "element3"]
  },
  "colorMood": {
    "description": "Detaljeret beskrivelse af farver og stemning",
    "keyElements": ["element1", "element2", "element3"]
  },
  "technical": {
    "description": "Tekniske indstillinger og udstyr",
    "keyElements": ["element1", "element2", "element3"]
  },
  "styling": {
    "description": "Styling, props og miljø",
    "keyElements": ["element1", "element2", "element3"]
  },
  "overallStyle": {
    "description": "Overordnet fotografisk stil",
    "keyElements": ["element1", "element2", "element3"]
  },
  "promptSuggestion": "En komplet prompt der fanger essensen af denne stil til AI-billedgenerering"
}

Svar KUN med JSON-objektet på dansk, ingen yderligere tekst.`;

        // Build content parts for multimodal input
        const contentParts: any[] = [{ text: systemPrompt }];

        // Add all files with their proper mime types
        files.forEach((fileData: { base64: string; mimeType: string }) => {
            contentParts.push({
                inlineData: {
                    mimeType: fileData.mimeType,
                    data: fileData.base64
                }
            });
        });

        const result = await model.generateContent({
            contents: [
                {
                    role: 'user',
                    parts: contentParts
                }
            ]
        });

        const responseText = result.response.text().trim();
        
        // Parse JSON response
        let styleAnalysis;
        try {
            // Remove any markdown code blocks if present
            const jsonText = responseText.replace(/```json\n?|\n?```/g, '');
            styleAnalysis = JSON.parse(jsonText);
        } catch (parseError) {
            console.error('Failed to parse Gemini response:', responseText);
            throw new Error('Kunne ikke parse stilanalyse');
        }

        return NextResponse.json({ styleAnalysis });
    } catch (error) {
        console.error('Fejl ved stilanalyse:', error);

        // Handle specific Gemini API errors
        if (error instanceof Error) {
            if (error.message.includes('API_KEY_INVALID')) {
                return NextResponse.json({ error: 'Ugyldig Gemini API-nøgle' }, { status: 401 });
            }
            if (error.message.includes('QUOTA_EXCEEDED')) {
                return NextResponse.json({ error: 'API-kvote overskredet. Prøv igen senere.' }, { status: 429 });
            }
        }

        return NextResponse.json({ error: 'Der opstod en fejl ved stilanalyse' }, { status: 500 });
    }
}