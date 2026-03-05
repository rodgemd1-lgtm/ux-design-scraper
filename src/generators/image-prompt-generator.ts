import type {
  FullScrapeResult,
  ProjectContext,
  DesignTokens,
  TypographySystem,
  IconData,
} from '../shared/types';

// ===== Types =====

export interface ImagePrompt {
  id: string;
  category: ImagePromptCategory;
  prompt: string;
  negativePrompt: string;
  aspectRatio: string;
  style: string;
  tags: string[];
}

export interface MidjourneyPrompt extends ImagePrompt {
  version: string;
  quality: number;
  stylize: number;
  chaos: number;
}

export interface DALLEPrompt extends ImagePrompt {
  size: '1024x1024' | '1792x1024' | '1024x1792';
  model: 'dall-e-3';
  quality: 'standard' | 'hd';
}

export interface StableDiffusionPrompt extends ImagePrompt {
  cfgScale: number;
  steps: number;
  sampler: string;
  width: number;
  height: number;
  clipSkip: number;
  model: string;
}

export type ImagePromptCategory =
  | 'hero'
  | 'product'
  | 'background'
  | 'icon'
  | 'people'
  | 'abstract'
  | 'texture';

export interface ImagePromptSet {
  siteUrl: string;
  projectContext: ProjectContext;
  generatedAt: number;
  midjourney: MidjourneyPrompt[];
  dalle: DALLEPrompt[];
  stableDiffusion: StableDiffusionPrompt[];
  totalPrompts: number;
  colorPalette: string[];
}

// ===== Helpers =====

function uid(): string {
  return `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function extractTopColors(tokens: DesignTokens, max = 5): string[] {
  return tokens.colors
    .filter((c) => c.value.startsWith('#') || c.value.startsWith('rgb'))
    .sort((a, b) => b.count - a.count)
    .slice(0, max)
    .map((c) => c.value);
}

function colorPhraseForPrompt(colors: string[]): string {
  if (colors.length === 0) return '';
  const hexColors = colors.filter((c) => c.startsWith('#'));
  if (hexColors.length === 0) return '';
  return `in shades of ${hexColors.join(', ')}`;
}

function mapDesignStyleToAesthetic(style: string): string {
  const styleMap: Record<string, string> = {
    luxury: 'opulent, refined, high-end editorial, gold accents, serif typography',
    minimal: 'clean, whitespace-heavy, Swiss design, geometric, Dieter Rams inspired',
    playful: 'vibrant, whimsical, rounded shapes, hand-drawn elements, cheerful',
    corporate: 'professional, trustworthy, structured grid, blue tones, authoritative',
    brutalist: 'raw, monospaced type, stark contrasts, unconventional layout, anti-design',
    organic: 'natural textures, earth tones, flowing shapes, botanical elements',
    retro: 'vintage aesthetics, halftone dots, muted colors, nostalgic typography',
    futuristic: 'neon accents, dark backgrounds, glassmorphism, holographic, sci-fi',
    editorial: 'magazine layout, dramatic typography, high contrast, photographic',
    startup: 'gradient backgrounds, isometric illustrations, modern sans-serif, energetic',
  };
  return styleMap[style.toLowerCase()] || 'modern, professional, clean design aesthetic';
}

function mapIndustryToSubjects(industry: string): string[] {
  const industryMap: Record<string, string[]> = {
    technology: ['circuit boards', 'code on screens', 'sleek devices', 'data visualization', 'abstract networks'],
    healthcare: ['medical professionals', 'wellness imagery', 'clean lab environments', 'nature healing', 'caring hands'],
    finance: ['skyline cityscapes', 'abstract growth charts', 'luxury office spaces', 'handshake moments', 'golden hour lighting'],
    education: ['learning environments', 'books and knowledge', 'collaborative spaces', 'lightbulb moments', 'growth metaphors'],
    ecommerce: ['product flat lays', 'unboxing moments', 'lifestyle photography', 'shopping experiences', 'curated collections'],
    food: ['artful plating', 'ingredient close-ups', 'kitchen action shots', 'farm-to-table scenes', 'steam and texture'],
    travel: ['panoramic landscapes', 'cultural moments', 'adventure activities', 'luxury accommodations', 'golden hour destinations'],
    fitness: ['athletic motion', 'determination portraits', 'equipment details', 'outdoor training', 'transformation moments'],
    realestate: ['architectural interiors', 'luxury living spaces', 'neighborhood aerials', 'dream home moments', 'natural light rooms'],
    saas: ['dashboard interfaces', 'team collaboration', 'productivity moments', 'clean workspaces', 'abstract data flow'],
  };
  return industryMap[industry.toLowerCase()] || ['professional workspace', 'modern environment', 'people collaborating', 'abstract patterns', 'clean surfaces'];
}

function getPrimaryFont(typography: TypographySystem): string {
  return typography.fontFamilies[0]?.family || 'modern sans-serif';
}

function getIconStyle(icons: IconData[]): string {
  if (icons.length === 0) return 'minimal line icons, consistent stroke width';
  const avgSize = icons.reduce((s, i) => s + i.size.width, 0) / icons.length;
  const hasFilledIcons = icons.some((i) => i.svg.includes('fill='));
  if (hasFilledIcons && avgSize > 32) return 'bold filled icons, rounded corners, thick strokes';
  if (avgSize < 20) return 'delicate thin-line icons, hairline stroke, minimalist';
  return 'medium-weight line icons, consistent 2px stroke, geometric';
}

// ===== Standard Negative Prompts =====

const STANDARD_NEGATIVES = {
  photo: 'blurry, low quality, pixelated, watermark, text overlay, stock photo watermark, grainy, overexposed, underexposed, distorted, ugly, deformed',
  illustration: 'photo-realistic, blurry, low quality, pixelated, watermark, text, ugly, deformed, disfigured, bad anatomy, bad proportions',
  abstract: 'text, words, letters, numbers, watermark, low quality, blurry, ugly, distorted, cluttered, busy, noisy',
  icon: 'photorealistic, complex, cluttered, text, words, blurry, low quality, 3d, shadows, gradients, busy background',
  people: 'deformed, disfigured, bad anatomy, bad proportions, extra limbs, missing limbs, blurry, low quality, watermark, text, ugly face, distorted features',
};

// ===== Midjourney Generator =====

export function generateMidjourneyPrompts(
  scrapeResult: FullScrapeResult,
  projectContext: ProjectContext
): MidjourneyPrompt[] {
  const colors = extractTopColors(scrapeResult.designTokens);
  const colorPhrase = colorPhraseForPrompt(colors);
  const aesthetic = mapDesignStyleToAesthetic(projectContext.designStyle);
  const subjects = mapIndustryToSubjects(projectContext.industry);
  const font = getPrimaryFont(scrapeResult.typography);
  const iconStyle = getIconStyle(scrapeResult.icons);
  const prompts: MidjourneyPrompt[] = [];

  // Hero section prompts (4)
  const heroPrompts = [
    `Cinematic hero image for a ${projectContext.industry} website, ${aesthetic}, ultra-wide composition showing ${subjects[0]}, professional lighting with volumetric rays, ${colorPhrase}, 8k resolution, editorial quality --ar 21:9 --v 6.1 --q 2 --s 750`,
    `Abstract hero background for ${projectContext.industry} brand, fluid gradient mesh ${colorPhrase}, organic flowing shapes, depth of field bokeh effect, premium ${projectContext.designStyle} aesthetic, clean and modern --ar 16:9 --v 6.1 --q 2 --s 500`,
    `Dramatic overhead establishing shot for ${projectContext.industry} landing page, ${subjects[1]}, dramatic lighting with deep shadows, ${aesthetic}, ${colorPhrase}, photographic quality --ar 21:9 --v 6.1 --q 2 --s 850`,
    `Split-screen hero composition, left side ${subjects[2]}, right side abstract geometric elements ${colorPhrase}, ${aesthetic}, editorial layout, professional photography meets graphic design --ar 16:9 --v 6.1 --q 2 --s 600`,
  ];

  heroPrompts.forEach((prompt, i) => {
    prompts.push({
      id: uid(),
      category: 'hero',
      prompt,
      negativePrompt: STANDARD_NEGATIVES.photo,
      aspectRatio: i === 0 || i === 2 ? '21:9' : '16:9',
      style: aesthetic,
      tags: ['hero', 'landing-page', projectContext.industry],
      version: '6.1',
      quality: 2,
      stylize: i === 0 ? 750 : i === 2 ? 850 : i === 1 ? 500 : 600,
      chaos: 0,
    });
  });

  // Product photography prompts (4)
  const productPrompts = [
    `Professional product photography for ${projectContext.industry}, ${subjects[3]} on clean surface, studio lighting with soft shadows, ${colorPhrase} accent backdrop, commercial quality, minimalist composition --ar 1:1 --v 6.1 --q 2 --s 400`,
    `Lifestyle product shot for ${projectContext.industry}, ${subjects[4]} in natural setting, warm ambient light, shallow depth of field, ${aesthetic}, authentic and aspirational --ar 4:5 --v 6.1 --q 2 --s 550`,
    `Flat lay arrangement of ${projectContext.industry} products and tools, overhead view, ${colorPhrase} color coordination, geometric arrangement on textured surface, editorial styling --ar 1:1 --v 6.1 --q 2 --s 500`,
    `Close-up detail shot highlighting texture and quality, ${subjects[0]}, macro photography, ${colorPhrase}, bokeh background, premium ${projectContext.designStyle} feel, studio conditions --ar 3:4 --v 6.1 --q 2 --s 600`,
  ];

  productPrompts.forEach((prompt, i) => {
    const ratios = ['1:1', '4:5', '1:1', '3:4'];
    prompts.push({
      id: uid(),
      category: 'product',
      prompt,
      negativePrompt: STANDARD_NEGATIVES.photo,
      aspectRatio: ratios[i],
      style: 'product photography',
      tags: ['product', 'commercial', projectContext.industry],
      version: '6.1',
      quality: 2,
      stylize: [400, 550, 500, 600][i],
      chaos: 0,
    });
  });

  // Background texture/pattern prompts (4)
  const bgPrompts = [
    `Seamless tileable abstract pattern, ${aesthetic}, subtle geometric shapes ${colorPhrase}, noise texture overlay, premium wallpaper quality, low contrast, muted tones --ar 1:1 --v 6.1 --q 2 --s 300 --tile`,
    `Organic gradient mesh background, soft color transitions ${colorPhrase}, silk-like fabric texture, out of focus light leaks, ethereal and calming, ${projectContext.designStyle} aesthetic --ar 16:9 --v 6.1 --q 2 --s 400`,
    `Architectural detail texture for web background, subtle ${projectContext.designStyle} pattern, low-key monochromatic ${colorPhrase}, barely visible geometric grid, clean and minimal --ar 1:1 --v 6.1 --q 2 --s 200 --tile`,
    `Abstract topographic contour map pattern ${colorPhrase}, thin line work on dark background, data visualization aesthetic, modern generative art, clean and precise --ar 16:9 --v 6.1 --q 2 --s 450`,
  ];

  bgPrompts.forEach((prompt, i) => {
    prompts.push({
      id: uid(),
      category: 'background',
      prompt,
      negativePrompt: STANDARD_NEGATIVES.abstract,
      aspectRatio: i % 2 === 0 ? '1:1' : '16:9',
      style: 'pattern/texture',
      tags: ['background', 'texture', 'pattern', 'seamless'],
      version: '6.1',
      quality: 2,
      stylize: [300, 400, 200, 450][i],
      chaos: i === 3 ? 15 : 0,
    });
  });

  // Icon set prompts (3)
  const iconPrompts = [
    `Icon set design, ${iconStyle}, ${projectContext.industry} themed, 24 icons in a grid layout, ${colorPhrase}, consistent visual weight, pixel-perfect alignment, white background --ar 1:1 --v 6.1 --q 2 --s 250`,
    `Navigation icon collection, ${iconStyle}, universal web UI icons (home, search, menu, user, settings, notifications), ${colorPhrase}, vector-style flat design, uniform padding --ar 1:1 --v 6.1 --q 2 --s 200`,
    `Feature illustration icon set for ${projectContext.industry}, ${iconStyle} but slightly more detailed, each icon in a ${colorPhrase} circle badge, 12 icons grid, isometric perspective --ar 1:1 --v 6.1 --q 2 --s 350`,
  ];

  iconPrompts.forEach((prompt) => {
    prompts.push({
      id: uid(),
      category: 'icon',
      prompt,
      negativePrompt: STANDARD_NEGATIVES.icon,
      aspectRatio: '1:1',
      style: iconStyle,
      tags: ['icons', 'ui', 'icon-set'],
      version: '6.1',
      quality: 2,
      stylize: 250,
      chaos: 0,
    });
  });

  // Team/people photo prompts (3)
  const audienceDesc = projectContext.targetAudience || 'professionals';
  const peoplePrompts = [
    `Diverse team of ${audienceDesc} collaborating in modern workspace, ${aesthetic}, candid moment, natural expressions, soft natural light from large windows, ${colorPhrase} accent elements in environment, editorial portrait quality --ar 3:2 --v 6.1 --q 2 --s 500`,
    `Portrait of confident ${audienceDesc.split(',')[0] || 'professional'}, environmental portrait in ${projectContext.industry} setting, shallow depth of field, ${colorPhrase} color grading, authentic and approachable, lifestyle photography --ar 4:5 --v 6.1 --q 2 --s 600`,
    `${audienceDesc} using ${projectContext.industry} product or service, candid lifestyle moment, natural setting, warm color grading ${colorPhrase}, documentary-style photography, authentic emotion --ar 16:9 --v 6.1 --q 2 --s 550`,
  ];

  peoplePrompts.forEach((prompt, i) => {
    const ratios = ['3:2', '4:5', '16:9'];
    prompts.push({
      id: uid(),
      category: 'people',
      prompt,
      negativePrompt: STANDARD_NEGATIVES.people,
      aspectRatio: ratios[i],
      style: 'lifestyle photography',
      tags: ['people', 'team', 'lifestyle', audienceDesc],
      version: '6.1',
      quality: 2,
      stylize: [500, 600, 550][i],
      chaos: 0,
    });
  });

  // Abstract/decorative element prompts (4)
  const abstractPrompts = [
    `Abstract 3D shape composition, floating geometric forms ${colorPhrase}, glass and metallic materials, studio lighting with caustics, ${aesthetic}, clean background, depth of field --ar 1:1 --v 6.1 --q 2 --s 700`,
    `Generative art piece, flowing particle system ${colorPhrase}, organic curves meeting geometric precision, dark background, ${projectContext.designStyle} aesthetic, mesmerizing and elegant --ar 16:9 --v 6.1 --q 2 --s 800 --c 20`,
    `Abstract data visualization art, connected nodes and flowing lines ${colorPhrase}, constellation-like pattern on dark background, ${aesthetic}, subtle glow effects, technical beauty --ar 21:9 --v 6.1 --q 2 --s 600`,
    `Minimalist decorative element, single organic shape ${colorPhrase}, frosted glass material, subtle shadow, clean white background, ${aesthetic}, perfect for section divider --ar 3:1 --v 6.1 --q 2 --s 350`,
  ];

  abstractPrompts.forEach((prompt, i) => {
    const ratios = ['1:1', '16:9', '21:9', '3:1'];
    prompts.push({
      id: uid(),
      category: 'abstract',
      prompt,
      negativePrompt: STANDARD_NEGATIVES.abstract,
      aspectRatio: ratios[i],
      style: 'abstract art',
      tags: ['abstract', 'decorative', '3d', 'generative'],
      version: '6.1',
      quality: 2,
      stylize: [700, 800, 600, 350][i],
      chaos: i === 1 ? 20 : 0,
    });
  });

  return prompts;
}

// ===== DALL-E Generator =====

export function generateDALLEPrompts(
  scrapeResult: FullScrapeResult,
  projectContext: ProjectContext
): DALLEPrompt[] {
  const colors = extractTopColors(scrapeResult.designTokens);
  const colorPhrase = colorPhraseForPrompt(colors);
  const aesthetic = mapDesignStyleToAesthetic(projectContext.designStyle);
  const subjects = mapIndustryToSubjects(projectContext.industry);
  const iconStyle = getIconStyle(scrapeResult.icons);
  const prompts: DALLEPrompt[] = [];

  // DALL-E optimized prompts are more descriptive and natural language
  const dalleCatalog: {
    category: ImagePromptCategory;
    prompt: string;
    negative: string;
    size: DALLEPrompt['size'];
    quality: DALLEPrompt['quality'];
  }[] = [
    // Hero (4)
    {
      category: 'hero',
      prompt: `A cinematic wide-angle photograph of ${subjects[0]} for a ${projectContext.industry} website hero section. The scene is lit with dramatic volumetric lighting, creating depth and atmosphere. The color palette uses ${colorPhrase}. The overall aesthetic is ${aesthetic}. Ultra high resolution, editorial quality, professional commercial photography.`,
      negative: STANDARD_NEGATIVES.photo,
      size: '1792x1024',
      quality: 'hd',
    },
    {
      category: 'hero',
      prompt: `An abstract gradient background for a premium ${projectContext.industry} website. Fluid organic shapes blend together ${colorPhrase}, with subtle noise texture and light bokeh effects. The style is ${projectContext.designStyle}, modern, and sophisticated. Clean enough to overlay text on top.`,
      negative: STANDARD_NEGATIVES.abstract,
      size: '1792x1024',
      quality: 'hd',
    },
    {
      category: 'hero',
      prompt: `A dramatic aerial perspective showing ${subjects[1]} for a ${projectContext.industry} brand. Golden hour lighting with long shadows creating visual depth. Color grading ${colorPhrase}. The composition follows the rule of thirds with clear focal points. ${aesthetic} photography style.`,
      negative: STANDARD_NEGATIVES.photo,
      size: '1792x1024',
      quality: 'hd',
    },
    {
      category: 'hero',
      prompt: `A split-composition hero image: the left half shows ${subjects[2]} in a real environment, the right half transitions into abstract geometric patterns ${colorPhrase}. The blend is seamless and artistic. ${aesthetic} design philosophy applied throughout.`,
      negative: STANDARD_NEGATIVES.photo,
      size: '1792x1024',
      quality: 'hd',
    },
    // Product (3)
    {
      category: 'product',
      prompt: `A professional studio product photograph for a ${projectContext.industry} company. ${subjects[3]} is centered on a clean surface with controlled studio lighting creating soft shadows. The backdrop features subtle ${colorPhrase} accents. Commercial quality, minimalist styling, sharp focus.`,
      negative: STANDARD_NEGATIVES.photo,
      size: '1024x1024',
      quality: 'hd',
    },
    {
      category: 'product',
      prompt: `A lifestyle product photograph showing ${subjects[4]} in a natural, aspirational setting. Warm ambient lighting, shallow depth of field for professional bokeh. The environment complements the ${projectContext.designStyle} brand aesthetic. ${colorPhrase} color coordination throughout.`,
      negative: STANDARD_NEGATIVES.photo,
      size: '1024x1792',
      quality: 'hd',
    },
    {
      category: 'product',
      prompt: `An overhead flat lay arrangement featuring ${projectContext.industry} products and accessories. Items are artfully arranged in a geometric pattern on a textured surface. Color palette ${colorPhrase}. Editorial styling with careful attention to negative space. Magazine-quality photography.`,
      negative: STANDARD_NEGATIVES.photo,
      size: '1024x1024',
      quality: 'hd',
    },
    // Background (3)
    {
      category: 'background',
      prompt: `A seamless abstract pattern suitable for a website background. Subtle geometric shapes ${colorPhrase} with very low contrast, creating a refined texture. ${aesthetic}. The pattern is subtle enough for text to be readable on top. Premium wallpaper quality.`,
      negative: STANDARD_NEGATIVES.abstract,
      size: '1024x1024',
      quality: 'standard',
    },
    {
      category: 'background',
      prompt: `An ethereal gradient mesh background with soft, flowing color transitions ${colorPhrase}. The texture resembles silk fabric with subtle light leaks. Calming and sophisticated, perfect for a ${projectContext.designStyle} web design. No text, no objects, pure abstract beauty.`,
      negative: STANDARD_NEGATIVES.abstract,
      size: '1792x1024',
      quality: 'hd',
    },
    {
      category: 'background',
      prompt: `A topographic contour map pattern with thin lines ${colorPhrase} on a deep dark background. Modern data visualization aesthetic meets generative art. Clean, precise line work with subtle depth variation. Perfect as a dark-mode website background section.`,
      negative: STANDARD_NEGATIVES.abstract,
      size: '1792x1024',
      quality: 'standard',
    },
    // Icon (2)
    {
      category: 'icon',
      prompt: `A grid of 16 ${iconStyle} icons for a ${projectContext.industry} website. Icons include common UI elements and industry-specific symbols. Each icon uses ${colorPhrase} on white background. Consistent stroke width, pixel-perfect alignment, uniform padding. Clean vector illustration style.`,
      negative: STANDARD_NEGATIVES.icon,
      size: '1024x1024',
      quality: 'hd',
    },
    {
      category: 'icon',
      prompt: `A set of 12 feature illustration icons for ${projectContext.industry}. Each icon sits inside a rounded ${colorPhrase} badge. ${iconStyle} but with slightly more detail. Isometric perspective for depth. Uniform size and spacing. Modern flat design with subtle shadows.`,
      negative: STANDARD_NEGATIVES.icon,
      size: '1024x1024',
      quality: 'hd',
    },
    // People (2)
    {
      category: 'people',
      prompt: `A candid photograph of a diverse group of ${projectContext.targetAudience} collaborating in a modern, well-lit workspace. Natural expressions showing genuine engagement. Soft natural window light. Environment features ${colorPhrase} accent elements. ${aesthetic}. Editorial portrait quality, authentic and warm.`,
      negative: STANDARD_NEGATIVES.people,
      size: '1792x1024',
      quality: 'hd',
    },
    {
      category: 'people',
      prompt: `An environmental portrait of a confident ${projectContext.targetAudience.split(',')[0] || 'professional'} in a ${projectContext.industry} setting. Shallow depth of field creates beautiful bokeh. ${colorPhrase} color grading. The subject appears approachable and authentic. Lifestyle photography with documentary sensibility.`,
      negative: STANDARD_NEGATIVES.people,
      size: '1024x1792',
      quality: 'hd',
    },
    // Abstract (3)
    {
      category: 'abstract',
      prompt: `A composition of floating 3D geometric shapes ${colorPhrase}. Materials include frosted glass, brushed metal, and matte surfaces. Dramatic studio lighting creates caustic light patterns. ${aesthetic}. Clean dark background with subtle reflections. Rendered in ultra-high quality.`,
      negative: STANDARD_NEGATIVES.abstract,
      size: '1024x1024',
      quality: 'hd',
    },
    {
      category: 'abstract',
      prompt: `A generative art piece featuring a flowing particle system ${colorPhrase}. Thousands of tiny particles form organic curves meeting geometric precision. Dark background. ${projectContext.designStyle} aesthetic. Mesmerizing, elegant, and technically beautiful. Subtle glow and light bloom effects.`,
      negative: STANDARD_NEGATIVES.abstract,
      size: '1792x1024',
      quality: 'hd',
    },
    {
      category: 'abstract',
      prompt: `A minimalist decorative element: a single elegant organic shape ${colorPhrase} with frosted glass material effect. Subtle cast shadow on white background. ${aesthetic}. Perfect as a section divider or accent graphic for a premium ${projectContext.industry} website.`,
      negative: STANDARD_NEGATIVES.abstract,
      size: '1792x1024',
      quality: 'standard',
    },
  ];

  dalleCatalog.forEach((item) => {
    prompts.push({
      id: uid(),
      category: item.category,
      prompt: item.prompt,
      negativePrompt: item.negative,
      aspectRatio: item.size === '1024x1024' ? '1:1' : item.size === '1792x1024' ? '16:9' : '9:16',
      style: aesthetic,
      tags: [item.category, projectContext.industry, projectContext.designStyle],
      size: item.size,
      model: 'dall-e-3',
      quality: item.quality,
    });
  });

  return prompts;
}

// ===== Stable Diffusion Generator =====

export function generateStableDiffusionPrompts(
  scrapeResult: FullScrapeResult,
  projectContext: ProjectContext
): StableDiffusionPrompt[] {
  const colors = extractTopColors(scrapeResult.designTokens);
  const colorPhrase = colorPhraseForPrompt(colors);
  const aesthetic = mapDesignStyleToAesthetic(projectContext.designStyle);
  const subjects = mapIndustryToSubjects(projectContext.industry);
  const iconStyle = getIconStyle(scrapeResult.icons);
  const prompts: StableDiffusionPrompt[] = [];

  const sdCatalog: {
    category: ImagePromptCategory;
    prompt: string;
    negative: string;
    cfg: number;
    steps: number;
    sampler: string;
    w: number;
    h: number;
    clip: number;
    model: string;
  }[] = [
    // Hero (4)
    {
      category: 'hero',
      prompt: `(masterpiece, best quality, ultra-detailed:1.3), cinematic hero image, ${subjects[0]}, ${projectContext.industry} website, ${aesthetic}, volumetric lighting, dramatic rays, ${colorPhrase}, 8k resolution, editorial photography, professional composition, (sharp focus:1.2), bokeh background`,
      negative: `(${STANDARD_NEGATIVES.photo}:1.3), (worst quality, low quality:1.4), nsfw`,
      cfg: 7.5, steps: 35, sampler: 'DPM++ 2M Karras', w: 1344, h: 576, clip: 2, model: 'SDXL 1.0',
    },
    {
      category: 'hero',
      prompt: `(masterpiece, best quality:1.2), abstract fluid gradient mesh, organic flowing shapes, ${colorPhrase}, noise texture, bokeh light effects, premium ${projectContext.designStyle} aesthetic, modern, clean, sophisticated, web design background`,
      negative: `(${STANDARD_NEGATIVES.abstract}:1.3), (worst quality, low quality:1.4), realistic photo, person`,
      cfg: 8, steps: 30, sampler: 'Euler a', w: 1216, h: 832, clip: 2, model: 'SDXL 1.0',
    },
    {
      category: 'hero',
      prompt: `(masterpiece, best quality, ultra-detailed:1.3), dramatic overhead shot, ${subjects[1]}, ${projectContext.industry}, golden hour lighting, deep shadows, ${aesthetic}, ${colorPhrase}, professional photography, wide angle, (cinematic:1.2)`,
      negative: `(${STANDARD_NEGATIVES.photo}:1.3), (worst quality, low quality:1.4), nsfw, text, watermark`,
      cfg: 7, steps: 35, sampler: 'DPM++ 2M Karras', w: 1344, h: 576, clip: 2, model: 'SDXL 1.0',
    },
    {
      category: 'hero',
      prompt: `(masterpiece:1.2), split composition, left side realistic ${subjects[2]}, right side abstract geometric elements, ${colorPhrase}, ${aesthetic}, editorial layout, seamless transition, professional quality`,
      negative: `(${STANDARD_NEGATIVES.photo}:1.3), (worst quality:1.4), nsfw, ugly, deformed`,
      cfg: 7.5, steps: 40, sampler: 'DPM++ SDE Karras', w: 1216, h: 832, clip: 2, model: 'SDXL 1.0',
    },
    // Product (3)
    {
      category: 'product',
      prompt: `(masterpiece, best quality:1.2), professional product photography, ${subjects[3]}, clean surface, studio lighting, soft shadows, ${colorPhrase} accent backdrop, commercial quality, minimalist, (sharp focus:1.3), center composition`,
      negative: `(${STANDARD_NEGATIVES.photo}:1.3), (worst quality:1.4), cluttered background, nsfw`,
      cfg: 7, steps: 30, sampler: 'DPM++ 2M Karras', w: 1024, h: 1024, clip: 2, model: 'SDXL 1.0',
    },
    {
      category: 'product',
      prompt: `(masterpiece, best quality:1.2), lifestyle product shot, ${subjects[4]}, natural setting, warm ambient light, (shallow depth of field:1.3), bokeh, ${colorPhrase}, authentic, aspirational, ${projectContext.designStyle}`,
      negative: `(${STANDARD_NEGATIVES.photo}:1.3), (worst quality:1.4), nsfw, studio, artificial`,
      cfg: 7.5, steps: 30, sampler: 'Euler a', w: 832, h: 1216, clip: 2, model: 'SDXL 1.0',
    },
    {
      category: 'product',
      prompt: `(masterpiece:1.2), flat lay overhead photography, ${projectContext.industry} products, geometric arrangement, textured surface, ${colorPhrase}, editorial styling, negative space, magazine quality, (sharp focus:1.3)`,
      negative: `(${STANDARD_NEGATIVES.photo}:1.3), (worst quality:1.4), person, face, nsfw`,
      cfg: 7, steps: 30, sampler: 'DPM++ 2M Karras', w: 1024, h: 1024, clip: 2, model: 'SDXL 1.0',
    },
    // Background (3)
    {
      category: 'background',
      prompt: `(best quality:1.2), seamless tileable abstract pattern, ${aesthetic}, subtle geometric shapes, ${colorPhrase}, noise texture, low contrast, muted tones, premium wallpaper, web background, (clean:1.3)`,
      negative: `(${STANDARD_NEGATIVES.abstract}:1.3), (worst quality:1.4), complex, realistic, photo, person`,
      cfg: 8, steps: 25, sampler: 'Euler a', w: 1024, h: 1024, clip: 2, model: 'SDXL 1.0',
    },
    {
      category: 'background',
      prompt: `(masterpiece:1.2), organic gradient mesh background, soft color transitions, ${colorPhrase}, silk texture, ethereal light leaks, ${projectContext.designStyle}, calming, sophisticated, no objects, pure abstract`,
      negative: `(${STANDARD_NEGATIVES.abstract}:1.3), (worst quality:1.4), person, face, text, realistic, photo`,
      cfg: 9, steps: 30, sampler: 'DPM++ SDE Karras', w: 1216, h: 832, clip: 2, model: 'SDXL 1.0',
    },
    {
      category: 'background',
      prompt: `(best quality:1.2), topographic contour lines, thin precise linework, ${colorPhrase}, dark background, data visualization art, generative design, modern, technical beauty, subtle depth variation`,
      negative: `(${STANDARD_NEGATIVES.abstract}:1.3), (worst quality:1.4), thick lines, cluttered, busy, photo`,
      cfg: 10, steps: 30, sampler: 'DPM++ 2M Karras', w: 1216, h: 832, clip: 2, model: 'SDXL 1.0',
    },
    // Icon (2)
    {
      category: 'icon',
      prompt: `(best quality:1.2), icon set design sheet, ${iconStyle}, ${projectContext.industry} themed, 16 icons in 4x4 grid, ${colorPhrase}, white background, consistent stroke weight, pixel-perfect, vector flat design style, uniform padding`,
      negative: `(${STANDARD_NEGATIVES.icon}:1.3), (worst quality:1.4), realistic, photo, person, text labels`,
      cfg: 8, steps: 30, sampler: 'Euler a', w: 1024, h: 1024, clip: 1, model: 'SDXL 1.0',
    },
    {
      category: 'icon',
      prompt: `(best quality:1.2), feature illustration icons, ${iconStyle}, ${projectContext.industry}, 12 icons in circle badges, ${colorPhrase}, isometric perspective, modern flat design, subtle shadows, uniform size, grid layout`,
      negative: `(${STANDARD_NEGATIVES.icon}:1.3), (worst quality:1.4), realistic, complex, text, photo`,
      cfg: 8, steps: 30, sampler: 'DPM++ 2M Karras', w: 1024, h: 1024, clip: 1, model: 'SDXL 1.0',
    },
    // People (2)
    {
      category: 'people',
      prompt: `(masterpiece, best quality, ultra-detailed:1.3), diverse group of ${projectContext.targetAudience} collaborating, modern workspace, candid moment, natural expressions, soft window light, ${colorPhrase} environment accents, editorial portrait, (authentic:1.2), warm atmosphere`,
      negative: `(${STANDARD_NEGATIVES.people}:1.3), (worst quality:1.4), nsfw, anime, cartoon`,
      cfg: 6.5, steps: 35, sampler: 'DPM++ 2M Karras', w: 1216, h: 832, clip: 2, model: 'SDXL 1.0',
    },
    {
      category: 'people',
      prompt: `(masterpiece, best quality:1.3), environmental portrait, confident ${projectContext.targetAudience.split(',')[0] || 'professional'}, ${projectContext.industry} setting, (shallow depth of field:1.2), beautiful bokeh, ${colorPhrase} color grading, approachable, lifestyle photography`,
      negative: `(${STANDARD_NEGATIVES.people}:1.3), (worst quality:1.4), nsfw, anime, cartoon, ugly face`,
      cfg: 6, steps: 35, sampler: 'DPM++ SDE Karras', w: 832, h: 1216, clip: 2, model: 'SDXL 1.0',
    },
    // Abstract (3)
    {
      category: 'abstract',
      prompt: `(masterpiece, best quality:1.3), floating 3D geometric shapes, ${colorPhrase}, frosted glass, brushed metal, matte materials, dramatic studio lighting, caustics, ${aesthetic}, dark background, reflections, (ultra-detailed:1.2)`,
      negative: `(${STANDARD_NEGATIVES.abstract}:1.3), (worst quality:1.4), person, face, realistic photo`,
      cfg: 8, steps: 35, sampler: 'DPM++ SDE Karras', w: 1024, h: 1024, clip: 2, model: 'SDXL 1.0',
    },
    {
      category: 'abstract',
      prompt: `(masterpiece:1.2), generative art, flowing particle system, ${colorPhrase}, organic curves, geometric precision, dark background, ${projectContext.designStyle}, mesmerizing, elegant, subtle glow, light bloom, thousands of particles`,
      negative: `(${STANDARD_NEGATIVES.abstract}:1.3), (worst quality:1.4), person, text, simple, boring`,
      cfg: 9, steps: 40, sampler: 'DPM++ 2M Karras', w: 1216, h: 832, clip: 2, model: 'SDXL 1.0',
    },
    {
      category: 'abstract',
      prompt: `(best quality:1.2), minimalist decorative element, single organic shape, ${colorPhrase}, frosted glass material, subtle shadow, white background, ${aesthetic}, elegant accent graphic, section divider design`,
      negative: `(${STANDARD_NEGATIVES.abstract}:1.3), (worst quality:1.4), complex, cluttered, person, text`,
      cfg: 7, steps: 25, sampler: 'Euler a', w: 1344, h: 576, clip: 2, model: 'SDXL 1.0',
    },
  ];

  sdCatalog.forEach((item) => {
    const ar = item.w > item.h
      ? item.w / item.h > 2 ? '21:9' : '16:9'
      : item.w < item.h ? '9:16' : '1:1';
    prompts.push({
      id: uid(),
      category: item.category,
      prompt: item.prompt,
      negativePrompt: item.negative,
      aspectRatio: ar,
      style: aesthetic,
      tags: [item.category, projectContext.industry, projectContext.designStyle],
      cfgScale: item.cfg,
      steps: item.steps,
      sampler: item.sampler,
      width: item.w,
      height: item.h,
      clipSkip: item.clip,
      model: item.model,
    });
  });

  return prompts;
}

// ===== Master Export =====

export function generateAllImagePrompts(
  scrapeResult: FullScrapeResult,
  projectContext: ProjectContext
): ImagePromptSet {
  const midjourney = generateMidjourneyPrompts(scrapeResult, projectContext);
  const dalle = generateDALLEPrompts(scrapeResult, projectContext);
  const stableDiffusion = generateStableDiffusionPrompts(scrapeResult, projectContext);
  const colors = extractTopColors(scrapeResult.designTokens);

  return {
    siteUrl: scrapeResult.targetUrl,
    projectContext,
    generatedAt: Date.now(),
    midjourney,
    dalle,
    stableDiffusion,
    totalPrompts: midjourney.length + dalle.length + stableDiffusion.length,
    colorPalette: colors,
  };
}
