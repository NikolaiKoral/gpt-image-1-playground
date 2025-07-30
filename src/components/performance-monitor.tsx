'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Monitor, Activity, Database, Image, Zap } from 'lucide-react';
import { db } from '@/lib/db';

interface PerformanceMetrics {
    memoryUsage: {
        used: number;
        total: number;
        percentage: number;
    };
    storageStats: {
        totalImages: number;
        totalSize: number;
        averageSize: number;
    };
    renderMetrics: {
        fps: number;
        frameTime: number;
    };
    networkStats: {
        activeRequests: number;
        totalRequests: number;
        failedRequests: number;
    };
}

export function PerformanceMonitor({ isVisible = false }: { isVisible?: boolean }) {
    const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        if (!isVisible) return;

        const updateMetrics = async () => {
            try {
                // Memory usage
                const memory = (performance as any).memory;
                const memoryUsage = memory ? {
                    used: memory.usedJSHeapSize,
                    total: memory.totalJSHeapSize,
                    percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100
                } : { used: 0, total: 0, percentage: 0 };

                // Storage stats
                const storageStats = await db.getStorageStats();

                // Basic render metrics (simplified)
                const renderMetrics = {
                    fps: 60, // Would need more complex measurement
                    frameTime: 16.67
                };

                // Network stats (would need to track this globally)
                const networkStats = {
                    activeRequests: 0,
                    totalRequests: 0,
                    failedRequests: 0
                };

                setMetrics({
                    memoryUsage,
                    storageStats,
                    renderMetrics,
                    networkStats
                });

            } catch (error) {
                console.error('Failed to update performance metrics:', error);
            }
        };

        updateMetrics();
        const interval = setInterval(updateMetrics, 2000);

        return () => clearInterval(interval);
    }, [isVisible]);

    if (!isVisible || !metrics) {
        return null;
    }

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
    };

    const getMemoryStatus = (percentage: number) => {
        if (percentage > 80) return { color: 'red', label: 'Critical' };
        if (percentage > 60) return { color: 'yellow', label: 'Warning' };
        return { color: 'green', label: 'Good' };
    };

    const memoryStatus = getMemoryStatus(metrics.memoryUsage.percentage);

    return (
        <div className="fixed bottom-4 right-4 z-50">
            <Card className="border border-white/10 bg-black/90 text-white backdrop-blur-sm">
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-sm">
                            <Monitor className="h-4 w-4" />
                            Performance
                        </CardTitle>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="h-6 w-6 p-0 text-white/60 hover:text-white"
                        >
                            {isExpanded ? '−' : '+'}
                        </Button>
                    </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                    {/* Always visible summary */}
                    <div className="flex items-center gap-2 text-xs">
                        <Badge 
                            variant="outline" 
                            className={`border-${memoryStatus.color}-500/50 text-${memoryStatus.color}-400`}
                        >
                            <Activity className="mr-1 h-3 w-3" />
                            Memory: {metrics.memoryUsage.percentage.toFixed(1)}%
                        </Badge>
                        <Badge variant="outline" className="border-blue-500/50 text-blue-400">
                            <Database className="mr-1 h-3 w-3" />
                            {metrics.storageStats.totalImages} images
                        </Badge>
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                        <div className="mt-3 space-y-3 text-xs">
                            {/* Memory Details */}
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <Activity className="h-3 w-3" />
                                    <span className="font-medium">Memory Usage</span>
                                </div>
                                <div className="ml-5 space-y-1 text-white/70">
                                    <div className="flex justify-between">
                                        <span>Used:</span>
                                        <span>{formatBytes(metrics.memoryUsage.used)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Total:</span>
                                        <span>{formatBytes(metrics.memoryUsage.total)}</span>
                                    </div>
                                    <div className="w-full bg-white/10 rounded h-1">
                                        <div 
                                            className={`h-1 rounded bg-${memoryStatus.color}-500`}
                                            style={{ width: `${metrics.memoryUsage.percentage}%` }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Storage Details */}
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <Database className="h-3 w-3" />
                                    <span className="font-medium">Storage</span>
                                </div>
                                <div className="ml-5 space-y-1 text-white/70">
                                    <div className="flex justify-between">
                                        <span>Images:</span>
                                        <span>{metrics.storageStats.totalImages}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Total Size:</span>
                                        <span>{formatBytes(metrics.storageStats.totalSize)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Avg Size:</span>
                                        <span>{formatBytes(metrics.storageStats.averageSize)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Quick Actions */}
                            <div className="flex gap-2 pt-2 border-t border-white/10">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-6 px-2 text-xs border-white/20 text-white/70 hover:text-white"
                                    onClick={async () => {
                                        const deletedCount = await db.cleanupOldImages();
                                        console.log(`Cleaned up ${deletedCount} old images`);
                                    }}
                                >
                                    <Database className="mr-1 h-3 w-3" />
                                    Cleanup
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-6 px-2 text-xs border-white/20 text-white/70 hover:text-white"
                                    onClick={() => {
                                        if (window.gc) {
                                            window.gc();
                                            console.log('Garbage collection triggered');
                                        } else {
                                            console.log('GC not available');
                                        }
                                    }}
                                >
                                    <Zap className="mr-1 h-3 w-3" />
                                    GC
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}