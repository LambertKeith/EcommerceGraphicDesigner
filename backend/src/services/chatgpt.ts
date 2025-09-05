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

export interface ChatGPTResponse {
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
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  error?: {
    message: string;
    type: string;
    code: string;
  };
}

export interface ChatGPTGenerationResponse {
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

export class ChatGPTService extends AIService {
  private rateLimitDelay: number = 10000;

  constructor(config?: AIModelConfig) {
    const defaultConfig: AIModelConfig = {
      name: 'ChatGPT Vision',
      apiKey: process.env.GOOGLE_API_KEY || '', // Using same API key for now
      apiUrl: process.env.GEMINI_API_URL || 'https://api.laozhang.ai/v1/chat/completions',
      model: process.env.CHATGPT_MODEL || 'gpt-4o-image-vip',
      maxRetries: 3,
      retryDelay: 3000, // Slightly longer delay for ChatGPT
      timeout: 180000 // 3 minutes timeout for ChatGPT (higher quality processing)
    };
    
    super(config || defaultConfig);
  }

  async processImage(imagePath: string, options: ProcessImageOptions): Promise<ProcessImageResult> {
    try {
      const fullImagePath = fileStorage.getFullPath(imagePath);
      const imageBuffer = await fs.readFile(fullImagePath);
      
      const { base64Data, mimeType } = await this.prepareImageData(imageBuffer, imagePath);
      
      const promptTemplate = this.buildPrimaryPrompt(options);
      
      console.log('Processing single standard image with ChatGPT...');
      
      // Generate single standard quality image
      const processedImage = await this.callChatGPTAPI(base64Data, mimeType, promptTemplate.base);
      
      if (!processedImage) {
        throw new Error('Failed to generate processed image');
      }

      const variant = {
        imageBuffer: processedImage,
        score: 0.85, // Good score for standard output
        metadata: {
          prompt: promptTemplate.base,
          type: options.type,
          processing_method: 'chatgpt_4o_vision',
          model: this.config.model,
          quality_mode: 'single_standard'
        }
      };

      return {
        success: true,
        variants: [variant] // Always return single standard result
      };
      
    } catch (error) {
      console.error('ChatGPT processing error:', error);
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
    // Size validation - ChatGPT has different limits
    const maxSize = 20 * 1024 * 1024; // 20MB limit for ChatGPT
    
    if (imageBuffer.length > maxSize) {
      throw new Error(`Image too large: ${(imageBuffer.length / 1024 / 1024).toFixed(2)}MB. Maximum size is 20MB for ChatGPT.`);
    }

    // Format validation
    const mimeType = this.getMimeTypeFromPath(imagePath);
    const supportedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    
    if (!supportedTypes.includes(mimeType)) {
      throw new Error(`Unsupported image format: ${mimeType}. Supported formats: ${supportedTypes.join(', ')}`);
    }

    // Optional: Resize if image is too large (dimensions)
    let processedBuffer = imageBuffer;
    try {
      const sharp = require('sharp');
      const metadata = await sharp(imageBuffer).metadata();
      
      // ChatGPT can handle larger images, but we'll resize if over 8K
      const maxDimension = 8192;
      if (metadata.width && metadata.height && 
          (metadata.width > maxDimension || metadata.height > maxDimension)) {
        console.log(`Resizing large image for ChatGPT from ${metadata.width}x${metadata.height}`);
        
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
    
    console.log(`Image prepared for ChatGPT: ${mimeType}, size: ${(processedBuffer.length / 1024).toFixed(1)}KB`);
    
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

    // Use the first (best) prompt with standard enhancements
    const basePrompt = prompts[0] || 'Enhance this image with standard improvements';
    const enhancedPrompt = this.addStandardGuidance(basePrompt, options.type);

    return {
      base: enhancedPrompt,
      params: {
        type: options.type,
        hasUserPrompt: !!options.prompt,
        contextual: !!context.previousEdits?.length,
        model: 'chatgpt'
      }
    };
  }

  private addStandardGuidance(basePrompt: string, type: string): string {
    const standardGuidance = `
以标准图像编辑师的要求处理此图像：
1. 保持原始主体的比例和视角
2. 进行基础的图像优化和增强
3. 确保图像清晰度和基本质量
4. 调整基础的光照和色彩
5. 应用标准的图像处理技术
6. 输出单张清晰的处理结果
7. 保持自然的外观效果
8. 符合日常使用的标准要求

任务要求：${basePrompt}

请输出一张经过标准处理的图像。`;

    return standardGuidance;
  }

  private async callChatGPTAPI(base64Data: string, mimeType: string, prompt: string): Promise<Buffer | null> {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.apiKey}`,
    };

    const payload = {
      model: this.config.model,
      max_tokens: 4000,
      messages: [
        {
          role: "system",
          content: "You are a professional image editor specialized in e-commerce product photography. Generate high-quality, commercial-grade image edits with attention to detail, proper lighting, and professional presentation standards."
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
        console.log(`Calling ChatGPT API (attempt ${attempt}/${this.maxRetries})`);
        
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

        const result = await response.json() as ChatGPTResponse;
        
        if (result.error) {
          throw new Error(`ChatGPT API Error: ${result.error.message} (${result.error.type})`);
        }

        const messageContent = result.choices?.[0]?.message?.content;
        
        if (messageContent) {
          // Extract base64 image data from markdown format: ![image](data:image/png;base64,...)
          const base64Match = messageContent.match(/data:image\/[^;]+;base64,([^)]+)/);
          if (base64Match && base64Match[1]) {
            return Buffer.from(base64Match[1], 'base64');
          } else {
            throw new Error('No image data found in ChatGPT response. The model may not have generated an image for this request.');
          }
        } else {
          throw new Error('No message content received from ChatGPT API.');
        }

      } catch (error) {
        console.error(`ChatGPT API call attempt ${attempt} failed:`, error);
        
        if (attempt === this.maxRetries) {
          if (error instanceof Error && error.message.includes('Authentication error')) {
            throw error; // Don't retry auth errors
          }
          throw new Error(`ChatGPT API failed after ${this.maxRetries} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        
        // Progressive backoff with longer delays for ChatGPT
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
      
      console.log('Generating image with ChatGPT...');
      console.log('Enhanced prompt:', enhancedPrompt);
      
      // Generate image using ChatGPT image generation API
      const generatedImage = await this.callChatGPTGenerationAPI(enhancedPrompt, options.size || '1024x1024');
      
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
          generation_method: 'chatgpt_text_to_image'
        }
      };
      
    } catch (error) {
      console.error('ChatGPT image generation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  private buildGenerationPrompt(options: GenerateImageOptions): string {
    let prompt = options.prompt;
    
    // Apply style enhancement
    if (options.style) {
      const styleEnhancements = this.getStyleEnhancements(options.style);
      prompt = `${prompt}, ${styleEnhancements}`;
    }
    
    // Add standard quality guidelines
    const qualityEnhancement = `
Create a high-quality image suitable for general use.
The image should be:
- Clear and well-composed with good lighting
- Professional but approachable aesthetic
- Sharp details and good color balance
- Suitable for standard commercial applications

Original request: ${prompt}

Generate a clear, well-composed image that meets standard quality requirements.`;

    return qualityEnhancement;
  }

  private getStyleEnhancements(style: string): string {
    const styleMap: Record<string, string> = {
      'commercial': 'professional appearance, clean composition, business-appropriate',
      'artistic': 'creative style, artistic composition, visually interesting',
      'minimal': 'clean and simple, minimalist aesthetic, uncluttered',
      'realistic': 'photorealistic style, natural appearance, authentic details',
      'vibrant': 'bright and colorful, high contrast, energetic feel'
    };
    
    return styleMap[style] || styleMap['commercial'];
  }

  private async callChatGPTGenerationAPI(prompt: string, size: string): Promise<Buffer | null> {
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
        console.log(`Calling ChatGPT Generation API (attempt ${attempt}/${this.maxRetries})`);
        
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

        const result = await response.json() as ChatGPTGenerationResponse;
        
        if (result.error) {
          throw new Error(`ChatGPT Generation API Error: ${result.error.message}`);
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
        console.error(`ChatGPT Generation API call attempt ${attempt} failed:`, error);
        
        if (attempt === this.maxRetries) {
          if (error instanceof Error && error.message.includes('Authentication error')) {
            throw error;
          }
          throw new Error(`ChatGPT Generation API failed after ${this.maxRetries} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      id: 'chatgpt' as AIModelType,
      name: 'ChatGPT Vision',
      description: '基础图像处理模型，适合标准编辑和日常图像优化任务',
      capabilities: ['基础编辑', '标准优化', '简单修图', '日常处理', '标准文生图'],
      speed: 'medium',
      quality: 'standard',
      recommended: ['日常编辑', '基础优化', '简单修图', '入门级处理']
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
        max_tokens: 50,
        messages: [
          {
            role: "user",
            content: "Hello, are you working properly? Please respond briefly."
          }
        ]
      };

      console.log('Testing ChatGPT API connection...');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

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
          error: `ChatGPT connection test failed: ${error.message}`
        };
      }

      const result = await response.json() as any;
      
      if (result.error) {
        return {
          success: false,
          error: `ChatGPT API Error: ${result.error.message}`
        };
      }

      console.log('ChatGPT API connection test successful');
      return { success: true };

    } catch (error) {
      console.error('ChatGPT connection test failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection test failed with unknown error'
      };
    }
  }
}

export const chatgptService = new ChatGPTService();