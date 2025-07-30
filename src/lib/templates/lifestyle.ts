import { PromptTemplate } from '@/types/templates';

export const lifestyleTemplates: PromptTemplate[] = [
    {
        id: 'mood-wabi-sabi-living-space',
        name: 'The Wabi-Sabi Living Space (For Centerpiece Items)',
        description: 'Best for: Vases, bowls, trays, larger decorative items',
        category: 'mood',
        template:
            'A wide, atmospheric shot of a Japandi-style living room. In the center, {product} sits on a low, solid oak coffee table with a visible grain. The background features a linen-paneled folding screen and a minimalist wooden chair. The entire scene is bathed in warm, low, ambient light, creating a peaceful and intimate feeling. Photographed with a Leica M11 and a 50mm Summilux f/1.4 lens. ISO 400. The photo has a cinematic quality with a very soft focus, noticeable but fine film grain, and a wabi-sabi appreciation for natural materials and imperfection.',
        variables: [
            {
                name: 'product',
                label: 'Product Description',
                placeholder: 'your product',
                type: 'text'
            }
        ],
        tags: [
            'mood',
            'vases',
            'bowls',
            'trays',
            'decorative-items',
            'wabi-sabi',
            'japandi',
            'living-room',
            'centerpiece',
            'wide-shot'
        ]
    },
    {
        id: 'mood-minimalist-bedroom-sanctuary',
        name: 'The Minimalist Bedroom Sanctuary (For Textiles & Bedside Items)',
        description: 'Best for: Bedding, throws, small trays, personal care items',
        category: 'mood',
        template:
            'A serene bedroom scene focused on {product} placed on a low wooden bench at the foot of a bed. The bed is unmade with crumpled, natural-colored raw linen sheets. The walls are textured with a warm beige plaster. A small potted plant sits in the corner. The lighting is soft, ethereal morning light filtering through a sheer roller blind. Photographed with a Contax 645 on Kodak Portra 400 film, using an 80mm f/2.0 lens. ISO 400. The image is slightly overexposed, creating a dreamy, bright, and utterly calm atmosphere with a beautiful analog texture.',
        variables: [
            {
                name: 'product',
                label: 'Product Description',
                placeholder: 'your product',
                type: 'text'
            }
        ],
        tags: [
            'mood',
            'bedding',
            'throws',
            'trays',
            'personal-care',
            'bedroom',
            'minimalist',
            'textiles',
            'sanctuary',
            'linen'
        ]
    },
    {
        id: 'mood-japandi-shelf-detail',
        name: 'The Japandi Shelf Detail (For Single Decor Items)',
        description: 'Best for: Small sculptures, vases, candles, planters',
        category: 'mood',
        template:
            'A vertical composition showing {product} styled on a minimalist light oak wall shelf. The wall behind is a warm, off-white plaster. The shelf also holds a small stack of books with muted spines and a single, small, unglazed ceramic object. The lighting is soft and even, as if from ambient room light. Photographed with a Hasselblad X1D II on a 90mm f/3.2 lens. ISO 200. The composition is balanced and asymmetrical, reflecting a serene, organized, and design-conscious space. Subtle film grain.',
        variables: [
            {
                name: 'product',
                label: 'Product Description',
                placeholder: 'your product',
                type: 'text'
            }
        ],
        tags: [
            'mood',
            'sculptures',
            'vases',
            'candles',
            'planters',
            'japandi',
            'shelf',
            'vertical',
            'minimalist',
            'wall-shelf'
        ]
    },
    {
        id: 'mood-soft-focus-lifestyle',
        name: 'The Soft Focus Lifestyle (For Any Product to Add Context)',
        description: 'Best for: Any product where showing a human context is beneficial',
        category: 'mood',
        template:
            'A lifestyle shot focusing on {product} on a small side table. In the immediate, soft-focus foreground, the arm of a person wearing a cream-colored cashmere sweater is visible, holding a ceramic mug. The background is a softly blurred living space with warm, ambient light. The focus is critically sharp on the product, letting the human element add context and warmth without being distracting. Shot with an 85mm f/1.4 lens. ISO 400. The mood is intimate, comfortable, and serene. Shot on Kodak Gold 200 film style.',
        variables: [
            {
                name: 'product',
                label: 'Product Description',
                placeholder: 'your product',
                type: 'text'
            }
        ],
        tags: ['mood', 'lifestyle', 'human-context', 'soft-focus', 'intimate', 'comfortable', 'side-table', 'warm']
    },
    {
        id: 'mood-cozy-corner-reading-nook',
        name: 'The Cozy Corner Reading Nook (Lifestyle)',
        description: 'Best for: Mugs, throws, lamps, small tables',
        category: 'mood',
        template:
            'A lifestyle scene of a cozy reading nook. {product} is placed on a small wooden stool next to a comfortable armchair with a cashmere throw draped over it. An open book rests nearby. The light is warm and soft, as if from a nearby fireplace just out of frame. Photographed with a Leica Q2, 28mm f/1.7 lens. ISO 800. The wide lens gives a sense of the intimate space, while the shallow depth of field keeps the focus on the product. The mood is warm, comfortable, and inviting.',
        variables: [
            {
                name: 'product',
                label: 'Product Description',
                placeholder: 'your product',
                type: 'text'
            }
        ],
        tags: ['mood', 'mugs', 'throws', 'lamps', 'small-tables', 'cozy', 'reading-nook', 'lifestyle', 'comfortable']
    }
];
