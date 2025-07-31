'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PackshotEditor } from '@/components/packshot-editor';
import { MoodImageEditor } from '@/components/mood-image-editor';
import { Package, Sparkles } from 'lucide-react';
import * as React from 'react';

interface ImageEditingSuiteProps {
    clientPasswordHash: string | null;
}

export function ImageEditingSuite({ clientPasswordHash }: ImageEditingSuiteProps) {
    const [activeEditingTool, setActiveEditingTool] = React.useState<'packshot' | 'mood'>('packshot');

    return (
        <div className='space-y-6'>
            <Card className='border-white/10 bg-black'>
                <CardHeader>
                    <CardTitle className='text-2xl text-white'>Billede redigering</CardTitle>
                    <CardDescription className='text-white/60'>
                        Rediger dine produktbilleder med professionelle værktøjer
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs value={activeEditingTool} onValueChange={(value) => setActiveEditingTool(value as 'packshot' | 'mood')}>
                        <TabsList className='grid w-full grid-cols-2 bg-neutral-900/50 border border-white/10'>
                            <TabsTrigger value='packshot' className='flex items-center gap-2'>
                                <Package className='h-4 w-4' />
                                Packshot
                            </TabsTrigger>
                            <TabsTrigger value='mood' className='flex items-center gap-2'>
                                <Sparkles className='h-4 w-4' />
                                Stemningsbilleder
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value='packshot' className='mt-6'>
                            <PackshotEditor clientPasswordHash={clientPasswordHash} />
                        </TabsContent>

                        <TabsContent value='mood' className='mt-6'>
                            <MoodImageEditor clientPasswordHash={clientPasswordHash} />
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}