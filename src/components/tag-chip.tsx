'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { TagChipProps } from '@/types/tags';
import { X } from 'lucide-react';
import * as React from 'react';

export function TagChip({ tag, isSelected, onClick, onRemove, variant = 'default', size = 'md' }: TagChipProps) {
    const baseClasses = cn(
        'inline-flex items-center gap-1 transition-all duration-200 border font-medium',
        size === 'sm' ? 'text-xs px-2 py-1 h-6' : 'text-sm px-3 py-1 h-7',
        'rounded-full cursor-pointer hover:scale-105'
    );

    const variantClasses = cn(
        isSelected
            ? 'bg-primary text-primary-foreground border-primary hover:bg-primary/90'
            : 'bg-secondary text-secondary-foreground border-border hover:bg-secondary/80 hover:border-border/60'
    );

    if (variant === 'removable' && isSelected) {
        return (
            <div className={cn(baseClasses, variantClasses)}>
                <span>{tag.label}</span>
                {onRemove && (
                    <Button
                        variant='ghost'
                        size='icon'
                        className='h-4 w-4 p-0 hover:bg-transparent'
                        onClick={(e) => {
                            e.stopPropagation();
                            onRemove();
                        }}>
                        <X className='h-3 w-3' />
                    </Button>
                )}
            </div>
        );
    }

    return (
        <div className={cn(baseClasses, variantClasses)} onClick={onClick} title={tag.description}>
            {tag.label}
        </div>
    );
}
