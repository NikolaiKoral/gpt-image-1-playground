'use client';

import * as React from 'react';

export interface DragDropState {
    isDragActive: boolean;
    isDragAccept: boolean;
    isDragReject: boolean;
}

export interface UseDragDropOptions {
    onDrop: (files: File[]) => void;
    accept?: string[];
    maxFiles?: number;
    maxSize?: number;
    multiple?: boolean;
    disabled?: boolean;
}

export function useDragDrop({
    onDrop,
    accept = ['image/*'],
    maxFiles = 10,
    maxSize = 10 * 1024 * 1024, // 10MB
    multiple = true,
    disabled = false
}: UseDragDropOptions) {
    const [dragState, setDragState] = React.useState<DragDropState>({
        isDragActive: false,
        isDragAccept: false,
        isDragReject: false
    });

    const dragCounter = React.useRef(0);

    const validateFiles = React.useCallback(
        (files: FileList | null): File[] => {
            if (!files) return [];

            const validFiles: File[] = [];

            for (let i = 0; i < files.length; i++) {
                const file = files[i];

                // Check file type
                const isValidType = accept.some((acceptType) => {
                    if (acceptType === 'image/*') {
                        return file.type.startsWith('image/');
                    }
                    return file.type === acceptType;
                });

                // Check file size
                const isValidSize = file.size <= maxSize;

                if (isValidType && isValidSize) {
                    validFiles.push(file);
                }

                // Respect maxFiles limit
                if (validFiles.length >= maxFiles) {
                    break;
                }
            }

            return validFiles;
        },
        [accept, maxFiles, maxSize]
    );

    const checkDragAcceptance = React.useCallback(
        (dataTransfer: DataTransfer | null): boolean => {
            if (disabled || !dataTransfer) return false;

            const items = Array.from(dataTransfer.items);
            return items.some((item) => {
                if (item.kind !== 'file') return false;

                return accept.some((acceptType) => {
                    if (acceptType === 'image/*') {
                        return item.type.startsWith('image/');
                    }
                    return item.type === acceptType;
                });
            });
        },
        [accept, disabled]
    );

    const handleDragEnter = React.useCallback(
        (e: DragEvent) => {
            e.preventDefault();
            e.stopPropagation();

            dragCounter.current++;

            if (dragCounter.current === 1) {
                const isAccepted = checkDragAcceptance(e.dataTransfer);

                setDragState({
                    isDragActive: true,
                    isDragAccept: isAccepted,
                    isDragReject: !isAccepted
                });
            }
        },
        [checkDragAcceptance]
    );

    const handleDragLeave = React.useCallback((e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        dragCounter.current--;

        if (dragCounter.current === 0) {
            setDragState({
                isDragActive: false,
                isDragAccept: false,
                isDragReject: false
            });
        }
    }, []);

    const handleDragOver = React.useCallback((e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = React.useCallback(
        (e: DragEvent) => {
            e.preventDefault();
            e.stopPropagation();

            dragCounter.current = 0;
            setDragState({
                isDragActive: false,
                isDragAccept: false,
                isDragReject: false
            });

            if (disabled || !e.dataTransfer) return;

            const files = validateFiles(e.dataTransfer.files);
            if (files.length > 0) {
                onDrop(files);
            }
        },
        [disabled, validateFiles, onDrop]
    );

    const inputRef = React.useRef<HTMLInputElement>(null);

    const openFileDialog = React.useCallback(() => {
        if (inputRef.current && !disabled) {
            inputRef.current.click();
        }
    }, [disabled]);

    const handleInputChange = React.useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const files = validateFiles(e.target.files);
            if (files.length > 0) {
                onDrop(files);
            }
            // Reset input value to allow selecting the same files again
            e.target.value = '';
        },
        [validateFiles, onDrop]
    );

    // Bind event listeners
    React.useEffect(() => {
        const element = document.body;

        element.addEventListener('dragenter', handleDragEnter);
        element.addEventListener('dragleave', handleDragLeave);
        element.addEventListener('dragover', handleDragOver);
        element.addEventListener('drop', handleDrop);

        return () => {
            element.removeEventListener('dragenter', handleDragEnter);
            element.removeEventListener('dragleave', handleDragLeave);
            element.removeEventListener('dragover', handleDragOver);
            element.removeEventListener('drop', handleDrop);
        };
    }, [handleDragEnter, handleDragLeave, handleDragOver, handleDrop]);

    const getRootProps = React.useCallback(
        () => ({
            onClick: openFileDialog,
            role: 'button',
            tabIndex: disabled ? -1 : 0,
            onKeyDown: (e: React.KeyboardEvent) => {
                if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
                    e.preventDefault();
                    openFileDialog();
                }
            }
        }),
        [openFileDialog, disabled]
    );

    const getInputProps = React.useCallback(
        () => ({
            ref: inputRef,
            type: 'file' as const,
            multiple,
            accept: accept.join(','),
            onChange: handleInputChange,
            style: { display: 'none' }
        }),
        [multiple, accept, handleInputChange]
    );

    return {
        ...dragState,
        getRootProps,
        getInputProps,
        openFileDialog,
        disabled
    };
}
