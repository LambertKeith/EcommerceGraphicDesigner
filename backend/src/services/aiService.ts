export interface ProcessImageOptions {
  type: 'optimize' | 'edit' | 'refine';
  prompt?: string;
  context?: Record<string, any>;
  maskData?: string; // base64 encoded mask for selective editing
  secondImagePath?: string; // path to second image for dual-image features
}

export interface GenerateImageOptions {
  prompt: string;
  style?: string;
  size?: string;
  negativePrompt?: string;
  context?: Record<string, any>;
}

export interface GenerateImageResult {
  success: boolean;
  imageBuffer?: Buffer;
  metadata?: Record<string, any>;
  error?: string;
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

export interface AIModelConfig {
  name: string;
  apiKey: string;
  apiUrl: string;
  model: string;
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
}

export type AIModelType = 'gemini' | 'chatgpt' | 'sora';

export interface AIModelInfo {
  id: AIModelType;
  name: string;
  description: string;
  capabilities: string[];
  speed: 'fast' | 'medium' | 'slow';
  quality: 'standard' | 'high' | 'premium';
  recommended: string[];
}

export abstract class AIService {
  protected config: AIModelConfig;
  protected maxRetries: number;
  protected retryDelay: number;
  protected timeout: number;

  constructor(config: AIModelConfig) {
    this.config = config;
    this.maxRetries = config.maxRetries || 3;
    this.retryDelay = config.retryDelay || 2000;
    this.timeout = config.timeout || 120000;
    
    if (!config.apiKey) {
      throw new Error(`API key is required for ${config.name} service`);
    }
  }

  // Abstract methods that must be implemented by concrete services
  abstract processImage(imagePath: string, options: ProcessImageOptions): Promise<ProcessImageResult>;
  abstract generateImage(options: GenerateImageOptions): Promise<GenerateImageResult>;
  abstract testConnection(): Promise<{ success: boolean; error?: string }>;
  
  // Common utility methods
  protected async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  protected getMimeTypeFromPath(imagePath: string): string {
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

  protected calculateVariantScore(template: any, index: number, hasUserPrompt: boolean, isContextual: boolean): number {
    let score = 0.85 - (index * 0.05); // Higher score for first variants
    
    if (hasUserPrompt) {
      score += 0.1; // Boost for custom user requests
    }
    
    if (isContextual) {
      score += 0.05; // Boost for contextual refinements
    }
    
    return Math.max(0.1, Math.min(1.0, score));
  }

  protected parseAPIError(status: number, errorText: string): { message: string; code: number } {
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
        500: 'Internal Server Error - AI service error',
        502: 'Bad Gateway - AI service unavailable',
        503: 'Service Unavailable - AI service temporarily down'
      };
      
      return {
        message: errorMessages[status] || `HTTP ${status}: ${errorText}`,
        code: status
      };
    }
  }

  // Get model information
  abstract getModelInfo(): AIModelInfo;

  // Get configuration info
  getConfig(): Omit<AIModelConfig, 'apiKey'> {
    const { apiKey, ...publicConfig } = this.config;
    return publicConfig;
  }
}