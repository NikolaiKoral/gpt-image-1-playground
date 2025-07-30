export interface TemplateVariable {
    name: string;
    label: string;
    placeholder: string;
    type: 'text' | 'select';
    options?: string[];
    defaultValue?: string;
}

export interface PromptTemplate {
    id: string;
    name: string;
    description: string;
    category: string;
    template: string;
    variables: TemplateVariable[];
    previewImage?: string;
    tags: string[];
}

export interface TemplateCategory {
    id: string;
    name: string;
    description: string;
    icon: string;
}

export interface MoodboardPreset {
    id: string;
    name: string;
    description: string;
    thumbnail: string;
    parameters: {
        quality?: 'low' | 'medium' | 'high' | 'auto';
        background?: 'transparent' | 'opaque' | 'auto';
        moderation?: 'low' | 'auto';
        output_format?: 'png' | 'jpeg' | 'webp';
    };
    promptModifiers: {
        prefix?: string;
        suffix?: string;
        styleKeywords: string[];
    };
    tags: string[];
}

export interface ProcessedTemplate {
    template: PromptTemplate;
    variables: Record<string, string>;
    processedPrompt: string;
}
