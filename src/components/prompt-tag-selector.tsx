'use client';

import { TagChip } from '@/components/tag-chip';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PROMPT_TAG_CATEGORIES, getPopularTags, findTagConflicts, searchTags } from '@/lib/prompt-tags';
import { cn } from '@/lib/utils';
import type { TagSelectorProps } from '@/types/tags';
import { Camera, Sun, Palette, Frame, Heart, Package, Search, ChevronDown, Star, AlertTriangle, X } from 'lucide-react';
import * as React from 'react';

const CATEGORY_ICONS = {
    Camera,
    Sun,
    Palette,
    Frame,
    Heart,
    Package
};

export function PromptTagSelector({
    selectedTags,
    onTagsChange,
    maxTags = 20,
    showConflicts = true,
    className
}: TagSelectorProps) {
    const [searchQuery, setSearchQuery] = React.useState('');
    const [openCategories, setOpenCategories] = React.useState<string[]>(['camera', 'lighting']);
    const showPopular = true;

    const popularTags = getPopularTags();
    const conflicts = showConflicts ? findTagConflicts(selectedTags) : [];
    const searchResults = searchQuery ? searchTags(searchQuery) : [];

    const toggleTag = (tagId: string) => {
        if (selectedTags.includes(tagId)) {
            onTagsChange(selectedTags.filter((id) => id !== tagId));
        } else if (selectedTags.length < maxTags) {
            onTagsChange([...selectedTags, tagId]);
        }
    };

    const removeTag = (tagId: string) => {
        onTagsChange(selectedTags.filter((id) => id !== tagId));
    };

    const clearAllTags = () => {
        onTagsChange([]);
    };

    const toggleCategory = (categoryId: string) => {
        setOpenCategories((prev) =>
            prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId]
        );
    };

    const selectedTagObjects = PROMPT_TAG_CATEGORIES.flatMap((cat) => cat.tags).filter((tag) =>
        selectedTags.includes(tag.id)
    );

    return (
        <div className={cn('space-y-4', className)}>
            {/* Header with selected tags count and clear button */}
            <div className='flex items-center justify-between'>
                <Label className='text-sm font-medium'>
                    Forbedr med tags ({selectedTags.length}/{maxTags})
                </Label>
                {selectedTags.length > 0 && (
                    <Button
                        variant='ghost'
                        size='sm'
                        onClick={clearAllTags}
                        className='text-muted-foreground hover:text-foreground text-xs'>
                        <X className='mr-1 h-3 w-3' />
                        Ryd alle
                    </Button>
                )}
            </div>

            {/* Selected Tags Display */}
            {selectedTags.length > 0 && (
                <Card>
                    <CardHeader className='pb-2'>
                        <CardTitle className='text-sm'>Valgte tags</CardTitle>
                    </CardHeader>
                    <CardContent className='px-4 pt-0 pb-3'>
                        <div className='flex flex-wrap gap-2'>
                            {selectedTagObjects.map((tag) => (
                                <TagChip
                                    key={tag.id}
                                    tag={tag}
                                    isSelected={true}
                                    onClick={() => {}}
                                    onRemove={() => removeTag(tag.id)}
                                    variant='removable'
                                    size='sm'
                                />
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Conflicts Display */}
            {conflicts.length > 0 && (
                <Card className='border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950'>
                    <CardContent className='pt-4'>
                        <div className='flex items-start gap-2'>
                            <AlertTriangle className='mt-0.5 h-4 w-4 text-orange-600' />
                            <div>
                                <p className='text-sm font-medium text-orange-800 dark:text-orange-200'>
                                    Tag konflikter registreret
                                </p>
                                <ul className='mt-1 text-xs text-orange-700 dark:text-orange-300'>
                                    {conflicts.map((conflict, index) => (
                                        <li key={index}>• {conflict}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Search */}
            <div className='relative'>
                <Search className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
                <Input
                    placeholder='Søg tags...'
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className='pl-10'
                />
            </div>

            {/* Search Results */}
            {searchQuery && searchResults.length > 0 && (
                <Card>
                    <CardHeader className='pb-2'>
                        <CardTitle className='text-sm'>Søgeresultater ({searchResults.length})</CardTitle>
                    </CardHeader>
                    <CardContent className='px-4 pt-0 pb-3'>
                        <div className='flex flex-wrap gap-2'>
                            {searchResults.map((tag) => (
                                <TagChip
                                    key={tag.id}
                                    tag={tag}
                                    isSelected={selectedTags.includes(tag.id)}
                                    onClick={() => toggleTag(tag.id)}
                                    size='sm'
                                />
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Popular Tags */}
            {!searchQuery && showPopular && (
                <Card>
                    <CardHeader className='pb-2'>
                        <CardTitle className='flex items-center gap-2 text-sm'>
                            <Star className='h-4 w-4 text-yellow-500' />
                            Populære tags
                        </CardTitle>
                        <CardDescription className='text-xs'>Hyppigt brugte tags til hurtig vælv</CardDescription>
                    </CardHeader>
                    <CardContent className='px-4 pt-0 pb-3'>
                        <div className='flex flex-wrap gap-2'>
                            {popularTags.map((tag) => (
                                <TagChip
                                    key={tag.id}
                                    tag={tag}
                                    isSelected={selectedTags.includes(tag.id)}
                                    onClick={() => toggleTag(tag.id)}
                                    size='sm'
                                />
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Tag Categories */}
            {!searchQuery && (
                <div className='space-y-2'>
                    {PROMPT_TAG_CATEGORIES.map((category) => {
                        const IconComponent = CATEGORY_ICONS[category.icon as keyof typeof CATEGORY_ICONS];
                        const isOpen = openCategories.includes(category.id);
                        const categorySelectedCount = category.tags.filter((tag) =>
                            selectedTags.includes(tag.id)
                        ).length;

                        return (
                            <Card key={category.id}>
                                <Collapsible open={isOpen} onOpenChange={() => toggleCategory(category.id)}>
                                    <CollapsibleTrigger asChild>
                                        <CardHeader className='hover:bg-muted/50 cursor-pointer py-3 pb-2 transition-colors'>
                                            <div className='flex items-center justify-between'>
                                                <div className='flex items-center gap-2'>
                                                    <IconComponent className='h-4 w-4' />
                                                    <CardTitle className='text-sm'>
                                                        {category.name}
                                                        {categorySelectedCount > 0 && (
                                                            <span className='bg-primary text-primary-foreground ml-2 rounded-full px-2 py-0.5 text-xs'>
                                                                {categorySelectedCount}
                                                            </span>
                                                        )}
                                                    </CardTitle>
                                                </div>
                                                <ChevronDown
                                                    className={cn(
                                                        'h-4 w-4 transition-transform duration-200',
                                                        isOpen && 'rotate-180'
                                                    )}
                                                />
                                            </div>
                                            <CardDescription className='text-left text-xs'>
                                                {category.description}
                                            </CardDescription>
                                        </CardHeader>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                        <CardContent className='px-4 pt-0 pb-3'>
                                            <ScrollArea className='max-h-64'>
                                                <div className='flex flex-wrap gap-2 pr-4'>
                                                    {category.tags.map((tag) => (
                                                        <TagChip
                                                            key={tag.id}
                                                            tag={tag}
                                                            isSelected={selectedTags.includes(tag.id)}
                                                            onClick={() => toggleTag(tag.id)}
                                                            size='sm'
                                                        />
                                                    ))}
                                                </div>
                                            </ScrollArea>
                                        </CardContent>
                                    </CollapsibleContent>
                                </Collapsible>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
