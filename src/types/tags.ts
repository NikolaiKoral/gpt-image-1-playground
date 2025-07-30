export interface PromptTag {
    id: string;
    label: string;
    description?: string;
    category: string;
    conflicts?: string[];
    popular?: boolean;
}

export interface TagCategory {
    id: string;
    name: string;
    description: string;
    icon: string;
    tags: PromptTag[];
}

export interface TagSelectorProps {
    selectedTags: string[];
    onTagsChange: (tags: string[]) => void;
    maxTags?: number;
    showConflicts?: boolean;
    className?: string;
}

export interface TagChipProps {
    tag: PromptTag;
    isSelected: boolean;
    onClick: () => void;
    onRemove?: () => void;
    variant?: 'default' | 'removable';
    size?: 'sm' | 'md';
}
