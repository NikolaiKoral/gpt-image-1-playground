export interface PromptTag {
    id: string;
    label: string;
    description?: string;
    category: string;
    conflicts?: string[]; // Tag IDs that conflict with this tag
    popular?: boolean; // Frequently used tags
}

export interface TagCategory {
    id: string;
    name: string;
    description: string;
    icon: string;
    tags: PromptTag[];
}

export const PROMPT_TAG_CATEGORIES: TagCategory[] = [
    {
        id: 'camera',
        name: 'Camera & Technical',
        description: 'Camera models, lenses, and technical settings',
        icon: 'Camera',
        tags: [
            // Camera Bodies
            {
                id: 'canon-r5',
                label: 'Canon EOS R5',
                description: 'Professional mirrorless camera',
                category: 'camera',
                popular: true
            },
            {
                id: 'sony-a7r4',
                label: 'Sony A7R IV',
                description: 'High-resolution mirrorless camera',
                category: 'camera',
                popular: true
            },
            { id: 'nikon-d850', label: 'Nikon D850', description: 'Professional DSLR camera', category: 'camera' },
            {
                id: 'fuji-xt4',
                label: 'Fujifilm X-T4',
                description: 'Mirrorless camera with film simulation',
                category: 'camera'
            },
            {
                id: 'hasselblad',
                label: 'Hasselblad medium format',
                description: 'Premium medium format camera',
                category: 'camera'
            },

            // Lenses
            {
                id: 'lens-85mm',
                label: '85mm f/1.8 lens',
                description: 'Portrait lens with shallow DOF',
                category: 'camera',
                popular: true
            },
            {
                id: 'lens-50mm',
                label: '50mm lens',
                description: 'Standard focal length',
                category: 'camera',
                popular: true
            },
            { id: 'lens-35mm', label: '35mm wide angle', description: 'Wide angle perspective', category: 'camera' },
            { id: 'lens-24-70', label: '24-70mm f/2.8', description: 'Professional zoom lens', category: 'camera' },
            { id: 'lens-macro', label: '100mm macro lens', description: 'Macro photography lens', category: 'camera' },

            // Technical Settings
            {
                id: 'iso-100',
                label: 'ISO 100',
                description: 'Low noise, high quality',
                category: 'camera',
                popular: true
            },
            { id: 'iso-400', label: 'ISO 400', description: 'Balanced exposure', category: 'camera' },
            {
                id: 'f1-8',
                label: 'f/1.8 aperture',
                description: 'Shallow depth of field',
                category: 'camera',
                popular: true
            },
            { id: 'f2-8', label: 'f/2.8 aperture', description: 'Professional aperture', category: 'camera' },
            { id: '8k-resolution', label: '8K resolution', description: 'Ultra-high resolution', category: 'camera' },
            {
                id: 'shallow-dof',
                label: 'shallow depth of field',
                description: 'Blurred background',
                category: 'camera',
                popular: true
            }
        ]
    },
    {
        id: 'lighting',
        name: 'Lighting',
        description: 'Natural and artificial lighting conditions',
        icon: 'Sun',
        tags: [
            // Natural Lighting
            {
                id: 'golden-hour',
                label: 'golden hour lighting',
                description: 'Warm, soft light during sunrise/sunset',
                category: 'lighting',
                popular: true
            },
            {
                id: 'natural-light',
                label: 'natural window lighting',
                description: 'Soft daylight from windows',
                category: 'lighting',
                popular: true
            },
            {
                id: 'morning-light',
                label: 'morning light',
                description: 'Fresh, bright morning illumination',
                category: 'lighting'
            },
            {
                id: 'sunset-light',
                label: 'sunset lighting',
                description: 'Warm, dramatic evening light',
                category: 'lighting'
            },
            {
                id: 'overcast',
                label: 'overcast lighting',
                description: 'Soft, even diffused light',
                category: 'lighting'
            },

            // Artificial Lighting
            {
                id: 'soft-light',
                label: 'soft lighting',
                description: 'Gentle, diffused illumination',
                category: 'lighting',
                popular: true
            },
            { id: 'hard-light', label: 'hard light', description: 'Sharp, directional lighting', category: 'lighting' },
            {
                id: 'dramatic-light',
                label: 'dramatic lighting',
                description: 'High contrast, moody lighting',
                category: 'lighting',
                popular: true
            },
            {
                id: 'studio-light',
                label: 'studio lighting',
                description: 'Controlled professional lighting',
                category: 'lighting'
            },
            {
                id: 'rim-light',
                label: 'rim lighting',
                description: 'Edge lighting for separation',
                category: 'lighting'
            },

            // Special Lighting
            {
                id: 'volumetric',
                label: 'volumetric lighting',
                description: 'Visible light beams and atmosphere',
                category: 'lighting'
            },
            {
                id: 'chiaroscuro',
                label: 'chiaroscuro',
                description: 'Strong light/dark contrast',
                category: 'lighting'
            },
            {
                id: 'backlighting',
                label: 'backlighting',
                description: 'Light from behind subject',
                category: 'lighting'
            },
            { id: 'side-light', label: 'side lighting', description: 'Light from the side', category: 'lighting' },
            { id: 'candlelight', label: 'candlelight', description: 'Warm, intimate lighting', category: 'lighting' }
        ]
    },
    {
        id: 'style',
        name: 'Photography Style',
        description: 'Photography genres and artistic styles',
        icon: 'Palette',
        tags: [
            // Photography Styles
            {
                id: 'commercial',
                label: 'commercial photography',
                description: 'Professional product/brand photography',
                category: 'style',
                popular: true
            },
            {
                id: 'portrait',
                label: 'portrait photography',
                description: 'Human subject photography',
                category: 'style',
                popular: true
            },
            {
                id: 'lifestyle',
                label: 'lifestyle photography',
                description: 'Real-life, candid photography',
                category: 'style',
                popular: true
            },
            {
                id: 'fashion',
                label: 'fashion photography',
                description: 'Style and clothing focused',
                category: 'style'
            },
            {
                id: 'editorial',
                label: 'editorial photography',
                description: 'Magazine-style photography',
                category: 'style'
            },
            { id: 'street', label: 'street photography', description: 'Urban, candid photography', category: 'style' },

            // Artistic Styles
            {
                id: 'cinematic',
                label: 'cinematic',
                description: 'Film-like visual quality',
                category: 'style',
                popular: true
            },
            {
                id: 'photojournalistic',
                label: 'photojournalistic',
                description: 'Documentary-style photography',
                category: 'style'
            },
            {
                id: 'fine-art',
                label: 'fine art photography',
                description: 'Artistic, creative photography',
                category: 'style'
            },
            {
                id: 'minimalist',
                label: 'minimalist photography',
                description: 'Clean, simple composition',
                category: 'style',
                popular: true
            },
            {
                id: 'vintage',
                label: 'vintage film aesthetic',
                description: 'Retro, film-inspired look',
                category: 'style'
            },
            { id: 'black-white', label: 'black and white', description: 'Monochrome photography', category: 'style' }
        ]
    },
    {
        id: 'composition',
        name: 'Composition & Framing',
        description: 'Camera angles, framing, and composition techniques',
        icon: 'Frame',
        tags: [
            // Framing
            { id: 'wide-shot', label: 'wide shot', description: 'Full scene perspective', category: 'composition' },
            {
                id: 'close-up',
                label: 'close-up',
                description: 'Detailed, intimate framing',
                category: 'composition',
                popular: true
            },
            {
                id: 'macro',
                label: 'macro photography',
                description: 'Extreme close-up details',
                category: 'composition'
            },
            {
                id: 'aerial-shot',
                label: 'aerial shot',
                description: "Bird's eye view perspective",
                category: 'composition'
            },
            {
                id: 'product-shot',
                label: 'product shot',
                description: 'Focused on product details',
                category: 'composition',
                popular: true
            },

            // Angles
            { id: 'low-angle', label: 'low angle shot', description: 'Camera below subject', category: 'composition' },
            {
                id: 'high-angle',
                label: 'high angle shot',
                description: 'Camera above subject',
                category: 'composition'
            },
            {
                id: 'eye-level',
                label: 'eye level',
                description: 'Natural perspective',
                category: 'composition',
                popular: true
            },
            { id: 'dutch-angle', label: 'dutch angle', description: 'Tilted camera angle', category: 'composition' },
            {
                id: 'pov',
                label: 'point-of-view shot',
                description: 'First-person perspective',
                category: 'composition'
            },

            // Composition Rules
            {
                id: 'rule-thirds',
                label: 'rule of thirds',
                description: 'Classic composition guideline',
                category: 'composition',
                popular: true
            },
            {
                id: 'centered',
                label: 'centered composition',
                description: 'Subject in center frame',
                category: 'composition'
            },
            {
                id: 'negative-space',
                label: 'negative space',
                description: 'Emphasizing empty areas',
                category: 'composition'
            }
        ]
    },
    {
        id: 'mood',
        name: 'Mood & Atmosphere',
        description: 'Emotional tone and atmosphere',
        icon: 'Heart',
        tags: [
            // Emotional Moods
            {
                id: 'professional',
                label: 'professional',
                description: 'Clean, business-like atmosphere',
                category: 'mood',
                popular: true
            },
            {
                id: 'elegant',
                label: 'elegant',
                description: 'Sophisticated and refined',
                category: 'mood',
                popular: true
            },
            { id: 'cozy', label: 'cozy', description: 'Warm and inviting', category: 'mood', popular: true },
            { id: 'modern', label: 'modern', description: 'Contemporary and sleek', category: 'mood', popular: true },
            { id: 'rustic', label: 'rustic', description: 'Natural, weathered aesthetic', category: 'mood' },
            { id: 'luxury', label: 'luxury', description: 'High-end, premium feel', category: 'mood' },

            // Visual Atmosphere
            {
                id: 'bright-airy',
                label: 'bright and airy',
                description: 'Light, spacious feeling',
                category: 'mood',
                popular: true
            },
            { id: 'moody', label: 'moody', description: 'Dark, atmospheric tone', category: 'mood', popular: true },
            { id: 'vibrant', label: 'vibrant', description: 'Rich, saturated colors', category: 'mood' },
            { id: 'muted', label: 'muted tones', description: 'Subtle, understated colors', category: 'mood' },
            { id: 'ethereal', label: 'ethereal', description: 'Dreamy, otherworldly quality', category: 'mood' },
            { id: 'dramatic', label: 'dramatic', description: 'High impact, striking', category: 'mood' }
        ]
    },
    {
        id: 'props',
        name: 'Props & Setting',
        description: 'Physical elements and environment',
        icon: 'Package',
        tags: [
            // Surfaces
            {
                id: 'marble-surface',
                label: 'marble surface',
                description: 'Elegant stone texture',
                category: 'props',
                popular: true
            },
            {
                id: 'wooden-table',
                label: 'wooden table',
                description: 'Natural wood texture',
                category: 'props',
                popular: true
            },
            { id: 'concrete-bg', label: 'concrete background', description: 'Industrial texture', category: 'props' },
            {
                id: 'white-bg',
                label: 'white background',
                description: 'Clean, neutral backdrop',
                category: 'props',
                popular: true
            },
            {
                id: 'textured-paper',
                label: 'textured paper',
                description: 'Artistic paper background',
                category: 'props'
            },

            // Props & Styling
            {
                id: 'minimal-props',
                label: 'minimal styling',
                description: 'Clean, uncluttered setup',
                category: 'props',
                popular: true
            },
            {
                id: 'scattered-props',
                label: 'scattered props',
                description: 'Casual arrangement of items',
                category: 'props'
            },
            {
                id: 'lifestyle-props',
                label: 'lifestyle props',
                description: 'Real-world context items',
                category: 'props',
                popular: true
            },
            {
                id: 'seasonal-props',
                label: 'seasonal elements',
                description: 'Season-appropriate decorations',
                category: 'props'
            },
            {
                id: 'geometric-shapes',
                label: 'geometric shapes',
                description: 'Abstract design elements',
                category: 'props'
            },

            // Environment
            {
                id: 'studio-setup',
                label: 'studio setup',
                description: 'Controlled photography environment',
                category: 'props',
                popular: true
            },
            { id: 'outdoor-setting', label: 'outdoor setting', description: 'Natural environment', category: 'props' },
            { id: 'urban-environment', label: 'urban environment', description: 'City backdrop', category: 'props' },
            {
                id: 'home-interior',
                label: 'home interior',
                description: 'Domestic setting',
                category: 'props',
                popular: true
            },
            { id: 'industrial-space', label: 'industrial space', description: 'Raw, urban interior', category: 'props' }
        ]
    }
];

// Helper functions
export function getTagsByCategory(categoryId: string): PromptTag[] {
    const category = PROMPT_TAG_CATEGORIES.find((cat) => cat.id === categoryId);
    return category?.tags || [];
}

export function getPopularTags(): PromptTag[] {
    return PROMPT_TAG_CATEGORIES.flatMap((category) => category.tags.filter((tag) => tag.popular));
}

export function findTagConflicts(selectedTags: string[]): string[] {
    const conflicts: string[] = [];
    const allTags = PROMPT_TAG_CATEGORIES.flatMap((cat) => cat.tags);

    selectedTags.forEach((tagId) => {
        const tag = allTags.find((t) => t.id === tagId);
        if (tag?.conflicts) {
            tag.conflicts.forEach((conflictId) => {
                if (selectedTags.includes(conflictId)) {
                    conflicts.push(`${tag.label} conflicts with ${allTags.find((t) => t.id === conflictId)?.label}`);
                }
            });
        }
    });

    return conflicts;
}

export function formatTagsForPrompt(selectedTags: string[]): string {
    const allTags = PROMPT_TAG_CATEGORIES.flatMap((cat) => cat.tags);
    const tagLabels = selectedTags.map((tagId) => allTags.find((tag) => tag.id === tagId)?.label).filter(Boolean);

    return tagLabels.join(', ');
}

export function searchTags(query: string): PromptTag[] {
    const allTags = PROMPT_TAG_CATEGORIES.flatMap((cat) => cat.tags);
    const searchTerm = query.toLowerCase();

    return allTags.filter(
        (tag) => tag.label.toLowerCase().includes(searchTerm) || tag.description?.toLowerCase().includes(searchTerm)
    );
}
