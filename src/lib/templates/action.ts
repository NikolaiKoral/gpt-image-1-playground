import { PromptTemplate } from '@/types/templates';

export const actionTemplates: PromptTemplate[] = [
    {
        id: 'mood-dynamic-user-interaction',
        name: 'The Dynamic User Interaction (Hand-in-Frame)',
        description: 'Best for: Small kitchen tools, personal care gadgets, cutlery',
        category: 'mood',
        template: 'A close-up shot where a hand with clean, natural nails gently interacts with {product}. The action is quiet and deliberate, such as pouring oil from a bottle or placing a fork on a plate. The focus is razor-sharp on the product, with the hand in soft focus to add a human, relatable element. The background is a simple, blurred out texture like a wooden cutting board or linen tablecloth. Shot with an 85mm f/1.8 lens for beautiful subject separation. ISO 400. The mood is mindful and focuses on the tactile experience.',
        variables: [
            {
                name: 'product',
                label: 'Product Description',
                placeholder: 'your product',
                type: 'text'
            }
        ],
        tags: ['mood', 'kitchen-tools', 'personal-care', 'cutlery', 'user-interaction', 'hand-in-frame', 'tactile', 'mindful']
    },
    {
        id: 'mood-spill-splash-action',
        name: 'The Spill & Splash (High-Speed Action)',
        description: 'Best for: Durable items, waterproof gadgets, containers with liquids',
        category: 'mood',
        template: 'A high-speed, dynamic photograph capturing a splash of water (or other liquid) interacting with {product}. The product is on a dark, wet slate surface. The lighting is high-speed strobe flash, freezing the motion of the liquid droplets in mid-air. Photographed with a Sony A1 and a 90mm Macro G lens. ISO 50. The shot is dramatic and energetic, yet retains an elegant and clean aesthetic, showcasing the product\'s durability.',
        variables: [
            {
                name: 'product',
                label: 'Product Description',
                placeholder: 'your product',
                type: 'text'
            }
        ],
        tags: ['mood', 'durable-items', 'waterproof', 'containers', 'liquids', 'spill', 'splash', 'high-speed', 'action', 'dynamic']
    },
    {
        id: 'mood-lived-in-kitchen-counter',
        name: 'The Lived-In Kitchen Counter Moment (For Kitchen Tools & Gadgets)',
        description: 'Best for: Coffee makers, kitchen tools, storage jars, oil bottles',
        category: 'mood',
        template: 'A still life on a light concrete kitchen countertop featuring {product}. The background is a tiled backsplash with matte, handmade ceramic tiles in a bone color. The scene is styled with a half-read cookbook and a wooden bowl of lemons. The light feels natural and lived-in, coming from a nearby window. Photographed with a 50mm f/1.8 lens for a natural perspective. ISO 400. The image has the warmth and gentle contrast of analog film, feeling authentic and aspirational.',
        variables: [
            {
                name: 'product',
                label: 'Product Description',
                placeholder: 'your product',
                type: 'text'
            }
        ],
        tags: ['mood', 'coffee-makers', 'kitchen-tools', 'storage-jars', 'oil-bottles', 'kitchen', 'counter', 'lived-in', 'authentic']
    },
    {
        id: 'mood-integrated-kitchen-appliance',
        name: 'The Integrated Kitchen Appliance (Eye-Level)',
        description: 'Best for: Blenders, coffee makers, toasters, kettles',
        category: 'mood',
        template: 'An eye-level, natural perspective lifestyle photo of {product} sitting on a light oak countertop. The background is a minimalist kitchen with handmade, matte cream ceramic tiles. The scene is styled in a "lived-in" but tidy manner, with a wooden bowl of fresh lemons and a half-read cookbook nearby. The lighting is soft and natural, as if from a large kitchen window. Photographed with a Fujifilm X-T4 and a 35mm f/1.4 lens. ISO 400. The photo has the warm, gentle contrast of Kodak Gold 200 film, feeling authentic and aspirational.',
        variables: [
            {
                name: 'product',
                label: 'Product Description',
                placeholder: 'your product',
                type: 'text'
            }
        ],
        tags: ['mood', 'blenders', 'coffee-makers', 'toasters', 'kettles', 'kitchen-appliance', 'eye-level', 'natural', 'integrated']
    },
    {
        id: 'mood-minimalist-food-prep',
        name: 'The Minimalist Food Prep (Top-Down)',
        description: 'Best for: Cutting boards, knives, graters, food processors',
        category: 'mood',
        template: 'A clean, minimalist top-down view of a food preparation scene. {product} is on a large, end-grain wooden cutting board. It\'s styled with a few, perfectly sliced vegetables (e.g., carrots, zucchini) and a sprig of fresh herbs. The lighting is bright and even. Photographed from directly above with a 50mm lens. ISO 100. The composition is highly graphic and clean, focusing on the beauty of fresh ingredients and quality tools.',
        variables: [
            {
                name: 'product',
                label: 'Product Description',
                placeholder: 'your product',
                type: 'text'
            }
        ],
        tags: ['mood', 'cutting-boards', 'knives', 'graters', 'food-processors', 'food-prep', 'top-down', 'minimalist', 'clean']
    }
];