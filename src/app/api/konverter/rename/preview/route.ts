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
    
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });
        
        const prompt = `Analyze these filenames and extract EAN codes (13-digit barcodes).
Return ONLY a JSON array with objects containing "ean" (the 13-digit code or null) and "confidence" (0-1).

Filenames:
${filenames.join('\n')}

Example response:
[{"ean":"5710350003495","confidence":0.9},{"ean":null,"confidence":0}]`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        // Extract JSON from response
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
    } catch (error) {
        console.error('AI analysis failed:', error);
    }
    
    return filenames.map(() => ({ ean: null, confidence: 0 }));
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