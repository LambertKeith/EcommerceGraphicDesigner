import fs from 'fs/promises';
import { fileStorage } from './fileStorage';
import { promptTemplateService, PromptContext } from './promptTemplate';
import { 
  AIService, 
  ProcessImageOptions, 
  ProcessImageResult, 
  AIModelConfig, 
  AIModelInfo, 
  AIModelType 
} from './aiService';

export interface GeminiResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
  }>;
  error?: {
    message: string;
    type: string;
    code: string;
  };
}

export interface PromptTemplate {
  base: string;
  params?: Record<string, any>;
}

export class GeminiService extends AIService {
  private rateLimitDelay: number = 10000;

  constructor() {
    const config: AIModelConfig = {
      name: 'Gemini 2.5 Flash',
      apiKey: process.env.GOOGLE_API_KEY || '',
      apiUrl: process.env.GEMINI_API_URL || 'https://api.laozhang.ai/v1/chat/completions',
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash-image-preview',
      maxRetries: 3,
      retryDelay: 2000,
      timeout: 120000
    };
    
    super(config);
  }

  async processImage(imagePath: string, options: ProcessImageOptions): Promise<ProcessImageResult> {
    try {
      const fullImagePath = fileStorage.getFullPath(imagePath);
      const imageBuffer = await fs.readFile(fullImagePath);
      
      const { base64Data, mimeType } = await this.prepareImageData(imageBuffer, imagePath);
      
      const promptTemplate = this.buildPrimaryPrompt(options);
      
      console.log('Processing single high-quality image with Gemini...');
      
      // Generate single high-quality image instead of multiple variants
      const processedImage = await this.callGeminiAPI(base64Data, mimeType, promptTemplate.base);
      
      if (!processedImage) {
        throw new Error('Failed to generate processed image');
      }

      const variant = {
        imageBuffer: processedImage,
        score: 0.95, // High score for single quality output
        metadata: {
          prompt: promptTemplate.base,
          type: options.type,
          processing_method: 'gemini_2.5_flash_image',
          model: this.config.model,
          quality_mode: 'single_best'
        }
      };

      return {
        success: true,
        variants: [variant] // Always return single best result
      };
      
    } catch (error) {
      console.error('Gemini processing error:', error);
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
    // Size validation
    const maxSize = 10 * 1024 * 1024; // 10MB limit for Gemini API
    
    if (imageBuffer.length > maxSize) {
      throw new Error(`Image too large: ${(imageBuffer.length / 1024 / 1024).toFixed(2)}MB. Maximum size is 10MB.`);
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
      
      // If image is larger than 4K, resize it
      const maxDimension = 4096;
      if (metadata.width && metadata.height && 
          (metadata.width > maxDimension || metadata.height > maxDimension)) {
        console.log(`Resizing large image from ${metadata.width}x${metadata.height}`);
        
        processedBuffer = await sharp(imageBuffer)
          .resize(maxDimension, maxDimension, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .toBuffer();
      }
    } catch (error) {
      console.warn('Could not process image dimensions, using original:', error);
      // Continue with original buffer if Sharp processing fails
    }

    // Convert to base64
    const base64Data = processedBuffer.toString('base64');
    
    console.log(`Image prepared: ${mimeType}, size: ${(processedBuffer.length / 1024).toFixed(1)}KB`);
    
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
    const prompts = promptTemplateService.generatePromptsForProcessing(
      options.type,
      options.prompt,
      context
    );

    // Use the first (best) prompt with professional enhancements
    const basePrompt = prompts[0] || 'Enhance this image for e-commerce use';
    const enhancedPrompt = this.addProfessionalGuidance(basePrompt, options.type);

    return {
      base: enhancedPrompt,
      params: {
        type: options.type,
        hasUserPrompt: !!options.prompt,
        contextual: !!context.previousEdits?.length,
        model: 'gemini',
        quality: 'premium'
      }
    };
  }

  private addProfessionalGuidance(basePrompt: string, type: string): string {
    const professionalGuidance = `
以专业电商摄影师的标准处理此图像：
1. 保持原始主体的精确比例和视角
2. 确保图像构图平衡、专业且美观
3. 维持合适的光照、阴影和色彩平衡
4. 达到商业产品摄影的质量标准
5. 避免过度修改，保持自然真实感
6. 确保最终输出为高质量、清晰的单张图像
7. 如需背景处理，使用纯白色或透明背景
8. 保持产品细节的完整性和清晰度

任务要求：${basePrompt}

请输出一张最高质量的处理结果图像。`;

    return professionalGuidance;
  }

  private async callGeminiAPI(base64Data: string, mimeType: string, prompt: string): Promise<Buffer | null> {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.apiKey}`,
    };

    const payload = {
      model: this.config.model,
      stream: false,
      messages: [
        {
          role: "system",
          content: "You are an AI assistant specialized in image processing and editing for e-commerce."
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
      ]
    };

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`Calling Gemini API (attempt ${attempt}/${this.maxRetries})`);
        
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
            throw new Error(`Authentication error: ${error.message}. Please check your GOOGLE_API_KEY.`);
          } else {
            throw new Error(error.message);
          }
        }

        const result = await response.json() as GeminiResponse;
        
        if (result.error) {
          throw new Error(`Gemini API Error: ${result.error.message} (${result.error.type})`);
        }

        const messageContent = result.choices?.[0]?.message?.content;
        
        if (messageContent) {
          // Extract base64 image data from markdown format: ![image](data:image/png;base64,...)
          const base64Match = messageContent.match(/data:image\/[^;]+;base64,([^)]+)/);
          if (base64Match && base64Match[1]) {
            return Buffer.from(base64Match[1], 'base64');
          } else {
            throw new Error('No image data found in API response. The model may not have generated an image for this request.');
          }
        } else {
          throw new Error('No message content received from Gemini API.');
        }

      } catch (error) {
        console.error(`API call attempt ${attempt} failed:`, error);
        
        if (attempt === this.maxRetries) {
          if (error instanceof Error && error.message.includes('Authentication error')) {
            throw error; // Don't retry auth errors
          }
          throw new Error(`Gemini API failed after ${this.maxRetries} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        
        // Progressive backoff
        const delay = this.retryDelay * Math.pow(2, attempt - 1);
        console.log(`Waiting ${delay}ms before retry...`);
        await this.sleep(delay);
      }
    }

    return null;
  }

  getModelInfo(): AIModelInfo {
    return {
      id: 'gemini' as AIModelType,
      name: 'Gemini 2.5 Flash',
      description: '顶级AI图像处理模型，最强大的处理能力和最高质量输出',
      capabilities: ['顶级图像优化', '智能背景处理', '高级编辑', '专业修图', '完美细节处理'],
      speed: 'fast',
      quality: 'premium',
      recommended: ['专业产品摄影', '高端图像处理', '商业级修图', '品牌宣传图', '精品电商图']
    };
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      // Create a small test image (1x1 pixel PNG in base64)
      const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAGA60e6kgAAAABJRU5ErkJggg==';
      
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      };

      const payload = {
        model: this.config.model,
        stream: false,
        messages: [
          {
            role: "user",
            content: "Hello, are you working properly?"
          }
        ]
      };

      console.log('Testing Gemini API connection...');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout for test

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
          error: `Connection test failed: ${error.message}`
        };
      }

      const result = await response.json() as any;
      
      if (result.error) {
        return {
          success: false,
          error: `API Error: ${result.error.message}`
        };
      }

      console.log('Gemini API connection test successful');
      return { success: true };

    } catch (error) {
      console.error('Gemini connection test failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection test failed with unknown error'
      };
    }
  }
}

export const geminiService = new GeminiService();