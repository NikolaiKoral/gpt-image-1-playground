'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MOODBOARD_PRESETS } from '@/lib/prompt-templates';
import { cn } from '@/lib/utils';
import type { MoodboardPreset } from '@/types/templates';
import { Palette, Building2, Minus, Sparkles, Crown, Leaf, Check, Wand2 } from 'lucide-react';
import * as React from 'react';

interface MoodboardPresetsProps {
    selectedPresets: string[];
    onPresetsChange: (presets: string[]) => void;
    onApplyPresets: (presets: MoodboardPreset[]) => void;
    className?: string;
}

const PRESET_ICONS = {
    scandinavian: Minus,
    'urban-industrial': Building2,
    minimalist: Minus,
    'surreal-artistic': Sparkles,
    'luxe-elegant': Crown,
    'natural-organic': Leaf
};

const PRESET_CATEGORIES = [
    {
        id: 'minimal',
        name: 'Minimal & Clean',
        description: 'Clean, uncluttered aesthetics',
        presets: ['scandinavian', 'minimalist']
    },
    {
        id: 'dramatic',
        name: 'Bold & Dramatic',
        description: 'Strong visual impact',
        presets: ['urban-industrial', 'surreal-artistic']
    },
    {
        id: 'premium',
        name: 'Premium & Natural',
        description: 'Sophisticated and organic',
        presets: ['luxe-elegant', 'natural-organic']
    }
];

export function MoodboardPresets({
    selectedPresets,
    onPresetsChange,
    onApplyPresets,
    className
}: MoodboardPresetsProps) {
    const [activeTab, setActiveTab] = React.useState('browse');

    const handlePresetToggle = (presetId: string) => {
        const isSelected = selectedPresets.includes(presetId);
        let newSelection: string[];

        if (isSelected) {
            newSelection = selectedPresets.filter((id) => id !== presetId);
        } else {
            // Limit to 3 presets for comparison
            if (selectedPresets.length >= 3) {
                newSelection = [...selectedPresets.slice(1), presetId];
            } else {
                newSelection = [...selectedPresets, presetId];
            }
        }

        onPresetsChange(newSelection);
    };

    const handleApplySelected = () => {
        const presetsToApply = MOODBOARD_PRESETS.filter((preset) => selectedPresets.includes(preset.id));
        onApplyPresets(presetsToApply);
    };

    const handleQuickApply = (presetId: string) => {
        const preset = MOODBOARD_PRESETS.find((p) => p.id === presetId);
        if (preset) {
            onApplyPresets([preset]);
        }
    };

    return (
        <div className={cn('space-y-4', className)}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className='w-full'>
                <TabsList className='grid w-full grid-cols-2'>
                    <TabsTrigger value='browse' className='flex items-center gap-2'>
                        <Palette className='h-4 w-4' />
                        Browse Presets
                    </TabsTrigger>
                    <TabsTrigger value='compare' className='flex items-center gap-2'>
                        <Wand2 className='h-4 w-4' />
                        Compare ({selectedPresets.length})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value='browse' className='space-y-6'>
                    {PRESET_CATEGORIES.map((category) => {
                        const categoryPresets = MOODBOARD_PRESETS.filter((preset) =>
                            category.presets.includes(preset.id)
                        );

                        return (
                            <div key={category.id} className='space-y-3'>
                                <div>
                                    <h3 className='text-lg font-semibold'>{category.name}</h3>
                                    <p className='text-muted-foreground text-sm'>{category.description}</p>
                                </div>

                                <div className='grid gap-4 sm:grid-cols-2'>
                                    {categoryPresets.map((preset) => {
                                        const IconComponent =
                                            PRESET_ICONS[preset.id as keyof typeof PRESET_ICONS] || Palette;
                                        const isSelected = selectedPresets.includes(preset.id);

                                        return (
                                            <Card
                                                key={preset.id}
                                                className={cn(
                                                    'relative cursor-pointer transition-all duration-200 hover:shadow-lg',
                                                    isSelected && 'ring-primary bg-primary/5 ring-2'
                                                )}>
                                                <CardHeader className='pb-3'>
                                                    <div className='flex items-start justify-between'>
                                                        <div className='flex items-start gap-3'>
                                                            <div
                                                                className={cn(
                                                                    'rounded-lg p-2',
                                                                    isSelected
                                                                        ? 'bg-primary text-primary-foreground'
                                                                        : 'bg-muted'
                                                                )}>
                                                                <IconComponent className='h-4 w-4' />
                                                            </div>
                                                            <div>
                                                                <CardTitle className='text-base'>
                                                                    {preset.name}
                                                                </CardTitle>
                                                                <CardDescription className='text-xs'>
                                                                    {preset.description}
                                                                </CardDescription>
                                                            </div>
                                                        </div>
                                                        {isSelected && (
                                                            <div className='bg-primary text-primary-foreground rounded-full p-1'>
                                                                <Check className='h-3 w-3' />
                                                            </div>
                                                        )}
                                                    </div>
                                                </CardHeader>

                                                <CardContent className='pt-0'>
                                                    {/* Preview Thumbnail Placeholder */}
                                                    <div className='from-muted to-muted/50 mb-3 flex aspect-video items-center justify-center rounded-lg bg-gradient-to-br'>
                                                        <IconComponent className='text-muted-foreground/50 h-8 w-8' />
                                                    </div>

                                                    {/* Style Keywords */}
                                                    <div className='mb-3 flex flex-wrap gap-1'>
                                                        {preset.promptModifiers.styleKeywords
                                                            .slice(0, 3)
                                                            .map((keyword) => (
                                                                <span
                                                                    key={keyword}
                                                                    className='bg-secondary text-secondary-foreground inline-flex items-center rounded-full px-2 py-1 text-xs'>
                                                                    {keyword}
                                                                </span>
                                                            ))}
                                                    </div>

                                                    {/* Action Buttons */}
                                                    <div className='flex gap-2'>
                                                        <Button
                                                            size='sm'
                                                            variant={isSelected ? 'default' : 'outline'}
                                                            onClick={() => handlePresetToggle(preset.id)}
                                                            className='flex-1'>
                                                            {isSelected ? 'Selected' : 'Select'}
                                                        </Button>
                                                        <Button
                                                            size='sm'
                                                            variant='secondary'
                                                            onClick={() => handleQuickApply(preset.id)}>
                                                            Quick Apply
                                                        </Button>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </TabsContent>

                <TabsContent value='compare' className='space-y-4'>
                    {selectedPresets.length === 0 ? (
                        <Card>
                            <CardContent className='pt-6'>
                                <div className='py-8 text-center'>
                                    <Palette className='text-muted-foreground mx-auto mb-4 h-12 w-12' />
                                    <h3 className='mb-2 text-lg font-semibold'>No Presets Selected</h3>
                                    <p className='text-muted-foreground mb-4'>
                                        Select up to 3 presets to compare and generate variations
                                    </p>
                                    <Button variant='outline' onClick={() => setActiveTab('browse')}>
                                        Browse Presets
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <>
                            <div className='flex items-center justify-between'>
                                <h3 className='text-lg font-semibold'>Selected Presets ({selectedPresets.length}/3)</h3>
                                <Button onClick={handleApplySelected}>Generate with Selected Presets</Button>
                            </div>

                            <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
                                {selectedPresets.map((presetId) => {
                                    const preset = MOODBOARD_PRESETS.find((p) => p.id === presetId);
                                    if (!preset) return null;

                                    const IconComponent =
                                        PRESET_ICONS[preset.id as keyof typeof PRESET_ICONS] || Palette;

                                    return (
                                        <Card key={preset.id} className='relative'>
                                            <CardHeader className='pb-3'>
                                                <div className='flex items-start gap-3'>
                                                    <div className='bg-primary text-primary-foreground rounded-lg p-2'>
                                                        <IconComponent className='h-4 w-4' />
                                                    </div>
                                                    <div>
                                                        <CardTitle className='text-base'>{preset.name}</CardTitle>
                                                        <CardDescription className='text-xs'>
                                                            {preset.description}
                                                        </CardDescription>
                                                    </div>
                                                </div>
                                                <Button
                                                    size='sm'
                                                    variant='ghost'
                                                    className='absolute top-2 right-2 h-6 w-6 p-0'
                                                    onClick={() => handlePresetToggle(preset.id)}>
                                                    ×
                                                </Button>
                                            </CardHeader>

                                            <CardContent className='pt-0'>
                                                {/* Parameters Preview */}
                                                <div className='space-y-2 text-xs'>
                                                    <div className='flex justify-between'>
                                                        <span className='text-muted-foreground'>Quality:</span>
                                                        <span>{preset.parameters.quality}</span>
                                                    </div>
                                                    <div className='flex justify-between'>
                                                        <span className='text-muted-foreground'>Format:</span>
                                                        <span>{preset.parameters.output_format}</span>
                                                    </div>
                                                    <div className='flex justify-between'>
                                                        <span className='text-muted-foreground'>Background:</span>
                                                        <span>{preset.parameters.background}</span>
                                                    </div>
                                                </div>

                                                {/* Style Keywords */}
                                                <div className='mt-3'>
                                                    <p className='text-muted-foreground mb-2 text-xs'>
                                                        Style Keywords:
                                                    </p>
                                                    <div className='flex flex-wrap gap-1'>
                                                        {preset.promptModifiers.styleKeywords
                                                            .slice(0, 4)
                                                            .map((keyword) => (
                                                                <span
                                                                    key={keyword}
                                                                    className='bg-secondary text-secondary-foreground inline-flex items-center rounded-full px-2 py-1 text-xs'>
                                                                    {keyword}
                                                                </span>
                                                            ))}
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>

                            {selectedPresets.length > 0 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className='text-base'>Generated Prompt Preview</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className='bg-muted rounded-lg p-3 text-sm'>
                                            <p className='text-muted-foreground mb-2'>
                                                Combined style modifiers will be applied:
                                            </p>
                                            <ul className='list-inside list-disc space-y-1'>
                                                {selectedPresets.map((presetId) => {
                                                    const preset = MOODBOARD_PRESETS.find((p) => p.id === presetId);
                                                    return preset ? (
                                                        <li key={preset.id}>
                                                            <strong>{preset.name}:</strong>{' '}
                                                            {preset.promptModifiers.suffix}
                                                        </li>
                                                    ) : null;
                                                })}
                                            </ul>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
