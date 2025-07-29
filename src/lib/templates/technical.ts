import { PromptTemplate } from '@/types/templates';

export const technicalTemplates: PromptTemplate[] = [
    {
        id: 'mood-textured-close-up',
        name: 'The Textured Close-Up (For Products with Detail)',
        description: 'Best for: Items with texture, intricate patterns, or high-quality material finishes',
        category: 'mood',
        template: 'An extreme close-up, macro shot featuring a detail of {product}. The product is placed on a highly textured, sand-colored linen cloth. The lighting is a single, soft, raking light from the side, designed to accentuate every fiber, grain, and surface imperfection in a beautiful way. Photographed with a Nikon Z7 and a 105mm f/2.8 macro lens. ISO 100. The depth of field is exceptionally shallow, with only a tiny slice of the product in perfect focus. The feel is tactile, intimate, and artisanal.',
        variables: [
            {
                name: 'product',
                label: 'Product Description',
                placeholder: 'your product',
                type: 'text'
            }
        ],
        tags: ['mood', 'textured', 'detailed', 'patterns', 'materials', 'macro', 'close-up', 'tactile', 'artisanal', 'shallow-dof']
    },
    {
        id: 'mood-woven-texture-close-up',
        name: 'The Woven Texture Close-Up (Macro)',
        description: 'Best for: Textiles (towels, blankets, bedding, napkins)',
        category: 'mood',
        template: 'An extreme macro detail shot of {product}, focusing on the fabric\'s texture. The lighting is a soft, raking side-light that highlights every individual fiber and the woven pattern of the material. The depth of field is exceptionally shallow, with only a small portion in razor-sharp focus, quickly falling off into a creamy blur. Photographed with a Nikon Z7 and a 105mm f/2.8 macro lens. ISO 100. The color palette is muted and natural. The image has a highly tactile, intimate, and artisanal quality.',
        variables: [
            {
                name: 'product',
                label: 'Product Description',
                placeholder: 'your product',
                type: 'text'
            }
        ],
        tags: ['mood', 'textiles', 'towels', 'blankets', 'bedding', 'napkins', 'woven', 'macro', 'texture', 'tactile']
    },
    {
        id: 'mood-sculptural-object-study',
        name: 'The Sculptural Object Study (Low Angle)',
        description: 'Best for: Vases, lamps, sculptures, speakers, small furniture',
        category: 'mood',
        template: 'A low-angle architectural photograph of {product} resting on a honed travertine floor. The low perspective gives the object a monumental, sculptural quality against a backdrop of a warm, beige plaster wall with a visible, rough texture. The lighting is dramatic, coming from a low, off-camera light source, casting a long, soft shadow upwards onto the wall. Photographed with a Hasselblad X2D and a 55mm f/2.5 lens. ISO 100. The image emphasizes clean lines and dramatic scale, with a subtle film grain for an analog feel.',
        variables: [
            {
                name: 'product',
                label: 'Product Description',
                placeholder: 'your product',
                type: 'text'
            }
        ],
        tags: ['mood', 'vases', 'lamps', 'sculptures', 'speakers', 'furniture', 'low-angle', 'sculptural', 'monumental', 'dramatic']
    },
    {
        id: 'mood-stacked-perspective',
        name: 'The Stacked Perspective (Straight On, Telephoto)',
        description: 'Best for: Stackable bowls, plates, storage containers',
        category: 'mood',
        template: 'A straight-on product shot of a stack of {product}. A long telephoto lens is used to compress the perspective, making the stack look graphic and architectural. The background is a seamless, warm grey paper. The lighting is a clean, single studio light source that creates a subtle gradient across the products and a soft shadow, defining their form. Photographed with a Canon R5 and a 70-200mm f/2.8 lens at 200mm. ISO 100. The image is clean, sharp, and has a strong graphic appeal.',
        variables: [
            {
                name: 'product',
                label: 'Product Description',
                placeholder: 'your product',
                type: 'text'
            }
        ],
        tags: ['mood', 'stackable-bowls', 'plates', 'storage-containers', 'stacked', 'telephoto', 'graphic', 'architectural']
    },
    {
        id: 'mood-in-context-shelf-diptych',
        name: 'The "In-Context" Shelf (Diptych)',
        description: 'Best for: Storage items, organizers, books, decor',
        category: 'mood',
        template: 'A diptych, two vertical panels. The left panel is a close-up, textural shot of {product}. The right panel is a wider shot showing the same product arranged neatly on a minimalist oak wall shelf in a serene, sunlit room. Photographed with a Fujifilm GFX 100S, ensuring consistent color and light across both panels. ISO 200. The format tells a story of both detail and application, feeling sophisticated and editorial.',
        variables: [
            {
                name: 'product',
                label: 'Product Description',
                placeholder: 'your product',
                type: 'text'
            }
        ],
        tags: ['mood', 'storage-items', 'organizers', 'books', 'decor', 'diptych', 'in-context', 'shelf', 'editorial']
    }
];