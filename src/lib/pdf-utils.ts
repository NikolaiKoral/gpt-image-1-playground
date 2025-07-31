/**
 * Utility functions for handling PDF files
 */

export interface PreparedPdf {
    mimeType: string;
    base64: string;
    fileName: string;
    fileSize: number;
}

export interface PdfPreparationResult {
    success: boolean;
    data?: PreparedPdf;
    error?: string;
}

/**
 * Convert a PDF file to base64 for Gemini API
 * @param file - The PDF file to convert
 * @returns Promise with the prepared PDF data
 */
export async function preparePdfForGemini(file: File): Promise<PdfPreparationResult> {
    try {
        // Validate file type
        if (file.type !== 'application/pdf') {
            return {
                success: false,
                error: 'Filen er ikke en PDF'
            };
        }

        // Check file size (20MB limit for Gemini API)
        const maxSize = 20 * 1024 * 1024; // 20MB in bytes
        if (file.size > maxSize) {
            return {
                success: false,
                error: `PDF-filen er for stor. Maksimal størrelse er 20MB, din fil er ${(file.size / 1024 / 1024).toFixed(1)}MB`
            };
        }

        // Convert to base64
        return new Promise((resolve) => {
            const reader = new FileReader();
            
            reader.onload = () => {
                try {
                    const base64String = reader.result as string;
                    // Remove the data URL prefix to get pure base64
                    const base64Data = base64String.split(',')[1];
                    
                    resolve({
                        success: true,
                        data: {
                            mimeType: 'application/pdf',
                            base64: base64Data,
                            fileName: file.name,
                            fileSize: file.size
                        }
                    });
                } catch (error) {
                    resolve({
                        success: false,
                        error: `Fejl ved konvertering af PDF: ${error instanceof Error ? error.message : 'Ukendt fejl'}`
                    });
                }
            };
            
            reader.onerror = () => {
                resolve({
                    success: false,
                    error: 'Kunne ikke læse PDF-filen'
                });
            };
            
            reader.readAsDataURL(file);
        });
    } catch (error) {
        return {
            success: false,
            error: `Uventet fejl: ${error instanceof Error ? error.message : 'Ukendt fejl'}`
        };
    }
}

/**
 * Check if a file is a PDF
 * @param file - The file to check
 * @returns boolean indicating if the file is a PDF
 */
export function isPdfFile(file: File): boolean {
    return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

/**
 * Format file size for display
 * @param bytes - File size in bytes
 * @returns Formatted file size string
 */
export function formatFileSize(bytes: number): string {
    if (bytes < 1024) {
        return `${bytes} B`;
    } else if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    } else {
        return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    }
}