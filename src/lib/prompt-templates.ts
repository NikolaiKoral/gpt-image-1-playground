import { actionTemplates } from './templates/action';
import { lifestyleTemplates } from './templates/lifestyle';
import { specializedTemplates } from './templates/specialized';
import { stillLifeTemplates } from './templates/still-life';
import { technicalTemplates } from './templates/technical';
import { PromptTemplate, TemplateCategory, MoodboardPreset } from '@/types/templates';

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
    {
        id: 'mood',
        name: 'Produkt miljøbilleder',
        description: 'Professionelle miljøbilleder til produktfotografering',
        icon: 'Sparkles'
    }
];

// Combine all template chunks into the main template array (25 total)
export const PROMPT_TEMPLATES: PromptTemplate[] = [
    ...stillLifeTemplates, // 5 templates
    ...lifestyleTemplates, // 5 templates
    ...technicalTemplates, // 5 templates
    ...actionTemplates, // 5 templates
    ...specializedTemplates // 5 templates
];

export const MOODBOARD_PRESETS: MoodboardPreset[] = [
    {
        id: 'scandinavian',
        name: 'Scandinavian',
        description: 'Clean lines, natural light, minimalist aesthetic',
        thumbnail: '/preset-thumbnails/scandinavian.jpg',
        parameters: {
            quality: 'high',
            background: 'auto',
            output_format: 'png'
        },
        promptModifiers: {
            prefix: 'Scandinavian design aesthetic,',
            suffix: ', light wood tones, natural lighting, minimal composition, Nordic style',
            styleKeywords: ['scandinavian', 'minimal', 'natural light', 'light wood', 'clean lines', 'nordic', 'hygge']
        },
        tags: ['minimal', 'natural', 'light', 'clean']
    },
    {
        id: 'urban-industrial',
        name: 'Urban Industrial',
        description: 'Raw materials, dramatic lighting, city atmosphere',
        thumbnail: '/preset-thumbnails/urban.jpg',
        parameters: {
            quality: 'high',
            background: 'auto',
            output_format: 'jpeg'
        },
        promptModifiers: {
            prefix: 'Urban industrial setting,',
            suffix: ', concrete textures, metal accents, dramatic shadows, raw materials, loft atmosphere',
            styleKeywords: ['industrial', 'urban', 'concrete', 'metal', 'dramatic lighting', 'raw', 'loft']
        },
        tags: ['industrial', 'urban', 'dramatic', 'raw']
    },
    {
        id: 'minimalist',
        name: 'Minimalist',
        description: 'Pure simplicity, negative space, essential elements only',
        thumbnail: '/preset-thumbnails/minimalist.jpg',
        parameters: {
            quality: 'high',
            background: 'transparent',
            output_format: 'png'
        },
        promptModifiers: {
            prefix: 'Minimalist composition,',
            suffix: ', negative space, pure simplicity, essential elements only, clean background',
            styleKeywords: ['minimalist', 'simple', 'negative space', 'clean', 'pure', 'essential', 'uncluttered']
        },
        tags: ['minimal', 'simple', 'clean', 'space']
    },
    {
        id: 'surreal-artistic',
        name: 'Surreal',
        description: 'Dreamlike compositions, unusual perspectives, creative interpretations',
        thumbnail: '/preset-thumbnails/surreal.jpg',
        parameters: {
            quality: 'high',
            background: 'auto',
            output_format: 'png'
        },
        promptModifiers: {
            prefix: 'Surreal artistic composition,',
            suffix: ', dreamlike atmosphere, unusual perspective, creative interpretation, artistic vision',
            styleKeywords: ['surreal', 'dreamlike', 'artistic', 'unusual', 'creative', 'imaginative', 'abstract']
        },
        tags: ['surreal', 'artistic', 'creative', 'dreamlike']
    },
    {
        id: 'luxe-elegant',
        name: 'Luxe Elegant',
        description: 'Sophisticated styling, premium materials, refined aesthetics',
        thumbnail: '/preset-thumbnails/luxe.jpg',
        parameters: {
            quality: 'high',
            background: 'auto',
            output_format: 'jpeg'
        },
        promptModifiers: {
            prefix: 'Luxury elegant styling,',
            suffix: ', premium materials, sophisticated composition, refined aesthetics, high-end presentation',
            styleKeywords: ['luxury', 'elegant', 'sophisticated', 'premium', 'refined', 'high-end', 'exclusive']
        },
        tags: ['luxury', 'elegant', 'sophisticated', 'premium']
    },
    {
        id: 'natural-organic',
        name: 'Natural Organic',
        description: 'Earth tones, natural textures, organic compositions',
        thumbnail: '/preset-thumbnails/natural.jpg',
        parameters: {
            quality: 'high',
            background: 'auto',
            output_format: 'jpeg'
        },
        promptModifiers: {
            prefix: 'Natural organic styling,',
            suffix: ', earth tones, natural textures, organic composition, botanical elements',
            styleKeywords: [
                'natural',
                'organic',
                'earth tones',
                'botanical',
                'sustainable',
                'eco-friendly',
                'raw materials'
            ]
        },
        tags: ['natural', 'organic', 'earth', 'botanical']
    }
];

export function processTemplate(template: PromptTemplate, variables: Record<string, string>): string {
    let processedPrompt = template.template;

    // Replace variables in the template
    template.variables.forEach((variable) => {
        const value = variables[variable.name] || variable.defaultValue || '';
        const placeholder = `{${variable.name}}`;
        processedPrompt = processedPrompt.replace(new RegExp(placeholder, 'g'), value);
    });

    return processedPrompt;
}

export function getTemplatesByCategory(categoryId: string): PromptTemplate[] {
    return PROMPT_TEMPLATES.filter((template) => template.category === categoryId);
}

export function searchTemplates(query: string): PromptTemplate[] {
    const searchTerm = query.toLowerCase();
    return PROMPT_TEMPLATES.filter(
        (template) =>
            template.name.toLowerCase().includes(searchTerm) ||
            template.description.toLowerCase().includes(searchTerm) ||
            template.tags.some((tag) => tag.toLowerCase().includes(searchTerm))
    );
}

export function getPresetsByTags(tags: string[]): MoodboardPreset[] {
    return MOODBOARD_PRESETS.filter((preset) => preset.tags.some((tag) => tags.includes(tag)));
}
