export interface VideoGenerationFormData {
    sourceImages: ImageSource[];
    promptText: string;
    model: 'gen4_turbo';
    ratio: '1280:720' | '720:1280' | '1104:832' | '832:1104' | '960:960' | '1584:672';
    duration: 5 | 10;
    seed?: number;
    contentModeration: {
        publicFigureThreshold: 'auto' | 'low';
    };
}

export interface ImageSource {
    type: 'generated' | 'uploaded';
    file?: File;
    url?: string;
    filename?: string;
    position: 'first' | 'last';
    id: string;
}

export interface VideoHistoryItem {
    id: string;
    taskId: string;
    createdAt: string;
    sourceImages: ImageReference[];
    promptText: string;
    model: string;
    ratio: string;
    duration: number;
    seed?: number;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    videoUrl?: string;
    localVideoUrl?: string;
    locallyStored?: boolean;
    cost: number;
    metadata: {
        fileSize?: number;
        format?: string;
    };
}

export interface ImageReference {
    filename: string;
    url: string;
    position: 'first' | 'last';
}

export interface RunwayTask {
    id: string;
    status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
    createdAt: string;
    updatedAt?: string;
    progress?: number;
    failureReason?: string;
    output?: {
        videoUrl: string;
        duration: number;
        width: number;
        height: number;
    };
}

export interface VideoGenerationRequest {
    promptImage?: string | PromptImageObject[];
    promptText: string;
    model: 'gen4_turbo';
    ratio: string;
    duration: number;
    seed?: number;
    contentModeration?: {
        publicFigureThreshold: 'auto' | 'low';
    };
}

export interface PromptImageObject {
    uri: string;
    position: 'first' | 'last';
}

export interface VideoGenerationResponse {
    id: string;
    status: string;
    createdAt: string;
}

// Aspect ratio options with Danish labels
export const ASPECT_RATIOS = [
    { value: '1280:720', label: '16:9 Landskab', description: '1280×720' },
    { value: '720:1280', label: '9:16 Portræt', description: '720×1280' },
    { value: '1104:832', label: '4:3 Landskab', description: '1104×832' },
    { value: '832:1104', label: '3:4 Portræt', description: '832×1104' },
    { value: '960:960', label: '1:1 Kvadrat', description: '960×960' },
    { value: '1584:672', label: 'Ultra-bred', description: '1584×672' }
] as const;

// Duration options
export const DURATION_OPTIONS = [
    { value: 5, label: '5 sekunder' },
    { value: 10, label: '10 sekunder' }
] as const;

// Motion prompt templates
export const MOTION_TEMPLATES = [
    {
        category: 'Produkt showcase',
        prompts: [
            'Langsom 360-graders rotation af produktet med elegant belysning',
            'Zoom ind på produktet med blød fokus transition',
            'Produktet svæver let op og ned med subtil skygge',
            'Elegant pan rundt om produktet fra venstre til højre'
        ]
    },
    {
        category: 'Lifestyle',
        prompts: [
            'Blid bevægelse af objekter i baggrunden, rolig og naturlig',
            'Subtil kamera zoom ud for at vise mere af scenen',
            'Let svaj af planter eller tekstiler i baggrunden',
            'Gradvist skift i belysning fra varmt til køligt'
        ]
    },
    {
        category: 'Dramatisk',
        prompts: [
            'Hurtig zoom ind på hovedobjektet med dramatisk effekt',
            'Kamera rotation rundt om scenen med cinematic feel',
            'Objekter flyver forbi kameraet i høj hastighed',
            'Eksplosiv bevægelse fra center og udad'
        ]
    },
    {
        category: 'Naturlig',
        prompts: [
            'Blid brise får elementer til at bevæge sig naturligt',
            'Langsom paralakse bevægelse mellem for- og baggrund',
            'Subtile skygger der bevæger sig over scenen',
            'Naturlig lysning ændringer som tid der går'
        ]
    }
] as const;