'use client';

import { db } from '@/lib/db';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import * as React from 'react';

interface IndexedDbImageProps {
    src: string;
    alt: string;
    className?: string;
    fill?: boolean;
    sizes?: string;
    unoptimized?: boolean;
    onError?: () => void;
    fallback?: React.ReactNode;
}

export function IndexedDbImage({
    src,
    alt,
    className,
    fill,
    sizes,
    unoptimized = true,
    onError,
    fallback
}: IndexedDbImageProps) {
    const [imageUrl, setImageUrl] = React.useState<string | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(false);

    React.useEffect(() => {
        let mounted = true;
        let objectUrl: string | null = null;

        const loadImage = async () => {
            try {
                setLoading(true);
                setError(false);

                // Check if it's an API path
                if (src.startsWith('/api/image/')) {
                    // First, try to fetch from the API
                    const response = await fetch(src);
                    
                    if (response.status === 418) {
                        // Special IndexedDB mode response
                        const data = await response.json();
                        const filename = data.filename;
                        
                        // Try to load from IndexedDB
                        const imageRecord = await db.images.get(filename);
                        
                        if (imageRecord?.blob && mounted) {
                            objectUrl = URL.createObjectURL(imageRecord.blob);
                            setImageUrl(objectUrl);
                        } else {
                            throw new Error('Image not found in IndexedDB');
                        }
                    } else if (response.ok) {
                        // Normal image response
                        const blob = await response.blob();
                        if (mounted) {
                            objectUrl = URL.createObjectURL(blob);
                            setImageUrl(objectUrl);
                        }
                    } else {
                        throw new Error('Failed to load image');
                    }
                } else if (src.startsWith('blob:') || src.startsWith('data:') || src.startsWith('http')) {
                    // Direct URL
                    if (mounted) {
                        setImageUrl(src);
                    }
                } else {
                    // Try to load from IndexedDB by filename
                    const imageRecord = await db.images.get(src);
                    
                    if (imageRecord?.blob && mounted) {
                        objectUrl = URL.createObjectURL(imageRecord.blob);
                        setImageUrl(objectUrl);
                    } else {
                        throw new Error('Image not found');
                    }
                }
            } catch (err) {
                if (mounted) {
                    setError(true);
                    onError?.();
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        loadImage();

        return () => {
            mounted = false;
            if (objectUrl && objectUrl.startsWith('blob:')) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [src, onError]);

    if (loading) {
        return (
            <div className={cn('animate-pulse bg-white/10', className)}>
                {fill && <div className="absolute inset-0" />}
            </div>
        );
    }

    if (error || !imageUrl) {
        if (fallback) {
            return <>{fallback}</>;
        }
        return (
            <div className={cn('bg-white/5 flex items-center justify-center', className)}>
                <span className="text-white/20">Failed to load image</span>
            </div>
        );
    }

    return (
        <Image
            src={imageUrl}
            alt={alt}
            className={className}
            fill={fill}
            sizes={sizes}
            unoptimized={unoptimized}
        />
    );
}