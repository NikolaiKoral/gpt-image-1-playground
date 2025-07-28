'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
    TEMPLATE_CATEGORIES,
    PROMPT_TEMPLATES,
    processTemplate,
    getTemplatesByCategory,
    searchTemplates
} from '@/lib/prompt-templates';

// Debug: Log templates on import - commented out
// console.log('Total templates loaded:', PROMPT_TEMPLATES.length);
// console.log('Mood templates:', PROMPT_TEMPLATES.filter(t => t.category === 'mood').map(t => t.id));
import type { PromptTemplate } from '@/types/templates';
import { cn } from '@/lib/utils';
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
    Check
} from 'lucide-react';
import * as React from 'react';

interface PromptTemplateSelectorProps {
    value: string;
    onChange: (value: string) => void;
    className?: string;
}

const CATEGORY_ICONS = {
    Package,
    Home,
    Palette,
    Camera,
    Sparkles
};

export function PromptTemplateSelector({
    value,
    onChange,
    className
}: PromptTemplateSelectorProps) {
    const [selectedTemplate, setSelectedTemplate] = React.useState<PromptTemplate | null>(null);
    const [templateVariables, setTemplateVariables] = React.useState<Record<string, string>>({});
    const [searchQuery, setSearchQuery] = React.useState('');
    const [activeTab, setActiveTab] = React.useState('browse');
    const [copiedTemplate, setCopiedTemplate] = React.useState<string | null>(null);

    // Initialize template variables when template changes
    React.useEffect(() => {
        if (selectedTemplate) {
            const initialVariables: Record<string, string> = {};
            selectedTemplate.variables.forEach(variable => {
                initialVariables[variable.name] = variable.defaultValue || '';
            });
            setTemplateVariables(initialVariables);
        }
    }, [selectedTemplate]);

    // Process template and update parent component
    React.useEffect(() => {
        if (selectedTemplate && Object.keys(templateVariables).length > 0) {
            const processedPrompt = processTemplate(selectedTemplate, templateVariables);
            onChange(processedPrompt);
        }
    }, [selectedTemplate, templateVariables, onChange]);

    const handleTemplateSelect = (template: PromptTemplate) => {
        setSelectedTemplate(template);
    };

    const handleVariableChange = (variableName: string, variableValue: string) => {
        setTemplateVariables(prev => ({
            ...prev,
            [variableName]: variableValue
        }));
    };

    const handleClearTemplate = () => {
        setSelectedTemplate(null);
        setTemplateVariables({});
        onChange('');
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

    const filteredTemplates = searchQuery 
        ? searchTemplates(searchQuery)
        : PROMPT_TEMPLATES;

    const processedPrompt = selectedTemplate 
        ? processTemplate(selectedTemplate, templateVariables)
        : value;

    return (
        <div className={cn('space-y-4', className)}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="browse" className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        Browse Templates
                    </TabsTrigger>
                    <TabsTrigger value="custom" className="flex items-center gap-2">
                        <Wand2 className="h-4 w-4" />
                        Custom Prompt
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="browse" className="space-y-4">
                    {/* Search Bar */}
                    <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search templates..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>

                    {/* Template Categories or Search Results */}
                    {!searchQuery ? (
                        <div className="space-y-6">
                            {/* {console.log('All template categories:', TEMPLATE_CATEGORIES.map(c => c.id))} */}
                            {TEMPLATE_CATEGORIES.map(category => {
                                const categoryTemplates = getTemplatesByCategory(category.id);
                                // console.log(`Category: ${category.id}, Templates found:`, categoryTemplates.length, categoryTemplates.map(t => t.id));
                                const IconComponent = CATEGORY_ICONS[category.icon as keyof typeof CATEGORY_ICONS];
                                
                                // Only render categories that have templates
                                if (categoryTemplates.length === 0) {
                                    console.log(`Skipping category ${category.id} - no templates found`);
                                    return null;
                                }
                                
                                return (
                                    <div key={category.id} className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <IconComponent className="h-5 w-5 text-primary" />
                                            <div>
                                                <h3 className="text-lg font-semibold">{category.name}</h3>
                                                <p className="text-sm text-muted-foreground">{category.description}</p>
                                            </div>
                                        </div>
                                        
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            {categoryTemplates.map(template => (
                                                <Card
                                                    key={template.id}
                                                    className={cn(
                                                        'cursor-pointer transition-all duration-200 hover:shadow-md',
                                                        selectedTemplate?.id === template.id && 'ring-2 ring-primary'
                                                    )}
                                                    onClick={() => handleTemplateSelect(template)}
                                                >
                                                    <CardHeader className="pb-2">
                                                        <div className="flex items-start justify-between">
                                                            <CardTitle className="text-base">{template.name}</CardTitle>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-8 w-8 p-0"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleCopyTemplate(template.template, template.id);
                                                                }}
                                                            >
                                                                {copiedTemplate === template.id ? (
                                                                    <Check className="h-4 w-4 text-green-600" />
                                                                ) : (
                                                                    <Copy className="h-4 w-4" />
                                                                )}
                                                            </Button>
                                                        </div>
                                                        <CardDescription className="text-xs">
                                                            {template.description}
                                                        </CardDescription>
                                                    </CardHeader>
                                                    <CardContent className="pt-0">
                                                        <div className="flex flex-wrap gap-1">
                                                            {template.tags.slice(0, 3).map(tag => (
                                                                <span
                                                                    key={tag}
                                                                    className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary/10 text-primary"
                                                                >
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
                        <div className="space-y-3">
                            <h3 className="text-lg font-semibold">
                                Search Results ({filteredTemplates.length})
                            </h3>
                            <div className="grid gap-3 sm:grid-cols-2">
                                {filteredTemplates.map(template => (
                                    <Card
                                        key={template.id}
                                        className={cn(
                                            'cursor-pointer transition-all duration-200 hover:shadow-md',
                                            selectedTemplate?.id === template.id && 'ring-2 ring-primary'
                                        )}
                                        onClick={() => handleTemplateSelect(template)}
                                    >
                                        <CardHeader className="pb-2">
                                            <div className="flex items-start justify-between">
                                                <CardTitle className="text-base">{template.name}</CardTitle>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-8 w-8 p-0"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleCopyTemplate(template.template, template.id);
                                                    }}
                                                >
                                                    {copiedTemplate === template.id ? (
                                                        <Check className="h-4 w-4 text-green-600" />
                                                    ) : (
                                                        <Copy className="h-4 w-4" />
                                                    )}
                                                </Button>
                                            </div>
                                            <CardDescription className="text-xs">
                                                {template.description}
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="pt-0">
                                            <div className="flex flex-wrap gap-1">
                                                {template.tags.slice(0, 3).map(tag => (
                                                    <span
                                                        key={tag}
                                                        className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary/10 text-primary"
                                                    >
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
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Wand2 className="h-5 w-5" />
                                        Customize Template
                                    </CardTitle>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={handleClearTemplate}
                                    >
                                        <RefreshCw className="h-4 w-4 mr-2" />
                                        Clear
                                    </Button>
                                </div>
                                <CardDescription>
                                    Fill in the variables to customize your prompt
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {selectedTemplate.variables.map(variable => (
                                    <div key={variable.name} className="space-y-2">
                                        <Label htmlFor={variable.name}>
                                            {variable.label}
                                        </Label>
                                        {variable.type === 'select' ? (
                                            <Select
                                                value={templateVariables[variable.name] || ''}
                                                onValueChange={(value) => handleVariableChange(variable.name, value)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder={variable.placeholder} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {variable.options?.map(option => (
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

                <TabsContent value="custom" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Wand2 className="h-5 w-5" />
                                Custom Prompt
                            </CardTitle>
                            <CardDescription>
                                Write your own prompt or modify a template
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Textarea
                                placeholder="Enter your custom prompt here..."
                                value={value}
                                onChange={(e) => onChange(e.target.value)}
                                rows={4}
                                className="resize-none"
                            />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Preview */}
            {processedPrompt && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <Sparkles className="h-4 w-4" />
                            Prompt Preview
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="relative">
                            <div className="bg-muted p-3 rounded-md text-sm">
                                {processedPrompt}
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                className="absolute top-2 right-2"
                                onClick={() => handleCopyTemplate(processedPrompt, 'preview')}
                            >
                                {copiedTemplate === 'preview' ? (
                                    <Check className="h-4 w-4 text-green-600" />
                                ) : (
                                    <Copy className="h-4 w-4" />
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}