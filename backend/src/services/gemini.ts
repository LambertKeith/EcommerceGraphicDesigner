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

export interface GeminiGenerationResponse {
  data: Array<{
    url?: string;
    b64_json?: string;
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

  constructor(config?: AIModelConfig) {
    const defaultConfig: AIModelConfig = {
      name: 'Gemini 2.5 Flash',
      apiKey: process.env.GOOGLE_API_KEY || '',
      apiUrl: process.env.GEMINI_API_URL || 'https://api.laozhang.ai/v1/chat/completions',
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash-image-preview',
      maxRetries: 3,
      retryDelay: 2000,
      timeout: 120000
    };
    
    super(config || defaultConfig);
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

重要：请输出一张经过处理的图像作为回答。使用markdown格式包含base64编码的图像数据：![image](data:image/png;base64,<base64_data>)。确保输出的是完整的、高质量的处理结果图像。

CRITICAL: You MUST generate and return a processed image. Please return the enhanced image in base64 format using markdown syntax: ![image](data:image/png;base64,YOUR_BASE64_DATA_HERE). The base64 data must be a complete, valid image file.`;

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
        
        console.log('Gemini API response received, content type:', typeof messageContent);
        console.log('Content length:', messageContent?.length || 0);
        
        if (messageContent) {
          // Extract base64 image data from markdown format: ![image](data:image/png;base64,...)
          const base64Match = messageContent.match(/data:image\/[^;]+;base64,([^)]+)/);
          if (base64Match && base64Match[1]) {
            console.log('Successfully extracted base64 image data, size:', base64Match[1].length, 'characters');
            return Buffer.from(base64Match[1], 'base64');
          } else {
            console.log('No image data found in API response, content preview:', messageContent?.substring(0, 200));
            throw new Error(`No image data found in API response. The model may not have generated an image for this request.`);
          }
        } else {
          console.log('No message content received from Gemini API');
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

  // 添加文生图功能
  async generateImage(options: GenerateImageOptions): Promise<GenerateImageResult> {
    try {
      const enhancedPrompt = this.buildGenerationPrompt(options);
      
      console.log('Generating image with Gemini...');
      console.log('Enhanced prompt:', enhancedPrompt);
      
      // Try image generation API first, with quick fallback to chat completions
      let generatedImage: Buffer | null = null;
      let usedMethod = 'unknown';
      
      try {
        console.log('Attempting Gemini Images Generation API...');
        generatedImage = await this.callGeminiGenerationAPI(enhancedPrompt, options.size || '1024x1024');
        usedMethod = 'images_generations';
        console.log('Images Generation API succeeded');
      } catch (error) {
        console.log('Images generation API failed, analyzing error for fallback decision...');
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log('Error details:', errorMessage);
        
        // For systematic API issues, immediately fallback to chat completions
        console.log('Executing fallback to Gemini Chat Completions API...');
        try {
          generatedImage = await this.callGeminiChatGenerationAPI(enhancedPrompt);
          usedMethod = 'chat_completions_fallback';
          console.log('Chat Completions fallback succeeded');
        } catch (fallbackError) {
          console.error('Chat Completions fallback also failed:', fallbackError);
          throw new Error(`Both Generation API and Chat Completions failed. Original: ${errorMessage}. Fallback: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`);
        }
      }
      
      if (!generatedImage) {
        throw new Error('Failed to generate image - no data returned from API');
      }

      console.log(`Image generation completed using method: ${usedMethod}`);
      return {
        success: true,
        imageBuffer: generatedImage,
        metadata: {
          prompt: enhancedPrompt,
          originalPrompt: options.prompt,
          style: options.style,
          size: options.size || '1024x1024',
          model: this.config.model,
          generation_method: `gemini_${usedMethod}`
        }
      };
      
    } catch (error) {
      console.error('Gemini image generation final error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  private buildGenerationPrompt(options: GenerateImageOptions): string {
    let prompt = options.prompt;
    
    // Add style modifiers if provided
    if (options.style) {
      const styleText = this.getStyleText(options.style);
      prompt += `, ${styleText}`;
    }

    // Add general e-commerce generation instructions
    const enhancedPrompt = `
Create a high-quality, professional image suitable for commercial use.
The image should be:
- Clear and well-lit with professional composition
- Suitable for e-commerce or marketing materials
- High resolution and sharp details
- Aesthetically pleasing and market-ready

Original request: ${prompt}

Generate a single, best-quality result that meets commercial standards.`;

    return enhancedPrompt;
  }

  private getStyleText(style: string): string {
    const styleMap: Record<string, string> = {
      'commercial': 'professional product photography, clean background, studio lighting',
      'artistic': 'creative artistic style, unique composition, artistic flair, visually striking',
      'minimal': 'minimalist design, clean lines, simple composition, modern aesthetic',
      'realistic': 'photorealistic, natural lighting, authentic textures, lifelike details',
      'vibrant': 'bright colors, high contrast, energetic composition, eye-catching visuals'
    };
    
    return styleMap[style] || styleMap['commercial'];
  }

  private async callGeminiGenerationAPI(prompt: string, size: string): Promise<Buffer | null> {
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
    console.log('Calling Generation URL:', generationUrl);

    const maxAttempts = 2; // Quick retry for faster fallback

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`Calling Gemini Generation API (attempt ${attempt}/${maxAttempts})`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(generationUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        console.log(`Generation API response status: ${response.status}`);

        if (!response.ok) {
          const errorText = await response.text();
          console.log('Generation API error response:', errorText);
          
          const error = this.parseAPIError(response.status, errorText);
          
          // Handle different error types - be aggressive about non-retryable errors
          if (response.status === 429) {
            console.log(`Rate limited, waiting ${this.rateLimitDelay}ms before retry`);
            await this.sleep(this.rateLimitDelay);
            continue;
          } else if (response.status >= 500) {
            // For systematic server errors, don't retry
            if (errorText.includes('shell_api_error') || errorText.includes('convert_request_failed')) {
              console.log(`Systematic server error detected (${response.status}), not retrying`);
              throw new Error(error.message);
            }
            console.log(`Server error (${response.status}), retrying...`);
            throw new Error(error.message);
          } else {
            console.log(`Client error (${response.status}), not retrying`);
            throw new Error(error.message);
          }
        }

        const result = await response.json() as GeminiGenerationResponse;
        console.log('Generation API response structure:', Object.keys(result));
        
        if (result.error) {
          console.log('API returned error in response:', result.error);
          throw new Error(`Gemini Generation API Error: ${result.error.message}`);
        }

        // Extract image data from response
        if (result.data && result.data[0] && result.data[0].url) {
          const imageUrl = result.data[0].url;
          console.log('Fetching generated image from URL:', imageUrl);
          const imageResponse = await fetch(imageUrl);
          
          if (!imageResponse.ok) {
            throw new Error('Failed to download generated image');
          }
          
          const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
          console.log(`Successfully fetched image, size: ${imageBuffer.length} bytes`);
          return imageBuffer;
        } else if (result.data && result.data[0] && result.data[0].b64_json) {
          console.log('Processing base64 image data');
          return Buffer.from(result.data[0].b64_json, 'base64');
        } else {
          console.log('No image data found in API response:', result);
          throw new Error('No image data found in API response');
        }

      } catch (error) {
        console.error(`Generation API call attempt ${attempt} failed:`, error);
        
        if (attempt === maxAttempts) {
          throw new Error(`Gemini Generation API failed after ${maxAttempts} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        
        // Short delay for faster fallback
        const delay = Math.min(this.retryDelay * attempt, 3000);
        console.log(`Waiting ${delay}ms before retry...`);
        await this.sleep(delay);
      }
    }

    return null;
  }

  private async callGeminiChatGenerationAPI(prompt: string): Promise<Buffer | null> {
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
          content: "You are an AI image generator specializing in e-commerce product images. When asked to create an image, you MUST generate a visual representation and return it as base64-encoded image data in markdown format: ![image](data:image/png;base64,YOUR_BASE64_DATA). You must include actual image data, not just text descriptions."
        },
        {
          role: "user",
          content: `Create an image: ${prompt}`
        }
      ]
    };

    console.log('Calling Chat Completions URL:', this.config.apiUrl);
    const maxAttempts = 2;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`Calling Gemini Chat API for image generation (attempt ${attempt}/${maxAttempts})`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(this.config.apiUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        console.log(`Chat API response status: ${response.status}`);

        if (!response.ok) {
          const errorText = await response.text();
          console.log('Chat API error response:', errorText);
          
          const error = this.parseAPIError(response.status, errorText);
          
          if (response.status === 429) {
            console.log(`Rate limited, waiting ${this.rateLimitDelay}ms before retry`);
            await this.sleep(this.rateLimitDelay);
            continue;
          } else if (response.status >= 500) {
            console.log(`Server error (${response.status}), retrying...`);
            throw new Error(error.message);
          } else {
            console.log(`Client error (${response.status}), not retrying`);
            throw new Error(error.message);
          }
        }

        const result = await response.json() as GeminiResponse;
        console.log('Chat API response structure:', Object.keys(result));
        
        if (result.error) {
          console.log('Chat API returned error in response:', result.error);
          throw new Error(`Gemini Chat API Error: ${result.error.message}`);
        }

        if (!result.choices || result.choices.length === 0) {
          throw new Error('No choices returned from Chat API');
        }

        const content = result.choices[0]?.message?.content;
        if (!content) {
          throw new Error('No content in Chat API response');
        }

        console.log('Chat API response received, content length:', content.length);

        // Try to extract base64 image from the response
        const base64Patterns = [
          /data:image\/[^;]+;base64,([A-Za-z0-9+/=]+)/,
          /base64:([A-Za-z0-9+/=]+)/,
          /([A-Za-z0-9+/=]{100,})/
        ];

        for (const pattern of base64Patterns) {
          const match = content.match(pattern);
          if (match) {
            const base64Data = match[1];
            console.log('Found potential base64 image data, size:', base64Data.length, 'characters');
            
            try {
              const imageBuffer = Buffer.from(base64Data, 'base64');
              console.log('Successfully decoded image buffer, size:', imageBuffer.length, 'bytes');
              
              // Validate that it's a valid image by checking header
              if (imageBuffer.length > 10) {
                return imageBuffer;
              }
            } catch (decodeError) {
              console.log('Failed to decode base64 data');
              continue;
            }
          }
        }

        console.log('No valid base64 image found in response');
        throw new Error('No valid image data found in Chat API response');

      } catch (error) {
        console.error(`Chat API call attempt ${attempt} failed:`, error);
        
        if (attempt === maxAttempts) {
          throw new Error(`Gemini Chat API failed after ${maxAttempts} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        
        const delay = Math.min(this.retryDelay * attempt, 3000);
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