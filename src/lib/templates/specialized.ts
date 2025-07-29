import { PromptTemplate } from '@/types/templates';

export const specializedTemplates: PromptTemplate[] = [
    {
        id: 'mood-artisanal-tabletop-setting',
        name: 'The Artisanal Tabletop Setting (For Full Tableware Sets)',
        description: 'Best for: Plates, bowls, cutlery, salt & pepper shakers',
        category: 'mood',
        template: 'A beautifully composed top-down shot of a minimalist table setting, featuring {product}. The surface is a light, warm-toned wooden table. The styling includes simple, natural elements like a few fresh blueberries and a half lemon on unglazed ceramic plates. A crumpled linen napkin rests to the side. The lighting is perfectly even and soft, as if from a large overhead softbox, creating almost no shadows. Photographed with a Canon 5D Mark IV and a 100mm macro lens. ISO 100. The focus is razor-sharp on the details, with a clean, editorial, yet warm and inviting feel.',
        variables: [
            {
                name: 'product',
                label: 'Product Description',
                placeholder: 'your product',
                type: 'text'
            }
        ],
        tags: ['mood', 'plates', 'bowls', 'cutlery', 'tableware', 'top-down', 'artisanal', 'table-setting', 'macro', 'editorial']
    },
    {
        id: 'mood-artisanal-breakfast-flat-lay',
        name: 'The Artisanal Breakfast Flat Lay (Top-Down)',
        description: 'Best for: Tableware, cutlery, breakfast foods, linens',
        category: 'mood',
        template: 'A beautifully composed top-down flat lay photo featuring {product}. The background is a heavily textured, oatmeal-colored waffle-weave placemat. The scene is styled for an artisanal breakfast with a slice of sourdough toast with avocado, a small ceramic bowl of yogurt, and scattered black sesame seeds. The lighting is perfectly even and soft, mimicking a bright overcast day, creating minimal, soft shadows. Photographed from directly above with a Canon 5D Mark IV and a 100mm macro lens. ISO 100. The composition is balanced using the rule of thirds, feeling both organized and natural.',
        variables: [
            {
                name: 'product',
                label: 'Product Description',
                placeholder: 'your product',
                type: 'text'
            }
        ],
        tags: ['mood', 'tableware', 'cutlery', 'breakfast', 'linens', 'flat-lay', 'top-down', 'artisanal', 'textured']
    },
    {
        id: 'mood-playful-nursery-flat-lay',
        name: 'The Playful Nursery Flat Lay (Top-Down)',
        description: 'Best for: Wooden toys, baby textiles, children\'s decor',
        category: 'mood',
        template: 'A charming top-down flat lay featuring {product} arranged on a soft, cream-colored wool rug. The composition is playful yet organized (knolling style), styled with other natural wooden blocks and a single dried leaf. The lighting is very soft and completely even, as if from a huge ceiling softbox, eliminating all harsh shadows. Photographed with a 50mm lens from directly overhead. ISO 200. The image feels warm, safe, and captures a design-conscious parent\'s aesthetic.',
        variables: [
            {
                name: 'product',
                label: 'Product Description',
                placeholder: 'your product',
                type: 'text'
            }
        ],
        tags: ['mood', 'wooden-toys', 'baby-textiles', 'childrens-decor', 'nursery', 'flat-lay', 'playful', 'knolling', 'safe']
    },
    {
        id: 'mood-serene-garden-evening',
        name: 'The Serene Garden Evening (Wide Angle)',
        description: 'Best for: Outdoor lanterns, portable grills, planters, outdoor textiles',
        category: 'mood',
        template: 'A wide, atmospheric shot of {product} on a minimalist gravel patio during the "blue hour" at dusk. The product, if a lantern, is the primary source of warm, glowing light in the scene. The background is a softly blurred garden with tall grasses. Photographed on a tripod with a Sony A7IV and a 35mm f/1.4 G Master lens. ISO 800. The image has a long exposure feel, capturing a deep, tranquil mood with a beautiful contrast between the cool blue ambient light and the warm light of the product.',
        variables: [
            {
                name: 'product',
                label: 'Product Description',
                placeholder: 'your product',
                type: 'text'
            }
        ],
        tags: ['mood', 'outdoor-lanterns', 'portable-grills', 'planters', 'outdoor-textiles', 'garden', 'evening', 'blue-hour', 'wide-angle']
    },
    {
        id: 'mood-unpacking-still-life',
        name: 'The "Unpacking" or "Unboxing" Still Life (Angled Top-Down)',
        description: 'Best for: Gift items, anything that comes in beautiful packaging',
        category: 'mood',
        template: 'An angled top-down shot capturing an "unboxing" moment. {product} is shown partially emerging from its elegant, recycled kraft paper packaging, with crinkled tissue paper and a simple linen ribbon artfully arranged around it. The surface is a light concrete floor. The lighting is soft and directional. Photographed with a 50mm lens, giving a natural, first-person perspective. ISO 200. The mood is one of anticipation, care, and thoughtful gifting.',
        variables: [
            {
                name: 'product',
                label: 'Product Description',
                placeholder: 'your product',
                type: 'text'
            }
        ],
        tags: ['mood', 'gift-items', 'packaging', 'unboxing', 'unpacking', 'angled-top-down', 'gifting', 'anticipation']
    }
];