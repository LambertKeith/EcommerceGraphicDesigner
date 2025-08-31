import fs from 'fs/promises';
import { fileStorage } from './fileStorage';
import { promptTemplateService, PromptContext } from './promptTemplate';

export interface ProcessImageOptions {
  type: 'optimize' | 'edit' | 'refine';
  prompt?: string;
  context?: Record<string, any>;
}

export interface ProcessImageResult {
  success: boolean;
  variants: Array<{
    imageBuffer: Buffer;
    score: number;
    metadata: Record<string, any>;
  }>;
  error?: string;
}

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

export class GeminiService {
  private apiKey: string;
  private apiUrl: string;
  private model: string;
  private maxRetries: number = 3;
  private retryDelay: number = 2000;
  private rateLimitDelay: number = 10000;

  constructor() {
    this.apiKey = process.env.GOOGLE_API_KEY || '';
    this.apiUrl = process.env.GEMINI_API_URL || 'https://api.laozhang.ai/v1/chat/completions';
    this.model = process.env.GEMINI_MODEL || 'gemini-2.5-flash-image-preview';
    
    if (!this.apiKey) {
      throw new Error('GOOGLE_API_KEY environment variable is required');
    }
  }

  async processImage(imagePath: string, options: ProcessImageOptions): Promise<ProcessImageResult> {
    try {
      const fullImagePath = fileStorage.getFullPath(imagePath);
      const imageBuffer = await fs.readFile(fullImagePath);
      
      const { base64Data, mimeType } = await this.prepareImageData(imageBuffer, imagePath);
      
      const promptTemplates = this.buildPromptTemplates(options);
      
      const variants: Array<{
        imageBuffer: Buffer;
        score: number;
        metadata: Record<string, any>;
      }> = [];

      for (let i = 0; i < promptTemplates.length; i++) {
        const template = promptTemplates[i];
        try {
          const processedImage = await this.callGeminiAPI(base64Data, mimeType, template.base);
          
          if (processedImage) {
            variants.push({
              imageBuffer: processedImage,
              score: this.calculateVariantScore(template, i),
              metadata: {
                prompt: template.base,
                type: options.type,
                variation: i + 1,
                processing_method: 'gemini_2.5_flash_image'
              }
            });
          }
        } catch (error) {
          console.error(`Variant ${i + 1} generation failed:`, error);
        }
      }

      if (variants.length === 0) {
        throw new Error('No variants were successfully generated');
      }

      return {
        success: true,
        variants
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

  private buildPromptTemplates(options: ProcessImageOptions): PromptTemplate[] {
    const context: PromptContext = {
      previousEdits: options.context?.previous_edits || [],
      productCategory: options.context?.product_category,
      desiredStyle: options.context?.desired_style,
      userPreferences: options.context?.user_preferences
    };

    const prompts = promptTemplateService.generatePromptsForProcessing(
      options.type,
      options.prompt,
      context
    );

    return prompts.map((prompt, index) => ({
      base: prompt,
      params: {
        type: options.type,
        variation: index + 1,
        hasUserPrompt: !!options.prompt,
        contextual: !!context.previousEdits?.length
      }
    }));
  }

  private async callGeminiAPI(base64Data: string, mimeType: string, prompt: string): Promise<Buffer | null> {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
    };

    const payload = {
      model: this.model,
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
        const timeoutId = setTimeout(() => controller.abort(), 120000); // 120 second timeout for image processing

        const response = await fetch(this.apiUrl, {
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

  private parseAPIError(status: number, errorText: string): { message: string; code: number } {
    try {
      const parsed = JSON.parse(errorText);
      return {
        message: parsed.error?.message || parsed.message || errorText,
        code: parsed.error?.code || status
      };
    } catch {
      const errorMessages: Record<number, string> = {
        400: 'Bad Request - Invalid request format or parameters',
        401: 'Unauthorized - Invalid or missing API key',
        403: 'Forbidden - API key does not have required permissions',
        404: 'Not Found - Model or endpoint not found',
        429: 'Rate Limit Exceeded - Too many requests',
        500: 'Internal Server Error - Gemini service error',
        502: 'Bad Gateway - Gemini service unavailable',
        503: 'Service Unavailable - Gemini service temporarily down'
      };
      
      return {
        message: errorMessages[status] || `HTTP ${status}: ${errorText}`,
        code: status
      };
    }
  }

  private calculateVariantScore(template: PromptTemplate, index: number): number {
    let score = 0.85 - (index * 0.05); // Higher score for first variants
    
    if (template.params?.hasUserPrompt) {
      score += 0.1; // Boost for custom user requests
    }
    
    if (template.params?.contextual) {
      score += 0.05; // Boost for contextual refinements
    }
    
    return Math.max(0.1, Math.min(1.0, score));
  }

  private getMimeTypeFromPath(imagePath: string): string {
    const ext = imagePath.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'webp':
        return 'image/webp';
      default:
        return 'image/jpeg';
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      // Create a small test image (1x1 pixel PNG in base64)
      const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAGA60e6kgAAAABJRU5ErkJggg==';
      
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      };

      const payload = {
        model: this.model,
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

      const response = await fetch(this.apiUrl, {
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