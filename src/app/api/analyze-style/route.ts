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

        // Check if any files are PDFs
        const hasPdf = files.some((file: { mimeType: string }) => file.mimeType === 'application/pdf');

        const systemPrompt = hasPdf 
            ? `Du er en ekspert magasin- og kataloganalytiker med speciale i at udtrække genbrugelige fotografiske stilarter fra publikationer. Analyser det uploadede magasin/katalog og identificer de konsistente visuelle mønstre der kan bruges som fundament for nye produktserier.

Fokusér på at finde GENTAGENDE stilistiske elementer på tværs af siderne - ikke enkeltstående billeder. Se efter:

1. **Belysning** (konsistente lysopsætninger):
   - Typiske lyssetups brugt gennem publikationen
   - Foretrukne lysretninger og -kvaliteter
   - Signatur-lysteknikker der går igen
   - Balance mellem hoved- og fyldlys

2. **Komposition & Indramning** (genbrugelige mønstre):
   - Standard kameravinkler og perspektiver
   - Typiske produktplaceringer i rammen
   - Konsistente kompositionsregler
   - Foretrukne beskæringer og formater

3. **Farver & Stemning** (brand-identitet):
   - Gennemgående farvepalette
   - Konsistent farvegrading
   - Stemning og atmosfære gennem publikationen
   - Farvetemperatur tendenser

4. **Tekniske Standarder** (produktionsstil):
   - Typisk dybdeskarphed og fokusteknik
   - Foretrukne brændvidder til forskellige produkttyper
   - Konsistent billedkvalitet og skarphed
   - Tekniske signaturer

5. **Styling & Opsætning** (produktionselementer):
   - Genbrugelige baggrunde og miljøer
   - Typiske rekvisitter og deres anvendelse
   - Konsistente stylingprincipper
   - Produktpræsentationsmønstre

6. **Overordnet Stil** (visuelt DNA):
   - Publikationens fotografiske signatur
   - Hvad gør denne stil genkendelig
   - Produktionsniveau og finish
   - Målgruppe og æstetik

Giv konkrete, handlingsrettede indsigter som en fotograf kan bruge til at skabe nye billeder i samme stil.`
            : `Du er en ekspert visuel analytiker med speciale i at identificere og beskrive visuelle stilarter fra billeder. Analyser de uploadede billeder og giv en detaljeret beskrivelse af den fotografiske stil.

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

        // Adjust the final prompt suggestion format for PDFs
        const finalSystemPrompt = hasPdf 
            ? systemPrompt + `

VIGTIGT: promptSuggestion skal være en prompt der kan bruges til at skabe NYE produktbilleder i samme stil som magasinet - ikke en beskrivelse af magasinet selv. Fokusér på genbrugelige stilistiske elementer.`
            : systemPrompt;

        // Build content parts for multimodal input
        const contentParts: any[] = [{ text: finalSystemPrompt }];

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