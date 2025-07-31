'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { FileType, Package, Zap } from 'lucide-react';
import * as React from 'react';
import { EANRenamer } from './ean-renamer';
import { ImageConverter } from './image-converter';
import { ImageCompressor } from './image-compressor';

interface KonverterToolsSuiteProps {
    clientPasswordHash: string | null;
}

export function KonverterToolsSuite({ clientPasswordHash }: KonverterToolsSuiteProps) {
    const [activeTab, setActiveTab] = React.useState<'rename' | 'convert' | 'compress'>('rename');

    return (
        <div className="w-full space-y-6">
            <Card className="border-white/10 bg-black/50 p-6">
                <h2 className="text-2xl font-bold text-white mb-4">Konverter værktøjer</h2>
                <p className="text-white/60 mb-6">
                    Professionelle værktøjer til at omdøbe, konvertere og komprimere dine billeder
                </p>
                
                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'rename' | 'convert' | 'compress')}>
                    <TabsList className="grid w-full grid-cols-3 bg-neutral-900/50 border border-white/10">
                        <TabsTrigger value="rename" className="flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            EAN Omdøber
                        </TabsTrigger>
                        <TabsTrigger value="convert" className="flex items-center gap-2">
                            <FileType className="h-4 w-4" />
                            Format Konverter
                        </TabsTrigger>
                        <TabsTrigger value="compress" className="flex items-center gap-2">
                            <Zap className="h-4 w-4" />
                            Billede Kompressor
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="rename" className="mt-6">
                        <EANRenamer clientPasswordHash={clientPasswordHash} />
                    </TabsContent>

                    <TabsContent value="convert" className="mt-6">
                        <ImageConverter clientPasswordHash={clientPasswordHash} />
                    </TabsContent>

                    <TabsContent value="compress" className="mt-6">
                        <ImageCompressor clientPasswordHash={clientPasswordHash} />
                    </TabsContent>
                </Tabs>
            </Card>
        </div>
    );
}