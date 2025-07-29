# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Development server (runs on port 3004)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint

# Format code with Prettier
npm run format
```

## Architecture Overview

This is a **Next.js 15** application that provides a web interface for OpenAI's `gpt-image-1` model, enhanced with **Gemini 2.5 Pro AI prompt refinement**. The app operates primarily in **edit mode** (generation mode is disabled) and includes a **Danish-translated interface**.

### Core System Architecture

The application follows a **dual-storage architecture** that adapts based on deployment environment:

- **Filesystem mode** (`fs`): Images saved to `./generated-images` directory (local development)
- **IndexedDB mode** (`indexeddb`): Images stored in browser's IndexedDB with Dexie.js (Vercel/serverless)
- **Auto-detection**: Automatically switches to IndexedDB mode when deployed on Vercel

### Key Data Flow

1. **Image Upload** → `MultiImageDropZone` → `EditingForm` → API
2. **AI Processing** → OpenAI `gpt-image-1` → Response handling → Storage (fs/IndexedDB)
3. **Prompt Enhancement** → User clicks sparkle button → Gemini 2.5 Pro analysis → Enhanced prompt
4. **History Management** → localStorage metadata + image storage → `HistoryPanel`

### Component Architecture

**Main Container**: `src/app/page.tsx` - Single-page app managing all state and data flow

**Core Forms**:
- `EditingForm` - Image editing interface (only active mode)
- `GenerationForm` - Commented out, available for future reactivation

**Key Components**:
- `PromptTemplateSelector` - Template system with AI refinement sparkle button
- `ImageOutput` - Grid/single view for generated images with download/edit actions
- `HistoryPanel` - Persistent history with cost tracking and deletion
- `MultiImageDropZone` - Drag-and-drop with paste support (max 10 images)

### AI Integration Architecture

**Dual AI System**:
1. **OpenAI GPT-Image-1**: Primary image generation/editing
2. **Gemini 2.5 Pro**: Multimodal prompt analysis and enhancement

**Prompt Enhancement Flow**:
```
User prompt + uploaded images + selected tags
    ↓
Gemini 2.5 Pro vision analysis (/api/refine-prompt)
    ↓  
Enhanced technical photography prompt
    ↓
Applied to image generation
```

### Template System Architecture

**Modular Template Structure** (25 total templates organized in 5 files):
- `src/lib/templates/still-life.ts` - 5 templates
- `src/lib/templates/lifestyle.ts` - 5 templates  
- `src/lib/templates/technical.ts` - 5 templates
- `src/lib/templates/action.ts` - 5 templates
- `src/lib/templates/specialized.ts` - 5 templates

Combined via barrel exports in `src/lib/prompt-templates.ts`. All templates are categorized under single "Produkt miljøbilleder" category in Danish.

### Database Architecture

**Hybrid Storage System**:
- **Metadata**: localStorage (`openaiImageHistory`)
- **Images**: Filesystem OR IndexedDB based on `NEXT_PUBLIC_IMAGE_STORAGE_MODE`
- **Dexie.js**: IndexedDB ORM at `src/lib/db.ts`

### State Management Patterns

The app uses **React state** with complex interdependencies managed in the main page component:

**Critical State Flow**:
- Image files and preview URLs are managed separately but must stay synchronized
- Blob URL cleanup is essential to prevent memory leaks
- Storage mode detection affects all image handling paths
- Password authentication is cached client-side as SHA-256 hash

### API Route Architecture

**Core Routes**:
- `/api/images` - Main image generation/editing endpoint
- `/api/refine-prompt` - Gemini 2.5 Pro prompt enhancement 
- `/api/image/[filename]` - Individual image serving
- `/api/image-delete` - Batch image deletion
- `/api/auth-status` - Password requirement checking

**Authentication**: Optional SHA-256 password protection via `APP_PASSWORD` environment variable.

## Environment Configuration

### Required Variables
```bash
OPENAI_API_KEY=your_openai_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
```

### Optional Variables
```bash
# Storage mode (auto-detects Vercel if not set)
NEXT_PUBLIC_IMAGE_STORAGE_MODE=fs|indexeddb

# Custom API endpoint
OPENAI_API_BASE_URL=your_custom_endpoint

# Password protection
APP_PASSWORD=your_password_here
```

## Critical Development Notes

**Danish Localization**: The interface is translated to Danish. When making UI changes, maintain Danish text throughout components. The AI prompt enhancement also responds in Danish.

**Image Memory Management**: Always revoke blob URLs when components unmount or state changes to prevent memory leaks. The app has extensive blob URL cleanup patterns.

**Storage Mode Awareness**: Code paths differ significantly between `fs` and `indexeddb` modes. Always check `effectiveStorageModeClient` before implementing image-related features.

**Template System**: When adding new templates, add them to appropriate template file in `src/lib/templates/` and ensure they follow the established `PromptTemplate` interface with proper Danish descriptions.

**AI Integration**: The Gemini 2.5 Pro integration requires image encoding to base64. Use `prepareImageForGemini()` utility from `src/lib/image-utils.ts` for proper validation and encoding.

**Next.js App Router**: This uses the app router with server components. API routes are in `src/app/api/` and follow the new route.ts convention.

**Performance Considerations**: Large template files caused compilation issues, hence the modular approach. Keep individual template files under 100 lines when possible.

## Testing Image Generation

The app requires an **OpenAI organization verification** to access `gpt-image-1`. Test with:
1. Upload a product image
2. Select photography tags  
3. Write a basic prompt
4. Click sparkle button for AI enhancement
5. Generate image in edit mode

## Cost Tracking

The app includes comprehensive cost calculation via `src/lib/cost-utils.ts` with detailed token usage tracking and USD estimates displayed in the history panel.