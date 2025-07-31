import { NextRequest, NextResponse } from 'next/server';
import { uploadedFiles, processedRenameFiles } from '../storage';
import { processFilesForRename } from '@/lib/ean-processor';
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
    console.log('Received POST request to /api/konverter/rename/process');
    
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
                sessionFiles.push({
                    filename: file.filename,
                    buffer: file.buffer
                });
            }
        }
        
        if (sessionFiles.length === 0) {
            return NextResponse.json({ error: 'Ingen filer fundet at behandle' }, { status: 400 });
        }
        
        console.log(`Found ${sessionFiles.length} files to process for session ${sessionId}`);
        
        // Clear any existing processed files for this session
        for (const [key] of processedRenameFiles) {
            if (key.startsWith(sessionId)) {
                processedRenameFiles.delete(key);
            }
        }
        
        // Perform AI analysis if enabled
        let aiResults: Array<{ ean: string | null; confidence: number }> | undefined;
        if (useAiMode && genAI) {
            console.log('Performing AI analysis for processing...');
            const filenames = sessionFiles.map(f => f.filename);
            aiResults = await analyzeFilenamesWithAI(filenames);
        }
        
        // Process files for rename
        const processedFiles = processFilesForRename(
            sessionFiles.map(f => ({ originalName: f.filename, buffer: f.buffer })),
            { removeLeadingZeros, aiResults }
        );
        
        // Store processed files
        let successCount = 0;
        let copiedAsIsCount = 0;
        
        processedFiles.forEach((file, index) => {
            const fileKey = `${sessionId}-${index}`;
            processedRenameFiles.set(fileKey, {
                filename: file.newName,
                buffer: file.buffer,
                originalName: file.originalName
            });
            
            if (file.success) {
                successCount++;
            } else {
                copiedAsIsCount++;
            }
        });
        
        // Clean up uploaded files for this session
        for (const [key] of uploadedFiles) {
            if (key.startsWith(sessionId)) {
                uploadedFiles.delete(key);
            }
        }
        
        console.log(`Processed ${processedFiles.length} files: ${successCount} renamed, ${copiedAsIsCount} kept original names`);
        
        return NextResponse.json({
            message: `Behandlet ${processedFiles.length} filer: ${successCount} omdøbt med EAN, ${copiedAsIsCount} beholdt originale navne`,
            summary: {
                success: true,
                copiedCount: successCount,
                copiedAsIsCount,
                errorCount: 0
            }
        });
        
    } catch (error) {
        console.error('Error processing files:', error);
        return NextResponse.json(
            { error: 'Behandling fejlede: ' + (error instanceof Error ? error.message : 'Ukendt fejl') },
            { status: 500 }
        );
    }
}