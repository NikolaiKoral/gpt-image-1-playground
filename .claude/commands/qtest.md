Run critical user flows to ensure core functionality.

ESSENTIAL TEST SUITE:

1. **Image Generation Flow**
   - Upload product image
   - Add prompt text
   - Select photography tags
   - Use AI enhancement (sparkle button)
   - Generate edited image
   - Download result
   - Verify history entry

2. **Konverter Tools Suite**
   - EAN Renamer:
     * Upload images with EAN codes
     * Enable AI mode
     * Preview renaming
     * Process and download
   - Image Converter:
     * Upload various formats
     * Convert to different formats
     * Batch processing
   - Image Compressor:
     * Analyze compression options
     * Apply compression
     * Compare file sizes

3. **Storage Mode Testing**
   - Switch between fs and IndexedDB
   - Verify image persistence
   - Test cleanup operations
   - Check mode auto-detection

4. **History Management**
   - Generate multiple images
   - Verify cost tracking
   - Test deletion
   - Check persistence

5. **AI Integration**
   - Gemini prompt enhancement
   - Style analysis
   - EAN extraction
   - Error handling

OUTPUT: Test summary with pass/fail for each flow, performance metrics, and any errors encountered.