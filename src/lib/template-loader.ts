import { PromptTemplate } from '@/types/templates';

/**
 * Dynamic template loader to reduce initial bundle size
 */
class TemplateLoader {
    private static instance: TemplateLoader;
    private cache = new Map<string, PromptTemplate[]>();
    private loadingPromises = new Map<string, Promise<PromptTemplate[]>>();

    static getInstance(): TemplateLoader {
        if (!TemplateLoader.instance) {
            TemplateLoader.instance = new TemplateLoader();
        }
        return TemplateLoader.instance;
    }

    /**
     * Load templates dynamically by category
     */
    async loadTemplateGroup(group: string): Promise<PromptTemplate[]> {
        // Return cached if available
        if (this.cache.has(group)) {
            return this.cache.get(group)!;
        }

        // Return existing promise if loading
        if (this.loadingPromises.has(group)) {
            return this.loadingPromises.get(group)!;
        }

        // Start loading
        const loadPromise = this.loadTemplates(group);
        this.loadingPromises.set(group, loadPromise);

        try {
            const templates = await loadPromise;
            this.cache.set(group, templates);
            this.loadingPromises.delete(group);
            return templates;
        } catch (error) {
            this.loadingPromises.delete(group);
            throw error;
        }
    }

    private async loadTemplates(group: string): Promise<PromptTemplate[]> {
        switch (group) {
            case 'still-life':
                const { stillLifeTemplates } = await import('@/lib/templates/still-life');
                return stillLifeTemplates;

            case 'lifestyle':
                const { lifestyleTemplates } = await import('@/lib/templates/lifestyle');
                return lifestyleTemplates;

            case 'technical':
                const { technicalTemplates } = await import('@/lib/templates/technical');
                return technicalTemplates;

            case 'action':
                const { actionTemplates } = await import('@/lib/templates/action');
                return actionTemplates;

            case 'specialized':
                const { specializedTemplates } = await import('@/lib/templates/specialized');
                return specializedTemplates;

            default:
                throw new Error(`Unknown template group: ${group}`);
        }
    }

    /**
     * Preload all templates for better UX
     */
    async preloadAllTemplates(): Promise<void> {
        const groups = ['still-life', 'lifestyle', 'technical', 'action', 'specialized'];

        // Load all groups in parallel
        await Promise.allSettled(groups.map((group) => this.loadTemplateGroup(group)));
    }

    /**
     * Get all loaded templates
     */
    getAllLoadedTemplates(): PromptTemplate[] {
        const allTemplates: PromptTemplate[] = [];
        for (const templates of this.cache.values()) {
            allTemplates.push(...templates);
        }
        return allTemplates;
    }

    /**
     * Search across loaded templates
     */
    searchLoadedTemplates(query: string): PromptTemplate[] {
        const searchTerm = query.toLowerCase();
        const allTemplates = this.getAllLoadedTemplates();

        return allTemplates.filter(
            (template) =>
                template.name.toLowerCase().includes(searchTerm) ||
                template.description.toLowerCase().includes(searchTerm) ||
                template.tags.some((tag) => tag.toLowerCase().includes(searchTerm))
        );
    }

    /**
     * Clear cache to free memory
     */
    clearCache(): void {
        this.cache.clear();
        this.loadingPromises.clear();
    }
}

export const templateLoader = TemplateLoader.getInstance();

// Template metadata for quick access without loading
export const TEMPLATE_GROUPS = [
    { id: 'still-life', name: 'Still Life', count: 5 },
    { id: 'lifestyle', name: 'Lifestyle', count: 5 },
    { id: 'technical', name: 'Technical', count: 5 },
    { id: 'action', name: 'Action', count: 5 },
    { id: 'specialized', name: 'Specialized', count: 5 }
] as const;
