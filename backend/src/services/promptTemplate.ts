export interface PromptTemplate {
  id: string;
  name: string;
  prompt: string;
  description: string;
  category: 'optimize' | 'edit' | 'refine';
  quality: 'premium' | 'standard' | 'conservative';
  useCase: string[];
  parameters?: Record<string, any>;
}

export interface PromptContext {
  productCategory?: string;
  currentBackground?: string;
  desiredStyle?: string;
  previousEdits?: Array<{
    type: string;
    prompt: string;
    timestamp: string;
  }>;
  userPreferences?: Record<string, any>;
}

export class PromptTemplateService {
  private templates: Map<string, PromptTemplate> = new Map();

  constructor() {
    this.initializeTemplates();
  }

  private initializeTemplates(): void {
    const templates: PromptTemplate[] = [
      // OPTIMIZE TEMPLATES
      {
        id: 'optimize_premium',
        name: 'Premium E-commerce Optimization',
        prompt: 'Transform this product image into a premium e-commerce photograph: remove any distracting or messy background, replace with a clean pure white background, enhance product lighting to show natural shadows and depth, improve color saturation and vibrancy while maintaining realistic tones, sharpen product details and textures, ensure the product appears premium and desirable for luxury online shopping.',
        description: 'High-end optimization for premium products',
        category: 'optimize',
        quality: 'premium',
        useCase: ['luxury', 'fashion', 'jewelry', 'electronics', 'premium_brands'],
        parameters: { backgroundType: 'white', lightingStyle: 'professional', colorEnhancement: 'premium' }
      },
      
      {
        id: 'optimize_standard',
        name: 'Standard E-commerce Optimization',
        prompt: 'Create a professional product photograph suitable for online retail: replace background with clean white background, adjust lighting for clear product visibility, enhance colors naturally, improve overall product presentation while maintaining authentic appearance, optimize for e-commerce platform requirements.',
        description: 'Standard optimization for most products',
        category: 'optimize',
        quality: 'standard',
        useCase: ['general', 'home_goods', 'tools', 'books', 'accessories'],
        parameters: { backgroundType: 'white', lightingStyle: 'natural', colorEnhancement: 'moderate' }
      },

      {
        id: 'optimize_conservative',
        name: 'Conservative Product Enhancement',
        prompt: 'Gently improve this product image for online sales: clean up the background with a subtle white background, make minor lighting adjustments to improve visibility, maintain natural product colors and textures, ensure the product looks authentic and trustworthy for online shoppers.',
        description: 'Gentle optimization preserving natural look',
        category: 'optimize',
        quality: 'conservative',
        useCase: ['food', 'organic', 'handmade', 'vintage', 'natural_products'],
        parameters: { backgroundType: 'white', lightingStyle: 'subtle', colorEnhancement: 'minimal' }
      },

      // EDIT TEMPLATES  
      {
        id: 'edit_background_white',
        name: 'White Background Replacement',
        prompt: 'Replace the current background with a clean, pure white background while preserving the product exactly as it is. Maintain natural product shadows and lighting, ensure smooth edge transitions, keep all product details and colors unchanged.',
        description: 'Clean white background replacement',
        category: 'edit',
        quality: 'standard',
        useCase: ['background_removal', 'clean_background', 'product_isolation'],
        parameters: { backgroundType: 'white', preserveProduct: true }
      },

      {
        id: 'edit_lighting_enhance',
        name: 'Lighting Enhancement',
        prompt: 'Improve the lighting in this product image: enhance brightness and contrast to show product details clearly, add soft natural-looking shadows for depth, improve overall illumination while maintaining realistic appearance, ensure the product looks appealing under good lighting conditions.',
        description: 'Professional lighting improvement',
        category: 'edit',
        quality: 'standard',
        useCase: ['poor_lighting', 'shadow_enhancement', 'visibility_improvement'],
        parameters: { lightingStyle: 'enhanced', shadowType: 'soft' }
      },

      {
        id: 'edit_color_vibrant',
        name: 'Color Vibrancy Enhancement',
        prompt: 'Enhance the colors in this product image: increase saturation and vibrancy to make the product more appealing, ensure colors remain realistic and true to the actual product, improve color balance and richness, make the product stand out attractively.',
        description: 'Color enhancement for better appeal',
        category: 'edit',
        quality: 'standard',
        useCase: ['dull_colors', 'color_correction', 'vibrancy_boost'],
        parameters: { colorEnhancement: 'vibrant', saturationBoost: true }
      },

      // REFINE TEMPLATES
      {
        id: 'refine_consistency',
        name: 'Consistency Refinement',
        prompt: 'Refine this product image while maintaining consistency with previous edits: make subtle improvements that build upon earlier modifications, ensure the overall style and quality remain coherent, fine-tune details without dramatic changes, preserve the established visual identity.',
        description: 'Consistent refinement building on previous edits',
        category: 'refine',
        quality: 'standard',
        useCase: ['multi_round_editing', 'consistency_maintenance', 'iterative_improvement'],
        parameters: { preserveStyle: true, subtleChanges: true }
      },

      {
        id: 'refine_polish',
        name: 'Final Polish Refinement',
        prompt: 'Apply final polish to this product image: make minor adjustments to perfect the overall appearance, fine-tune lighting and shadows, optimize color balance, ensure maximum visual appeal while maintaining product authenticity, create the best possible version for e-commerce use.',
        description: 'Final polishing for optimal results',
        category: 'refine',
        quality: 'premium',
        useCase: ['final_touches', 'perfection', 'quality_optimization'],
        parameters: { finalPolish: true, qualityOptimization: true }
      }
    ];

    templates.forEach(template => {
      this.templates.set(template.id, template);
    });
  }

  getTemplatesForType(
    type: 'optimize' | 'edit' | 'refine', 
    context?: PromptContext
  ): PromptTemplate[] {
    const templates = Array.from(this.templates.values())
      .filter(template => template.category === type);

    if (!context) {
      return templates;
    }

    // Sort templates based on context relevance
    return templates.sort((a, b) => {
      const scoreA = this.calculateContextScore(a, context);
      const scoreB = this.calculateContextScore(b, context);
      return scoreB - scoreA;
    });
  }

  buildCustomPrompt(
    baseTemplate: PromptTemplate,
    userPrompt: string,
    context?: PromptContext
  ): string {
    let customPrompt = baseTemplate.prompt;

    // Add user-specific instructions
    if (userPrompt && userPrompt.length > 0) {
      customPrompt += ` Additionally: ${userPrompt}`;
    }

    // Add context information
    if (context?.previousEdits && context.previousEdits.length > 0) {
      const recentEdits = context.previousEdits
        .slice(-3) // Last 3 edits
        .map(edit => `${edit.type}: ${edit.prompt}`)
        .join('; ');
      customPrompt += ` Context from previous edits: ${recentEdits}.`;
    }

    if (context?.productCategory) {
      const categorySpecificInstructions = this.getCategorySpecificInstructions(context.productCategory);
      if (categorySpecificInstructions) {
        customPrompt += ` ${categorySpecificInstructions}`;
      }
    }

    // Add consistency reminder
    customPrompt += ' Maintain product authenticity and ensure the result looks natural and professional.';

    return customPrompt;
  }

  generatePromptsForProcessing(
    type: 'optimize' | 'edit' | 'refine',
    userPrompt?: string,
    context?: PromptContext
  ): string[] {
    const templates = this.getTemplatesForType(type, context);
    const prompts: string[] = [];

    switch (type) {
      case 'optimize':
        // For optimization, use different quality levels
        const qualityOrder = ['premium', 'standard', 'conservative'];
        qualityOrder.forEach(quality => {
          const template = templates.find(t => t.quality === quality);
          if (template) {
            prompts.push(this.buildCustomPrompt(template, userPrompt || '', context));
          }
        });
        break;

      case 'edit':
        if (userPrompt) {
          // For edits with user prompts, choose most relevant templates
          const relevantTemplates = templates.slice(0, 2);
          relevantTemplates.forEach(template => {
            prompts.push(this.buildCustomPrompt(template, userPrompt, context));
          });
        } else {
          // Default edit templates
          const defaultTemplate = templates.find(t => t.id === 'edit_background_white') || templates[0];
          prompts.push(this.buildCustomPrompt(defaultTemplate, '', context));
        }
        break;

      case 'refine':
        // For refinement, focus on consistency
        const refineTemplate = templates.find(t => t.id === 'refine_consistency') || templates[0];
        prompts.push(this.buildCustomPrompt(refineTemplate, userPrompt || '', context));
        break;
    }

    return prompts.length > 0 ? prompts : [this.getFallbackPrompt(type)];
  }

  private calculateContextScore(template: PromptTemplate, context: PromptContext): number {
    let score = 0;

    // Score based on product category match
    if (context.productCategory && template.useCase.includes(context.productCategory)) {
      score += 10;
    }

    // Score based on use case relevance
    if (context.desiredStyle) {
      const styleKeywords = context.desiredStyle.toLowerCase().split(' ');
      const templateText = (template.name + ' ' + template.description).toLowerCase();
      styleKeywords.forEach(keyword => {
        if (templateText.includes(keyword)) {
          score += 5;
        }
      });
    }

    return score;
  }

  private getCategorySpecificInstructions(category: string): string | null {
    const instructions: Record<string, string> = {
      'food': 'Ensure the food looks fresh and appetizing, maintain natural food colors.',
      'fashion': 'Show fabric textures clearly, maintain accurate colors and styling.',
      'jewelry': 'Highlight shine and sparkle, show fine details and craftsmanship.',
      'electronics': 'Show clean lines and modern appearance, highlight key features.',
      'luxury': 'Emphasize premium quality and sophisticated appearance.',
      'handmade': 'Preserve authentic handcrafted character and unique details.',
      'vintage': 'Maintain the vintage character while improving clarity.',
      'organic': 'Preserve natural appearance and authentic organic qualities.'
    };

    return instructions[category] || null;
  }

  private getFallbackPrompt(type: 'optimize' | 'edit' | 'refine'): string {
    const fallbacks = {
      optimize: 'Improve this product image for e-commerce use: clean background, better lighting, enhanced product presentation.',
      edit: 'Edit this product image to improve its appearance for online sales while maintaining product authenticity.',
      refine: 'Make subtle refinements to this product image to optimize its visual appeal for e-commerce use.'
    };

    return fallbacks[type];
  }

  getTemplateById(id: string): PromptTemplate | undefined {
    return this.templates.get(id);
  }

  getAllTemplates(): PromptTemplate[] {
    return Array.from(this.templates.values());
  }
}

export const promptTemplateService = new PromptTemplateService();