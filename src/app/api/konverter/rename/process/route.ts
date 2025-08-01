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
    
    const results: Array<{ ean: string | null; confidence: number }> = [];
    
    // Process filenames in batches to avoid rate limits
    const batchSize = 5;
    for (let i = 0; i < filenames.length; i += batchSize) {
        const batch = filenames.slice(i, i + batchSize);
        const batchPromises = batch.map(async (filename) => {
            try {
                const model = genAI.getGenerativeModel({ 
                    model: 'gemini-2.5-pro',
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
            
            // Log AI results for debugging
            console.log('AI Results:', aiResults.map((result, index) => ({
                filename: filenames[index],
                ean: result.ean,
                confidence: result.confidence
            })));
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