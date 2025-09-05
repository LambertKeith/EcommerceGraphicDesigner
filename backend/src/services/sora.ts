import fs from 'fs/promises';
import { fileStorage } from './fileStorage';
import { promptTemplateService, PromptContext } from './promptTemplate';
import { 
  AIService, 
  ProcessImageOptions, 
  ProcessImageResult, 
  GenerateImageOptions,
  GenerateImageResult,
  AIModelConfig, 
  AIModelInfo, 
  AIModelType 
} from './aiService';

export interface SoraResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  data?: Array<{
    url?: string;
    b64_json?: string;
    revised_prompt?: string;
  }>;
  choices?: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  error?: {
    message: string;
    type: string;
    code: string;
  };
}

export interface SoraGenerationResponse {
  data?: Array<{
    url?: string;
    b64_json?: string;
    revised_prompt?: string;
  }>;
  error?: {
    message: string;
    type?: string;
    code?: string;
  };
}

export interface PromptTemplate {
  base: string;
  params?: Record<string, any>;
}

export class SoraService extends AIService {
  private rateLimitDelay: number = 15000; // Longer delay for creative processing

  constructor(config?: AIModelConfig) {
    const defaultConfig: AIModelConfig = {
      name: 'Sora Image',
      apiKey: process.env.GOOGLE_API_KEY || '', // Using same API key for now
      apiUrl: process.env.GEMINI_API_URL || 'https://api.laozhang.ai/v1/chat/completions',
      model: process.env.SORA_MODEL || 'sora_image',
      maxRetries: 2, // Fewer retries for experimental model
      retryDelay: 5000, // Longer delay between retries
      timeout: 300000 // 5 minutes timeout for creative processing
    };
    
    super(config || defaultConfig);
  }

  async processImage(imagePath: string, options: ProcessImageOptions): Promise<ProcessImageResult> {
    try {
      const fullImagePath = fileStorage.getFullPath(imagePath);
      const imageBuffer = await fs.readFile(fullImagePath);
      
      const { base64Data, mimeType } = await this.prepareImageData(imageBuffer, imagePath);
      
      const promptTemplate = this.buildPrimaryPrompt(options);
      
      console.log('Processing single creative image with Sora...');
      
      // Generate single high-quality creative image
      const processedImage = await this.callSoraAPI(base64Data, mimeType, promptTemplate.base);
      
      if (!processedImage) {
        throw new Error('Failed to generate processed image');
      }

      const variant = {
        imageBuffer: processedImage,
        score: 0.90, // High score for creative single output
        metadata: {
          prompt: promptTemplate.base,
          type: options.type,
          processing_method: 'sora_image',
          model: this.config.model,
          quality_mode: 'single_creative'
        }
      };

      return {
        success: true,
        variants: [variant] // Always return single best creative result
      };
      
    } catch (error) {
      console.error('Sora processing error:', error);
      return {
        success: false,
        variants: [],
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  private async prepareImageData(imageBuffer: Buffer, imagePath: string): Promise<{
    base64Data: string;
    mimeType: string;
  }> {
    // Size validation - Sora might have different limits
    const maxSize = 15 * 1024 * 1024; // 15MB limit for Sora
    
    if (imageBuffer.length > maxSize) {
      throw new Error(`Image too large: ${(imageBuffer.length / 1024 / 1024).toFixed(2)}MB. Maximum size is 15MB for Sora.`);
    }

    // Format validation
    const mimeType = this.getMimeTypeFromPath(imagePath);
    const supportedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    
    if (!supportedTypes.includes(mimeType)) {
      throw new Error(`Unsupported image format: ${mimeType}. Supported formats: ${supportedTypes.join(', ')}`);
    }

    // Optional: Resize if image is too large (dimensions)
    let processedBuffer = imageBuffer;
    try {
      const sharp = require('sharp');
      const metadata = await sharp(imageBuffer).metadata();
      
      // Sora works best with moderate resolution for creative processing
      const maxDimension = 2048;
      if (metadata.width && metadata.height && 
          (metadata.width > maxDimension || metadata.height > maxDimension)) {
        console.log(`Resizing image for Sora creative processing from ${metadata.width}x${metadata.height}`);
        
        processedBuffer = await sharp(imageBuffer)
          .resize(maxDimension, maxDimension, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .toBuffer();
      }
    } catch (error) {
      console.warn('Could not process image dimensions, using original:', error);
    }

    // Convert to base64
    const base64Data = processedBuffer.toString('base64');
    
    console.log(`Image prepared for Sora: ${mimeType}, size: ${(processedBuffer.length / 1024).toFixed(1)}KB`);
    
    return { base64Data, mimeType };
  }

  private buildPrimaryPrompt(options: ProcessImageOptions): PromptTemplate {
    const context: PromptContext = {
      previousEdits: options.context?.previous_edits || [],
      productCategory: options.context?.product_category,
      desiredStyle: options.context?.desired_style,
      userPreferences: options.context?.user_preferences
    };

    // Get the best prompt for the task
    let prompts = promptTemplateService.generatePromptsForProcessing(
      options.type,
      options.prompt,
      context
    );

    // Use the first (best) prompt with creative enhancements
    const basePrompt = prompts[0] || 'Enhance this image with creative artistic elements';
    const enhancedPrompt = this.addCreativeGuidance(basePrompt, options.type);

    return {
      base: enhancedPrompt,
      params: {
        type: options.type,
        hasUserPrompt: !!options.prompt,
        contextual: !!context.previousEdits?.length,
        model: 'sora',
        creative: true
      }
    };
  }

  private addCreativeGuidance(basePrompt: string, type: string): string {
    const creativeGuidance = `
以创意视觉艺术师的专业标准处理此图像：
1. 保持原始主体的比例和视角不变
2. 应用创新的视觉效果和艺术滤镜
3. 确保构图美观且具有艺术感
4. 维持色彩和光影的艺术平衡
5. 添加独特但不突兀的视觉元素
6. 输出单张高质量的创意图像
7. 保持产品的识别度和完整性
8. 融合现代设计美学和视觉创新

任务要求：${basePrompt}

请创作一张具有艺术价值的高质量图像。`;

    return creativeGuidance;
  }

  private async callSoraAPI(base64Data: string, mimeType: string, prompt: string): Promise<Buffer | null> {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.apiKey}`,
    };

    const payload = {
      model: this.config.model,
      messages: [
        {
          role: "system",
          content: "You are a creative visual artist specialized in innovative image transformation and artistic enhancement. Create visually striking, artistically enhanced images with unique creative interpretations while preserving the essence of the original subject."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64Data}`,
                detail: "high"
              }
            }
          ]
        }
      ],
      // Sora-specific parameters for creative generation
      temperature: 0.8, // Higher creativity
      max_tokens: 4000
    };

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`Calling Sora API (attempt ${attempt}/${this.maxRetries})`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(this.config.apiUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          const error = this.parseAPIError(response.status, errorText);
          
          // Handle different error types
          if (response.status === 429) {
            console.log(`Rate limited, waiting ${this.rateLimitDelay}ms before retry`);
            await this.sleep(this.rateLimitDelay);
            continue;
          } else if (response.status >= 500) {
            console.log(`Server error (${response.status}), retrying...`);
            throw new Error(error.message);
          } else if (response.status === 401 || response.status === 403) {
            throw new Error(`Authentication error: ${error.message}. Please check your API key.`);
          } else {
            throw new Error(error.message);
          }
        }

        const result = await response.json() as SoraResponse;
        
        if (result.error) {
          throw new Error(`Sora API Error: ${result.error.message} (${result.error.type})`);
        }

        // Handle different response formats that Sora might use
        let imageData: string | null = null;

        // Check for image data in different possible formats
        if (result.data && result.data[0]) {
          if (result.data[0].b64_json) {
            imageData = result.data[0].b64_json;
          } else if (result.data[0].url && result.data[0].url.startsWith('data:image')) {
            const base64Match = result.data[0].url.match(/data:image\/[^;]+;base64,(.+)/);
            if (base64Match) {
              imageData = base64Match[1];
            }
          }
        } 
        
        // Fallback to choices format (like ChatGPT)
        if (!imageData && result.choices?.[0]?.message?.content) {
          const messageContent = result.choices[0].message.content;
          const base64Match = messageContent.match(/data:image\/[^;]+;base64,([^)]+)/);
          if (base64Match && base64Match[1]) {
            imageData = base64Match[1];
          }
        }

        if (imageData) {
          return Buffer.from(imageData, 'base64');
        } else {
          throw new Error('No image data found in Sora response. The model may not have generated an image for this request.');
        }

      } catch (error) {
        console.error(`Sora API call attempt ${attempt} failed:`, error);
        
        if (attempt === this.maxRetries) {
          if (error instanceof Error && error.message.includes('Authentication error')) {
            throw error; // Don't retry auth errors
          }
          throw new Error(`Sora API failed after ${this.maxRetries} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        
        // Progressive backoff with longer delays for creative processing
        const delay = this.retryDelay * Math.pow(2, attempt - 1);
        console.log(`Waiting ${delay}ms before retry...`);
        await this.sleep(delay);
      }
    }

    return null;
  }

  async generateImage(options: GenerateImageOptions): Promise<GenerateImageResult> {
    try {
      const enhancedPrompt = this.buildGenerationPrompt(options);
      
      console.log('Generating creative image with Sora...');
      console.log('Enhanced prompt:', enhancedPrompt);
      
      // Generate image using Sora image generation API
      const generatedImage = await this.callSoraGenerationAPI(enhancedPrompt, options.size || '1024x1024');
      
      if (!generatedImage) {
        throw new Error('Failed to generate image');
      }

      return {
        success: true,
        imageBuffer: generatedImage,
        metadata: {
          prompt: enhancedPrompt,
          originalPrompt: options.prompt,
          style: options.style,
          size: options.size || '1024x1024',
          model: this.config.model,
          generation_method: 'sora_creative_image'
        }
      };
      
    } catch (error) {
      console.error('Sora image generation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  private buildGenerationPrompt(options: GenerateImageOptions): string {
    let prompt = options.prompt;
    
    // Apply creative style enhancement
    if (options.style) {
      const styleEnhancements = this.getCreativeStyleEnhancements(options.style);
      prompt = `${prompt}, ${styleEnhancements}`;
    }
    
    // Add creative quality guidelines
    const qualityEnhancement = `
Create a creative, visually striking image with artistic flair.
The image should be:
- Artistically compelling with unique visual elements
- Creative composition with interesting perspective
- Rich colors and dynamic lighting
- Suitable for artistic or creative commercial use
- Innovative and visually engaging

Original request: ${prompt}

Generate a creative, high-impact image with artistic excellence.`;

    return qualityEnhancement;
  }

  private getCreativeStyleEnhancements(style: string): string {
    const styleMap: Record<string, string> = {
      'commercial': 'creative commercial approach, artistic product presentation, innovative marketing aesthetic',
      'artistic': 'bold artistic vision, creative expression, unique artistic interpretation',
      'minimal': 'creative minimalism, artistic simplicity, elegant creative design',
      'realistic': 'creative realism, artistic photography style, enhanced natural beauty',
      'vibrant': 'bold creative colors, dynamic artistic composition, visually impactful'
    };
    
    return styleMap[style] || styleMap['artistic'];
  }

  private async callSoraGenerationAPI(prompt: string, size: string): Promise<Buffer | null> {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.apiKey}`,
    };

    const payload = {
      model: this.config.model,
      prompt: prompt,
      n: 1,
      size: size
    };

    // Use image generation endpoint
    const generationUrl = this.config.apiUrl.replace('/chat/completions', '/images/generations');

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`Calling Sora Generation API (attempt ${attempt}/${this.maxRetries})`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(generationUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          const error = this.parseAPIError(response.status, errorText);
          
          if (response.status === 429) {
            console.log(`Rate limited, waiting ${this.rateLimitDelay}ms before retry`);
            await this.sleep(this.rateLimitDelay);
            continue;
          } else if (response.status >= 500) {
            console.log(`Server error (${response.status}), retrying...`);
            throw new Error(error.message);
          } else if (response.status === 401 || response.status === 403) {
            throw new Error(`Authentication error: ${error.message}. Please check your API key.`);
          } else {
            throw new Error(error.message);
          }
        }

        const result = await response.json() as SoraGenerationResponse;
        
        if (result.error) {
          throw new Error(`Sora Generation API Error: ${result.error.message}`);
        }

        // Extract image data from response
        if (result.data && result.data[0] && result.data[0].url) {
          const imageUrl = result.data[0].url;
          const imageResponse = await fetch(imageUrl);
          
          if (!imageResponse.ok) {
            throw new Error('Failed to download generated image');
          }
          
          const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
          return imageBuffer;
        } else if (result.data && result.data[0] && result.data[0].b64_json) {
          return Buffer.from(result.data[0].b64_json, 'base64');
        } else {
          throw new Error('No image data found in API response');
        }

      } catch (error) {
        console.error(`Sora Generation API call attempt ${attempt} failed:`, error);
        
        if (attempt === this.maxRetries) {
          if (error instanceof Error && error.message.includes('Authentication error')) {
            throw error;
          }
          throw new Error(`Sora Generation API failed after ${this.maxRetries} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        
        const delay = this.retryDelay * Math.pow(2, attempt - 1);
        console.log(`Waiting ${delay}ms before retry...`);
        await this.sleep(delay);
      }
    }

    return null;
  }

  getModelInfo(): AIModelInfo {
    return {
      id: 'sora' as AIModelType,
      name: 'Sora Image',
      description: '高级创意AI模型，专注于艺术创作和视觉创新，第二强处理能力',
      capabilities: ['创意艺术处理', '风格转换', '视觉创新', '艺术滤镜', '独特效果', '创意文生图'],
      speed: 'medium',
      quality: 'premium',
      recommended: ['艺术创作', '创意设计', '风格实验', '视觉艺术', '创新营销图']
    };
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      };

      const payload = {
        model: this.config.model,
        messages: [
          {
            role: "user",
            content: "Hello, are you working properly? Please respond briefly."
          }
        ],
        max_tokens: 50
      };

      console.log('Testing Sora API connection...');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // Longer timeout for Sora

      const response = await fetch(this.config.apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        const error = this.parseAPIError(response.status, errorText);
        return {
          success: false,
          error: `Sora connection test failed: ${error.message}`
        };
      }

      const result = await response.json() as any;
      
      if (result.error) {
        return {
          success: false,
          error: `Sora API Error: ${result.error.message}`
        };
      }

      console.log('Sora API connection test successful');
      return { success: true };

    } catch (error) {
      console.error('Sora connection test failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection test failed with unknown error'
      };
    }
  }
}

export const soraService = new SoraService();