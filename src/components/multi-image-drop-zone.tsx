'use client';

import { cn } from '@/lib/utils';
import { Upload, X, FileImage } from 'lucide-react';
import * as React from 'react';

interface MultiImageDropZoneProps {
    onFilesAdded: (files: File[]) => void;
    maxImages?: number;
    disabled?: boolean;
    className?: string;
}

export function MultiImageDropZone({
    onFilesAdded,
    maxImages = 10,
    disabled = false,
    className
}: MultiImageDropZoneProps) {
    const [isDragging, setIsDragging] = React.useState(false);
    const [files, setFiles] = React.useState<File[]>([]);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled) {
            setIsDragging(true);
        }
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        if (disabled) return;

        const droppedFiles = Array.from(e.dataTransfer.files).filter(
            file => file.type.startsWith('image/')
        );

        if (droppedFiles.length > 0) {
            const newFiles = [...files, ...droppedFiles].slice(0, maxImages);
            setFiles(newFiles);
            onFilesAdded(newFiles);
        }
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (disabled) return;

        const selectedFiles = Array.from(e.target.files || []).filter(
            file => file.type.startsWith('image/')
        );

        if (selectedFiles.length > 0) {
            const newFiles = [...files, ...selectedFiles].slice(0, maxImages);
            setFiles(newFiles);
            onFilesAdded(newFiles);
        }
    };

    const handleRemoveFile = (index: number) => {
        const newFiles = files.filter((_, i) => i !== index);
        setFiles(newFiles);
        onFilesAdded(newFiles);
    };

    const handleClear = () => {
        setFiles([]);
        onFilesAdded([]);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className={cn('space-y-4', className)}>
            <div
                className={cn(
                    'relative rounded-lg border-2 border-dashed transition-colors',
                    isDragging ? 'border-blue-500 bg-blue-50/10' : 'border-white/20',
                    disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
                    'hover:border-white/40'
                )}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => !disabled && fileInputRef.current?.click()}>
                
                <input
                    ref={fileInputRef}
                    type='file'
                    multiple
                    accept='image/*'
                    onChange={handleFileInput}
                    disabled={disabled}
                    className='hidden'
                />

                <div className='flex flex-col items-center justify-center p-8 text-center'>
                    <Upload className='h-12 w-12 text-white/40 mb-4' />
                    <p className='text-white mb-2'>
                        Træk og slip billeder her
                    </p>
                    <p className='text-sm text-white/60'>
                        eller klik for at vælge filer
                    </p>
                    <p className='text-xs text-white/40 mt-2'>
                        Maks {maxImages} billeder
                    </p>
                </div>
            </div>

            {files.length > 0 && (
                <div className='space-y-2'>
                    <div className='flex items-center justify-between'>
                        <p className='text-sm text-white'>
                            {files.length} {files.length === 1 ? 'billede' : 'billeder'} valgt
                        </p>
                        <button
                            onClick={handleClear}
                            className='text-sm text-white/60 hover:text-white'>
                            Ryd alle
                        </button>
                    </div>
                    <div className='grid grid-cols-2 gap-2'>
                        {files.map((file, index) => (
                            <div
                                key={index}
                                className='relative group rounded border border-white/10 bg-white/5 p-2'>
                                <div className='flex items-center gap-2'>
                                    <FileImage className='h-4 w-4 text-white/60' />
                                    <span className='text-xs text-white/80 truncate flex-1'>
                                        {file.name}
                                    </span>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleRemoveFile(index);
                                        }}
                                        className='opacity-0 group-hover:opacity-100 transition-opacity'>
                                        <X className='h-4 w-4 text-white/60 hover:text-white' />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}