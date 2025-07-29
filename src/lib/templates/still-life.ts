import { PromptTemplate } from '@/types/templates';

export const stillLifeTemplates: PromptTemplate[] = [
    {
        id: 'mood-serene-morning-still-life',
        name: 'The Serene Morning Still Life (General Purpose)',
        description: 'Best for: Tableware, carafes, cups, small decor items',
        category: 'mood',
        template: 'An architectural still life photo featuring {product} placed on a round travertine side table. In the soft-focus background, the texture of a cream-colored boucle armchair is visible. The scene is styled with extreme minimalism. The scene is illuminated by soft, diffused morning light from a large, off-camera window, creating long, gentle shadows and a serene atmosphere. Photographed with a Hasselblad X2D and an 80mm f/2.8 lens. ISO 100. The image has the warm color science and subtle grain of Kodak Portra 160 film, with a soft, analog aesthetic. The overall mood is calm, sophisticated, and deeply tranquil.',
        variables: [
            {
                name: 'product',
                label: 'Product Description',
                placeholder: 'your product',
                type: 'text'
            }
        ],
        tags: ['mood', 'tableware', 'carafes', 'cups', 'decor', 'minimalist', 'morning-light', 'still-life', 'travertine', 'serene']
    },
    {
        id: 'mood-architectural-study',
        name: 'The Architectural Study (For Decor & Lighting)',
        description: 'Best for: Lamps, vases, decorative objects, books',
        category: 'mood',
        template: 'A minimalist interior lifestyle scene featuring {product} on a dark matte wood desk. The background is a clean wall with simple architectural paneling in an off-white color. An open art magazine and a pair of reading glasses are styled nearby. The lighting is soft and directional, as if from a single large window just out of frame, casting a single, soft-edged shadow. Photographed with a Fujifilm GFX 100S and a 63mm f/2.8 lens. ISO 200. The image has the muted tones and fine grain of Fujifilm Pro 400H film. The mood is quiet, intellectual, and considered.',
        variables: [
            {
                name: 'product',
                label: 'Product Description',
                placeholder: 'your product',
                type: 'text'
            }
        ],
        tags: ['mood', 'lamps', 'vases', 'decorative-objects', 'books', 'architectural', 'minimalist', 'intellectual', 'desk']
    },
    {
        id: 'mood-golden-hour-product-focus',
        name: 'The Golden Hour Product Focus (For Glassware & Translucent Items)',
        description: 'Best for: Glassware, carafes, products with interesting shapes or transparency',
        category: 'mood',
        template: 'A minimalist product photograph of {product} on a honed beige marble plinth. The scene is dramatically backlit by late afternoon golden hour light, causing the light to stream through the product and cast a long, warm, soft shadow across the surface. The background is a simple, out-of-focus plaster wall. Photographed with an 85mm f/1.4 lens to create a dreamy, compressed background and beautiful soft bokeh. ISO 100. The mood is warm, poetic, and focuses on the interplay between light and form.',
        variables: [
            {
                name: 'product',
                label: 'Product Description',
                placeholder: 'your product',
                type: 'text'
            }
        ],
        tags: ['mood', 'glassware', 'carafes', 'translucent', 'golden-hour', 'backlit', 'marble', 'shadow', 'bokeh']
    },
    {
        id: 'mood-profile-silhouette',
        name: 'The Profile Silhouette (Side View)',
        description: 'Best for: Glassware, carafes, bottles, products with a strong silhouette',
        category: 'mood',
        template: 'A minimalist profile shot of {product} against a simple, textured off-white wall. The product is strongly backlit by warm, golden hour light, creating a glowing "rim light" around its edges and casting beautiful, subtle light patterns (caustics) through the glass onto the surface. Photographed with a Leica M11 and a 75mm Noctilux lens at f/1.25. ISO 100. The composition is centered and focuses entirely on the product\'s elegant form and its interaction with light.',
        variables: [
            {
                name: 'product',
                label: 'Product Description',
                placeholder: 'your product',
                type: 'text'
            }
        ],
        tags: ['mood', 'glassware', 'carafes', 'bottles', 'silhouette', 'profile', 'side-view', 'backlit', 'rim-light']
    },
    {
        id: 'mood-hero-on-plinth',
        name: 'The "Hero" on a Plinth (Eye-Level)',
        description: 'Best for: Any single, high-value item you want to feel important',
        category: 'mood',
        template: 'A minimalist hero shot of {product} placed centrally on a cylindrical plaster plinth. The background is a seamless, hand-painted canvas in a muted terracotta color. The lighting is a single, large, diffused light source, wrapping gently around the product to define its shape while creating very soft shadows. Photographed with a Hasselblad X2D and a 135mm lens to create separation from the background. ISO 100. The mood is elevated, artful, and museum-quality.',
        variables: [
            {
                name: 'product',
                label: 'Product Description',
                placeholder: 'your product',
                type: 'text'
            }
        ],
        tags: ['mood', 'hero-shot', 'high-value', 'important', 'plinth', 'eye-level', 'elevated', 'museum-quality']
    }
];