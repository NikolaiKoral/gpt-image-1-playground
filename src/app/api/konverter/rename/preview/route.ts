import { NextRequest, NextResponse } from 'next/server';
import { uploadedFiles } from '../storage';
import { processFilesForPreview } from '@/lib/ean-processor';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini for AI-powered filename parsing if enabled
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

async function analyzeFilenamesWithAI(filenames: string[]): Promise<Array<{ ean: string | null; confidence: number }>> {
    if (!genAI) {
        return filenames.map(() => ({ ean: null, confidence: 0 }));
    }
    
    const results: Array<{ ean: string | null; confidence: number }> = [];
    
    // Process filenames in batches to avoid rate limits
    const batchSize = 5;
    for (let i = 0; i < filenames.length; i += batchSize) {
        const batch = filenames.slice(i, i + batchSize);
        const batchPromises = batch.map(async (filename) => {
            try {
                const model = genAI.getGenerativeModel({ 
                    model: 'gemini-2.0-flash-exp',
                    generationConfig: {
                        temperature: 0.1,
                        topP: 0.8,
                        topK: 40,
                        maxOutputTokens: 100,
                    }
                });
                
                const prompt = `Extract the 12 or 13 digit EAN/UPC barcode number from this filename: "${filename}"

Rules:
- EAN codes are exactly 12 or 13 consecutive digits
- They may be surrounded by underscores, hyphens, dots, or other separators
- Ignore any other numbers that aren't 12-13 digits long
- Return ONLY the EAN number, nothing else
- If no valid EAN found, return "NO_EAN"

Examples:
"product_0630870296793_large.jpg" → "0630870296793"
"IMG-8901030865278-FINAL.png" → "8901030865278"
"item_desc_0843251198986_v2.jpg" → "0843251198986"
"0630870296793__1__new.jpg" → "0630870296793"
"random_text_123.jpg" → "NO_EAN"
"photo_98765.png" → "NO_EAN"

Filename: "${filename}"
EAN:`;

                const result = await model.generateContent(prompt);
                const response = await result.response;
                const text = response.text().trim();
                
                // Validate the response
                let ean: string | null = null;
                let confidence = 0;

                if (text !== 'NO_EAN' && /^\d{12,13}$/.test(text)) {
                    ean = text;
                    confidence = 0.9; // High confidence for valid EAN format
                } else if (text === 'NO_EAN') {
                    confidence = 0.8; // High confidence that no EAN was found
                } else {
                    // Unexpected response format, try to extract EAN with regex
                    const match = text.match(/\b(\d{12,13})\b/);
                    if (match) {
                        ean = match[1];
                        confidence = 0.7; // Lower confidence for extracted EAN
                    } else {
                        confidence = 0.3; // Low confidence, couldn't parse response
                    }
                }
                
                console.log(`AI parsed "${filename}" → EAN: ${ean || 'none'}, confidence: ${confidence}`);
                return { ean, confidence };
                
            } catch (error) {
                console.error('Error parsing filename with Gemini:', error);
                return { ean: null, confidence: 0 };
            }
        });
        
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
    }
    
    return results;
}

export async function POST(request: NextRequest) {
    console.log('Received POST request to /api/konverter/rename/preview');
    
    try {
        const body = await request.json();
        const { removeLeadingZeros = false, useAiMode = false, aiInstructions = null } = body;
        
        // Get session ID from cookie
        const sessionId = request.cookies.get('rename_session')?.value;
        if (!sessionId) {
            return NextResponse.json({ error: 'Ingen aktiv session' }, { status: 400 });
        }
        
        // Get uploaded files for this session
        const sessionFiles: Array<{ filename: string; buffer: Buffer }> = [];
        for (const [key, file] of uploadedFiles) {
            if (key.startsWith(sessionId)) {
                sessionFiles.push(file);
            }
        }
        
        if (sessionFiles.length === 0) {
            return NextResponse.json({ error: 'Ingen filer fundet at forhåndsvise' }, { status: 400 });
        }
        
        console.log(`Found ${sessionFiles.length} files to preview for session ${sessionId}`);
        
        // Extract filenames
        const filenames = sessionFiles.map(f => f.filename);
        
        // Perform AI analysis if enabled
        let aiResults: Array<{ ean: string | null; confidence: number }> | undefined;
        if (useAiMode && genAI) {
            console.log('Performing AI analysis for preview...');
            aiResults = await analyzeFilenamesWithAI(filenames);
        }
        
        // Process files for preview
        const previewResults = processFilesForPreview(filenames, {
            removeLeadingZeros,
            aiResults
        });
        
        // Calculate summary statistics
        const renamedCount = previewResults.filter(r => r.status === 'will_rename').length;
        const keptOriginalCount = previewResults.filter(r => r.status === 'keep_original').length;
        const aiProcessedCount = previewResults.filter(r => r.extractionMethod === 'ai').length;
        
        return NextResponse.json({
            message: `Forhåndsvisning komplet: ${renamedCount} filer vil blive omdøbt, ${keptOriginalCount} beholder originale navne`,
            totalFiles: sessionFiles.length,
            renamedCount,
            keptOriginalCount,
            aiProcessedCount,
            aiModeEnabled: useAiMode && !!genAI,
            files: previewResults.map((result, index) => ({
                ...result,
                size: sessionFiles[index].buffer.length
            }))
        });
        
    } catch (error) {
        console.error('Error previewing files:', error);
        return NextResponse.json(
            { error: 'Forhåndsvisning fejlede: ' + (error instanceof Error ? error.message : 'Ukendt fejl') },
            { status: 500 }
        );
    }
}