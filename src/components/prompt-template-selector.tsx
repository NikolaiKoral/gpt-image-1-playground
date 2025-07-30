'use client';

import { PromptTagSelector } from '@/components/prompt-tag-selector';
import { StyleAnalyzer } from '@/components/style-analyzer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { usePromptRefinement } from '@/hooks/usePromptRefinement';
import { formatTagsForPrompt } from '@/lib/prompt-tags';
import {
    TEMPLATE_CATEGORIES,
    PROMPT_TEMPLATES,
    processTemplate,
    getTemplatesByCategory,
    searchTemplates
} from '@/lib/prompt-templates';
import { cn } from '@/lib/utils';
// Debug: Log templates on import - commented out
// console.log('Total templates loaded:', PROMPT_TEMPLATES.length);
// console.log('Mood templates:', PROMPT_TEMPLATES.filter(t => t.category === 'mood').map(t => t.id));
import type { PromptTemplate } from '@/types/templates';
import {
    Search,
    Sparkles,
    Package,
    Home,
    Palette,
    Camera,
    Wand2,
    RefreshCw,
    Copy,
    Check,
    ArrowRight,
    Loader2,
    Image as ImageIcon
} from 'lucide-react';
import * as React from 'react';

interface PromptTemplateSelectorProps {
    value: string;
    onChange: (value: string) => void;
    className?: string;
    imageFiles?: File[];
}

const CATEGORY_ICONS = {
    Package,
    Home,
    Palette,
    Camera,
    Sparkles
};

export function PromptTemplateSelector({ value, onChange, className, imageFiles }: PromptTemplateSelectorProps) {
    const [selectedTemplate, setSelectedTemplate] = React.useState<PromptTemplate | null>(null);
    const [templateVariables, setTemplateVariables] = React.useState<Record<string, string>>({});
    const [searchQuery, setSearchQuery] = React.useState('');
    const [activeTab, setActiveTab] = React.useState('browse');
    const [copiedTemplate, setCopiedTemplate] = React.useState<string | null>(null);
    const [selectedTags, setSelectedTags] = React.useState<string[]>([]);
    const [customPromptText, setCustomPromptText] = React.useState('');
    const [transferredTemplate, setTransferredTemplate] = React.useState<string | null>(null);

    // Prompt refinement hook
    const { refinePrompt, isRefining, error: refinementError } = usePromptRefinement();

    // Initialize template variables when template changes
    React.useEffect(() => {
        if (selectedTemplate) {
            const initialVariables: Record<string, string> = {};
            selectedTemplate.variables.forEach((variable) => {
                initialVariables[variable.name] = variable.defaultValue || '';
            });
            setTemplateVariables(initialVariables);
        }
    }, [selectedTemplate]);

    // Process template and update parent component
    React.useEffect(() => {
        if (activeTab === 'browse' && selectedTemplate && Object.keys(templateVariables).length > 0) {
            const processedPrompt = processTemplate(selectedTemplate, templateVariables);
            onChange(processedPrompt);
        } else if (activeTab === 'custom') {
            const tagsText = selectedTags.length > 0 ? formatTagsForPrompt(selectedTags) : '';
            const combinedPrompt =
                customPromptText && tagsText ? `${customPromptText}, ${tagsText}` : customPromptText || tagsText;
            onChange(combinedPrompt);
        }
    }, [selectedTemplate, templateVariables, activeTab, customPromptText, selectedTags, onChange]);

    // Initialize custom prompt text from value when switching to custom tab
    React.useEffect(() => {
        if (activeTab === 'custom' && !customPromptText && value && !selectedTemplate) {
            setCustomPromptText(value);
        }
    }, [activeTab, value, customPromptText, selectedTemplate]);

    // Clear template selection when switching to browse tab if custom prompt has content
    React.useEffect(() => {
        if (activeTab === 'browse' && customPromptText) {
            // If user switches back to browse while having custom content,
            // don't interfere with their template selection
        }
    }, [activeTab, customPromptText]);

    const handleTemplateSelect = (template: PromptTemplate) => {
        setSelectedTemplate(template);
    };

    const handleVariableChange = (variableName: string, variableValue: string) => {
        setTemplateVariables((prev) => ({
            ...prev,
            [variableName]: variableValue
        }));
    };

    const handleClearTemplate = () => {
        setSelectedTemplate(null);
        setTemplateVariables({});
        onChange('');
    };

    const handleCustomPromptChange = (newText: string) => {
        setCustomPromptText(newText);
    };

    const handleTagsChange = (newTags: string[]) => {
        setSelectedTags(newTags);
    };

    const handleClearCustom = () => {
        setCustomPromptText('');
        setSelectedTags([]);
        onChange('');
    };

    const handleUseAsCustomPrompt = () => {
        if (selectedTemplate) {
            const processedPrompt = processTemplate(selectedTemplate, templateVariables);
            setCustomPromptText(processedPrompt);
            setActiveTab('custom');
            // Show feedback
            setTransferredTemplate(selectedTemplate.name);
            setTimeout(() => setTransferredTemplate(null), 3000);
            // Clear selected template since we're moving to custom
            setSelectedTemplate(null);
            setTemplateVariables({});
        }
    };

    const handleCopyToCustom = (template: PromptTemplate, e: React.MouseEvent) => {
        e.stopPropagation();
        // Create default variables for template
        const defaultVariables: Record<string, string> = {};
        template.variables.forEach((variable) => {
            defaultVariables[variable.name] = variable.defaultValue || variable.placeholder || '';
        });

        const processedPrompt = processTemplate(template, defaultVariables);
        setCustomPromptText(processedPrompt);
        setActiveTab('custom');

        // Show feedback
        setTransferredTemplate(template.name);
        setTimeout(() => setTransferredTemplate(null), 3000);

        // Clear any selected template
        setSelectedTemplate(null);
        setTemplateVariables({});
    };

    const handleCopyTemplate = async (templateText: string, templateId: string) => {
        try {
            await navigator.clipboard.writeText(templateText);
            setCopiedTemplate(templateId);
            setTimeout(() => setCopiedTemplate(null), 2000);
        } catch (err) {
            console.error('Failed to copy template:', err);
        }
    };

    const handleRefinePrompt = async () => {
        if (!customPromptText.trim()) return;

        const refinedPrompt = await refinePrompt(customPromptText, imageFiles, selectedTags);
        if (refinedPrompt) {
            setCustomPromptText(refinedPrompt);
        }
    };

    const handleStylePromptApply = (stylePrompt: string) => {
        setCustomPromptText(stylePrompt);
        setActiveTab('custom');
        // Show feedback
        setTransferredTemplate('Stilanalyse');
        setTimeout(() => setTransferredTemplate(null), 3000);
    };

    const filteredTemplates = searchQuery ? searchTemplates(searchQuery) : PROMPT_TEMPLATES;

    const processedPrompt =
        activeTab === 'browse' && selectedTemplate
            ? processTemplate(selectedTemplate, templateVariables)
            : activeTab === 'custom'
              ? (() => {
                    const tagsText = selectedTags.length > 0 ? formatTagsForPrompt(selectedTags) : '';
                    return customPromptText && tagsText
                        ? `${customPromptText}, ${tagsText}`
                        : customPromptText || tagsText;
                })()
              : value;

    return (
        <div className={cn('space-y-4', className)}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className='w-full'>
                <TabsList className='grid w-full grid-cols-3'>
                    <TabsTrigger value='browse' className='flex items-center gap-2'>
                        <Sparkles className='h-4 w-4' />
                        <span className='hidden sm:inline'>Gennemse templates</span>
                        <span className='sm:hidden'>Templates</span>
                    </TabsTrigger>
                    <TabsTrigger value='custom' className='flex items-center gap-2'>
                        <Wand2 className='h-4 w-4' />
                        <span className='hidden sm:inline'>Brugerdefineret prompt</span>
                        <span className='sm:hidden'>Prompt</span>
                    </TabsTrigger>
                    <TabsTrigger value='style' className='flex items-center gap-2'>
                        <ImageIcon className='h-4 w-4' />
                        <span className='hidden sm:inline'>Stil inspiration</span>
                        <span className='sm:hidden'>Stil</span>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value='browse' className='space-y-4'>
                    {/* Search Bar */}
                    <div className='relative'>
                        <Search className='text-muted-foreground absolute top-3 left-3 h-4 w-4' />
                        <Input
                            placeholder='Search templates...'
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className='pl-10'
                        />
                    </div>

                    {/* Template Categories or Search Results */}
                    {!searchQuery ? (
                        <div className='space-y-4'>
                            {/* {console.log('All template categories:', TEMPLATE_CATEGORIES.map(c => c.id))} */}
                            {TEMPLATE_CATEGORIES.map((category) => {
                                const categoryTemplates = getTemplatesByCategory(category.id);
                                // console.log(`Category: ${category.id}, Templates found:`, categoryTemplates.length, categoryTemplates.map(t => t.id));
                                const IconComponent = CATEGORY_ICONS[category.icon as keyof typeof CATEGORY_ICONS];

                                // Only render categories that have templates
                                if (categoryTemplates.length === 0) {
                                    console.log(`Skipping category ${category.id} - no templates found`);
                                    return null;
                                }

                                return (
                                    <div key={category.id} className='space-y-2'>
                                        <div className='flex items-center gap-2'>
                                            <IconComponent className='text-primary h-5 w-5' />
                                            <div>
                                                <h3 className='text-lg font-semibold'>{category.name}</h3>
                                                <p className='text-muted-foreground text-sm'>{category.description}</p>
                                            </div>
                                        </div>

                                        <div className='grid gap-2 sm:grid-cols-2'>
                                            {categoryTemplates.map((template) => (
                                                <Card
                                                    key={template.id}
                                                    className={cn(
                                                        'cursor-pointer transition-all duration-200 hover:shadow-md',
                                                        selectedTemplate?.id === template.id && 'ring-primary ring-2'
                                                    )}
                                                    onClick={() => handleTemplateSelect(template)}>
                                                    <CardHeader className='pb-1'>
                                                        <div className='flex items-start justify-between'>
                                                            <CardTitle className='text-base'>{template.name}</CardTitle>
                                                            <div className='flex gap-1'>
                                                                <Button
                                                                    size='sm'
                                                                    variant='ghost'
                                                                    className='h-8 w-8 p-0'
                                                                    onClick={(e) => handleCopyToCustom(template, e)}
                                                                    title='Kopier til brugerdefineret prompt'>
                                                                    <ArrowRight className='h-4 w-4 text-green-600' />
                                                                </Button>
                                                                <Button
                                                                    size='sm'
                                                                    variant='ghost'
                                                                    className='h-8 w-8 p-0'
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleCopyTemplate(
                                                                            template.template,
                                                                            template.id
                                                                        );
                                                                    }}
                                                                    title='Copy template text'>
                                                                    {copiedTemplate === template.id ? (
                                                                        <Check className='h-4 w-4 text-green-600' />
                                                                    ) : (
                                                                        <Copy className='h-4 w-4' />
                                                                    )}
                                                                </Button>
                                                            </div>
                                                        </div>
                                                        <CardDescription className='text-xs'>
                                                            {template.description}
                                                        </CardDescription>
                                                    </CardHeader>
                                                    <CardContent className='px-4 pt-0 pb-3'>
                                                        <div className='flex flex-wrap gap-1'>
                                                            {template.tags.slice(0, 3).map((tag) => (
                                                                <span
                                                                    key={tag}
                                                                    className='bg-primary/10 text-primary inline-flex items-center rounded-full px-2 py-1 text-xs'>
                                                                    {tag}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className='space-y-2'>
                            <h3 className='text-lg font-semibold'>Search Results ({filteredTemplates.length})</h3>
                            <div className='grid gap-2 sm:grid-cols-2'>
                                {filteredTemplates.map((template) => (
                                    <Card
                                        key={template.id}
                                        className={cn(
                                            'cursor-pointer transition-all duration-200 hover:shadow-md',
                                            selectedTemplate?.id === template.id && 'ring-primary ring-2'
                                        )}
                                        onClick={() => handleTemplateSelect(template)}>
                                        <CardHeader className='pb-1'>
                                            <div className='flex items-start justify-between'>
                                                <CardTitle className='text-base'>{template.name}</CardTitle>
                                                <div className='flex gap-1'>
                                                    <Button
                                                        size='sm'
                                                        variant='ghost'
                                                        className='h-8 w-8 p-0'
                                                        onClick={(e) => handleCopyToCustom(template, e)}
                                                        title='Kopier til brugerdefineret prompt'>
                                                        <ArrowRight className='h-4 w-4 text-green-600' />
                                                    </Button>
                                                    <Button
                                                        size='sm'
                                                        variant='ghost'
                                                        className='h-8 w-8 p-0'
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleCopyTemplate(template.template, template.id);
                                                        }}
                                                        title='Copy template text'>
                                                        {copiedTemplate === template.id ? (
                                                            <Check className='h-4 w-4 text-green-600' />
                                                        ) : (
                                                            <Copy className='h-4 w-4' />
                                                        )}
                                                    </Button>
                                                </div>
                                            </div>
                                            <CardDescription className='text-xs'>
                                                {template.description}
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className='px-4 pt-0 pb-3'>
                                            <div className='flex flex-wrap gap-1'>
                                                {template.tags.slice(0, 3).map((tag) => (
                                                    <span
                                                        key={tag}
                                                        className='bg-primary/10 text-primary inline-flex items-center rounded-full px-2 py-1 text-xs'>
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Template Variables */}
                    {selectedTemplate && (
                        <Card>
                            <CardHeader>
                                <div className='flex items-center justify-between'>
                                    <CardTitle className='flex items-center gap-2 text-lg'>
                                        <Wand2 className='h-5 w-5' />
                                        Customize Template
                                    </CardTitle>
                                    <div className='flex gap-2'>
                                        <Button
                                            size='sm'
                                            variant='default'
                                            onClick={handleUseAsCustomPrompt}
                                            className='bg-green-600 hover:bg-green-700'>
                                            <Wand2 className='mr-2 h-4 w-4' />
                                            Brug som brugerdefineret prompt
                                        </Button>
                                        <Button size='sm' variant='outline' onClick={handleClearTemplate}>
                                            <RefreshCw className='mr-2 h-4 w-4' />
                                            Clear
                                        </Button>
                                    </div>
                                </div>
                                <CardDescription>
                                    Fill in the variables to customize your prompt, then use as custom prompt to enhance
                                    with tags
                                </CardDescription>
                            </CardHeader>
                            <CardContent className='space-y-4'>
                                {selectedTemplate.variables.map((variable) => (
                                    <div key={variable.name} className='space-y-2'>
                                        <Label htmlFor={variable.name}>{variable.label}</Label>
                                        {variable.type === 'select' ? (
                                            <Select
                                                value={templateVariables[variable.name] || ''}
                                                onValueChange={(value) => handleVariableChange(variable.name, value)}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder={variable.placeholder} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {variable.options?.map((option) => (
                                                        <SelectItem key={option} value={option}>
                                                            {option}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        ) : (
                                            <Input
                                                id={variable.name}
                                                placeholder={variable.placeholder}
                                                value={templateVariables[variable.name] || ''}
                                                onChange={(e) => handleVariableChange(variable.name, e.target.value)}
                                            />
                                        )}
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                <TabsContent value='custom' className='space-y-4'>
                    {/* Transfer Feedback */}
                    {transferredTemplate && (
                        <div className='flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200'>
                            <Check className='h-4 w-4' />
                            <span className='text-sm'>
                                Template &quot;{transferredTemplate}&quot; transferred to custom prompt
                            </span>
                        </div>
                    )}

                    <Card>
                        <CardHeader>
                            <div className='flex items-center justify-between'>
                                <div>
                                    <CardTitle className='flex items-center gap-2'>
                                        <Wand2 className='h-5 w-5' />
                                        Brugerdefineret prompt
                                    </CardTitle>
                                    <CardDescription>Skriv dit eget prompt eller rediger en template</CardDescription>
                                </div>
                                {(customPromptText || selectedTags.length > 0) && (
                                    <Button size='sm' variant='outline' onClick={handleClearCustom}>
                                        <RefreshCw className='mr-2 h-4 w-4' />
                                        Clear All
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className='space-y-4'>
                            <div className='space-y-2'>
                                <Label htmlFor='custom-prompt'>Dit prompt</Label>
                                <div className='relative'>
                                    <Textarea
                                        id='custom-prompt'
                                        placeholder='Indtast dit brugerdefinerede prompt her...'
                                        value={customPromptText}
                                        onChange={(e) => handleCustomPromptChange(e.target.value)}
                                        rows={3}
                                        className='resize-none pr-12'
                                    />
                                    <Button
                                        type='button'
                                        size='sm'
                                        variant='ghost'
                                        className='absolute top-2 right-2 h-8 w-8 p-0 hover:bg-blue-50 dark:hover:bg-blue-950'
                                        onClick={handleRefinePrompt}
                                        disabled={isRefining || !customPromptText.trim()}
                                        title={
                                            imageFiles && imageFiles.length > 0
                                                ? selectedTags.length > 0
                                                    ? `Analyser billede og forbedr prompt med AI (inkl. ${selectedTags.length} valgte tags)`
                                                    : 'Analyser billede og forbedr prompt med AI'
                                                : selectedTags.length > 0
                                                ? `Forbedr prompt med AI (inkl. ${selectedTags.length} valgte tags)`
                                                : 'Forbedr prompt med AI'
                                        }>
                                        {isRefining ? (
                                            <Loader2 className='h-4 w-4 animate-spin text-blue-600' />
                                        ) : (
                                            <div className='relative'>
                                                <Sparkles className='h-4 w-4 text-blue-600' />
                                                {selectedTags.length > 0 && (
                                                    <span className='absolute -top-1 -right-1 flex h-2 w-2'>
                                                        <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75'></span>
                                                        <span className='relative inline-flex rounded-full h-2 w-2 bg-blue-500'></span>
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </Button>
                                </div>
                                {refinementError && (
                                    <p className='text-sm text-red-600 dark:text-red-400'>{refinementError}</p>
                                )}
                            </div>

                            <div className='space-y-2'>
                                <PromptTagSelector
                                    selectedTags={selectedTags}
                                    onTagsChange={handleTagsChange}
                                    maxTags={15}
                                    showConflicts={true}
                                />
                                {selectedTags.length > 0 && (
                                    <p className='text-xs text-muted-foreground flex items-center gap-1'>
                                        <Sparkles className='h-3 w-3' />
                                        Valgte tags vil blive inkluderet når du bruger AI-forbedring
                                    </p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value='style' className='space-y-4'>
                    <StyleAnalyzer onApplyPrompt={handleStylePromptApply} />
                </TabsContent>
            </Tabs>

            {/* Preview */}
            {processedPrompt && (
                <Card>
                    <CardHeader>
                        <CardTitle className='flex items-center gap-2 text-base'>
                            <Sparkles className='h-4 w-4' />
                            Prompt Preview
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className='relative'>
                            <div className='bg-muted rounded-md p-3 text-sm'>{processedPrompt}</div>
                            <Button
                                size='sm'
                                variant='outline'
                                className='absolute top-2 right-2'
                                onClick={() => handleCopyTemplate(processedPrompt, 'preview')}>
                                {copiedTemplate === 'preview' ? (
                                    <Check className='h-4 w-4 text-green-600' />
                                ) : (
                                    <Copy className='h-4 w-4' />
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
