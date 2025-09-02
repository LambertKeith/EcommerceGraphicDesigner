import { AIService, AIModelType, AIModelInfo } from './aiService';
import { GeminiService } from './gemini';
import { ChatGPTService } from './chatgpt';
import { SoraService } from './sora';

export class AIServiceFactory {
  private static services: Map<AIModelType, AIService> = new Map();
  private static availableModels: Set<AIModelType> = new Set();

  // Initialize available models based on environment configuration
  static {
    try {
      // Check which models are configured
      if (process.env.GEMINI_MODEL && process.env.GOOGLE_API_KEY) {
        this.availableModels.add('gemini');
      }
      
      if (process.env.CHATGPT_MODEL && process.env.GOOGLE_API_KEY) {
        this.availableModels.add('chatgpt');
      }
      
      if (process.env.SORA_MODEL && process.env.GOOGLE_API_KEY) {
        this.availableModels.add('sora');
      }

      console.log('Available AI models:', Array.from(this.availableModels));
    } catch (error) {
      console.error('Error initializing AI models:', error);
    }
  }

  /**
   * Get an AI service instance for the specified model
   */
  static getService(modelType: AIModelType): AIService {
    if (!this.availableModels.has(modelType)) {
      throw new Error(`Model ${modelType} is not available or not configured. Available models: ${Array.from(this.availableModels).join(', ')}`);
    }

    // Use singleton pattern for service instances
    if (!this.services.has(modelType)) {
      this.services.set(modelType, this.createService(modelType));
    }

    const service = this.services.get(modelType);
    if (!service) {
      throw new Error(`Failed to create service for model ${modelType}`);
    }

    return service;
  }

  /**
   * Create a new service instance
   */
  private static createService(modelType: AIModelType): AIService {
    switch (modelType) {
      case 'gemini':
        return new GeminiService();
      case 'chatgpt':
        return new ChatGPTService();
      case 'sora':
        return new SoraService();
      default:
        throw new Error(`Unsupported model type: ${modelType}`);
    }
  }

  /**
   * Get information about all available models
   */
  static getAvailableModels(): AIModelInfo[] {
    const models: AIModelInfo[] = [];
    
    for (const modelType of this.availableModels) {
      try {
        const service = this.getService(modelType);
        models.push(service.getModelInfo());
      } catch (error) {
        console.error(`Failed to get info for model ${modelType}:`, error);
      }
    }

    return models;
  }

  /**
   * Check if a model is available
   */
  static isModelAvailable(modelType: AIModelType): boolean {
    return this.availableModels.has(modelType);
  }

  /**
   * Get the default model (prioritize Gemini, then ChatGPT, then Sora)
   */
  static getDefaultModel(): AIModelType {
    const priority: AIModelType[] = ['gemini', 'chatgpt', 'sora'];
    
    for (const modelType of priority) {
      if (this.availableModels.has(modelType)) {
        return modelType;
      }
    }

    throw new Error('No AI models are available. Please check your configuration.');
  }

  /**
   * Test connection for all available models
   */
  static async testAllConnections(): Promise<Record<AIModelType, { success: boolean; error?: string }>> {
    const results: Record<string, { success: boolean; error?: string }> = {};
    
    for (const modelType of this.availableModels) {
      try {
        const service = this.getService(modelType);
        results[modelType] = await service.testConnection();
      } catch (error) {
        results[modelType] = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

    return results as Record<AIModelType, { success: boolean; error?: string }>;
  }

  /**
   * Test connection for a specific model
   */
  static async testConnection(modelType: AIModelType): Promise<{ success: boolean; error?: string }> {
    try {
      const service = this.getService(modelType);
      return await service.testConnection();
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Model capability matrix with quality scores and specializations
   */
  private static readonly CAPABILITY_MATRIX = {
    'gemini': {
      quality: 10,
      speed: 7,
      capabilities: ['optimize', 'edit', 'refine', 'background_replace'] as const,
      specializations: ['professional_photography', 'product_optimization', 'color_correction'],
      tier: 'premium' as const,
      cost: 'high' as const
    },
    'sora': {
      quality: 8,
      speed: 8,
      capabilities: ['optimize', 'edit', 'refine', 'artistic_style'] as const,
      specializations: ['creative_effects', 'artistic_transformation', 'style_transfer'],
      tier: 'creative' as const,
      cost: 'medium' as const
    },
    'chatgpt': {
      quality: 7,
      speed: 9,
      capabilities: ['optimize', 'edit', 'refine'] as const,
      specializations: ['general_editing', 'basic_enhancement', 'quick_fixes'],
      tier: 'standard' as const,
      cost: 'low' as const
    }
  };

  /**
   * Task complexity and requirements mapping
   */
  private static readonly TASK_REQUIREMENTS = {
    'optimize': {
      requiredCapabilities: ['optimize'] as const,
      preferredQuality: 9,
      description: 'Professional product image optimization'
    },
    'edit': {
      requiredCapabilities: ['edit'] as const,
      preferredQuality: 8,
      description: 'Advanced image editing and enhancement'
    },
    'refine': {
      requiredCapabilities: ['refine'] as const,
      preferredQuality: 7,
      description: 'Fine-tuning and detail refinement'
    }
  };

  /**
   * Get model capabilities and performance metrics
   */
  static getModelCapabilities(modelType: AIModelType) {
    return this.CAPABILITY_MATRIX[modelType] || null;
  }

  /**
   * Get all models sorted by suitability for a specific task
   */
  static getModelsByTaskSuitability(taskType: 'optimize' | 'edit' | 'refine'): Array<{
    model: AIModelType;
    score: number;
    available: boolean;
    capabilities: any;
    reason: string;
  }> {
    const requirements = this.TASK_REQUIREMENTS[taskType];
    const results: Array<{
      model: AIModelType;
      score: number;
      available: boolean;
      capabilities: any;
      reason: string;
    }> = [];

    for (const [modelType, capabilities] of Object.entries(this.CAPABILITY_MATRIX)) {
      const model = modelType as AIModelType;
      const available = this.isModelAvailable(model);
      
      // Calculate suitability score
      let score = 0;
      let reason = '';

      // Base quality score
      score += capabilities.quality;

      // Task capability bonus
      const hasRequiredCapabilities = requirements.requiredCapabilities.every(
        cap => capabilities.capabilities.includes(cap)
      );
      if (hasRequiredCapabilities) {
        score += 5;
        reason = `Excellent for ${taskType}`;
      } else {
        score -= 3;
        reason = `Limited ${taskType} capabilities`;
      }

      // Quality preference bonus
      if (capabilities.quality >= requirements.preferredQuality) {
        score += 3;
        reason += ', high quality results';
      }

      // Availability penalty
      if (!available) {
        score -= 10;
        reason = `Not available - ${reason}`;
      }

      results.push({
        model,
        score,
        available,
        capabilities,
        reason
      });
    }

    // Sort by score (highest first)
    return results.sort((a, b) => b.score - a.score);
  }
  /**
   * Get recommended model for a specific task with intelligent fallback
   */
  static getRecommendedModel(taskType: 'optimize' | 'edit' | 'refine', userPreference?: AIModelType): AIModelType {
    // If user has a preference and it's available, use it
    if (userPreference && this.isModelAvailable(userPreference)) {
      console.log(`Using user preferred model: ${userPreference} for ${taskType}`);
      return userPreference;
    }

    // Get models ranked by suitability
    const rankedModels = this.getModelsByTaskSuitability(taskType);
    
    // Find the best available model
    const bestAvailableModel = rankedModels.find(model => model.available);
    
    if (bestAvailableModel) {
      console.log(`Selected model: ${bestAvailableModel.model} for ${taskType} (score: ${bestAvailableModel.score}, reason: ${bestAvailableModel.reason})`);
      return bestAvailableModel.model;
    }

    // Emergency fallback to default model
    console.warn(`No suitable models available for ${taskType}, falling back to default model`);
    return this.getDefaultModel();
  }

  /**
   * Intelligent model fallback with retry logic
   */
  static async processWithFallback(
    taskType: 'optimize' | 'edit' | 'refine',
    processingFunction: (service: AIService) => Promise<any>,
    userPreference?: AIModelType,
    maxRetries: number = 3
  ): Promise<{
    success: boolean;
    result?: any;
    modelUsed?: AIModelType;
    fallbackChain?: string[];
    error?: string;
  }> {
    const rankedModels = this.getModelsByTaskSuitability(taskType)
      .filter(model => model.available);

    if (rankedModels.length === 0) {
      return {
        success: false,
        error: 'No models available for processing'
      };
    }

    const fallbackChain: string[] = [];
    let lastError: string = '';

    // Try user preference first if provided and available
    if (userPreference && this.isModelAvailable(userPreference)) {
      rankedModels.unshift({
        model: userPreference,
        score: 999, // Highest priority
        available: true,
        capabilities: this.getModelCapabilities(userPreference)!,
        reason: 'User preference'
      });
    }

    for (const modelInfo of rankedModels) {
      const model = modelInfo.model;
      fallbackChain.push(model);
      
      let retryCount = 0;
      while (retryCount < maxRetries) {
        try {
          console.log(`Attempting processing with ${model} (attempt ${retryCount + 1}/${maxRetries})`);
          
          const service = this.getService(model);
          const result = await processingFunction(service);
          
          console.log(`Successfully processed with ${model} after ${retryCount + 1} attempts`);
          
          return {
            success: true,
            result,
            modelUsed: model,
            fallbackChain
          };
          
        } catch (error) {
          lastError = error instanceof Error ? error.message : 'Unknown error';
          console.warn(`${model} failed (attempt ${retryCount + 1}/${maxRetries}): ${lastError}`);
          
          retryCount++;
          
          // Check if error indicates rate limiting or temporary unavailability
          if (lastError.includes('429') || lastError.includes('rate limit')) {
            console.log(`Rate limited by ${model}, trying next model in chain`);
            break; // Skip to next model
          }
          
          // For other errors, retry with same model
          if (retryCount < maxRetries) {
            const backoffDelay = Math.pow(2, retryCount) * 1000; // Exponential backoff
            console.log(`Retrying ${model} in ${backoffDelay}ms...`);
            await new Promise(resolve => setTimeout(resolve, backoffDelay));
          }
        }
      }
      
      console.log(`Model ${model} exhausted all retries, trying next model`);
    }

    return {
      success: false,
      error: `All models failed. Last error: ${lastError}`,
      fallbackChain
    };
  }

  /**
   * Get model statistics
   */
  static getModelStats(): {
    total: number;
    available: number;
    configured: number;
    models: Record<AIModelType, {
      configured: boolean;
      available: boolean;
      info?: AIModelInfo;
    }>;
  } {
    const allModels: AIModelType[] = ['gemini', 'chatgpt', 'sora'];
    const stats = {
      total: allModels.length,
      available: this.availableModels.size,
      configured: 0,
      models: {} as any
    };

    for (const modelType of allModels) {
      const isConfigured = this.isModelConfigured(modelType);
      const isAvailable = this.availableModels.has(modelType);
      
      if (isConfigured) stats.configured++;

      stats.models[modelType] = {
        configured: isConfigured,
        available: isAvailable
      };

      if (isAvailable) {
        try {
          stats.models[modelType].info = this.getService(modelType).getModelInfo();
        } catch (error) {
          console.error(`Failed to get info for ${modelType}:`, error);
        }
      }
    }

    return stats;
  }

  /**
   * Check if a model is configured (has required environment variables)
   */
  private static isModelConfigured(modelType: AIModelType): boolean {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) return false;

    switch (modelType) {
      case 'gemini':
        return !!process.env.GEMINI_MODEL;
      case 'chatgpt':
        return !!process.env.CHATGPT_MODEL;
      case 'sora':
        return !!process.env.SORA_MODEL;
      default:
        return false;
    }
  }

  /**
   * Clear service cache (useful for testing or configuration changes)
   */
  static clearCache(): void {
    this.services.clear();
  }

  /**
   * Refresh available models (useful after configuration changes)
   */
  static refreshModels(): void {
    this.availableModels.clear();
    this.services.clear();
    
    // Re-initialize
    if (process.env.GEMINI_MODEL && process.env.GOOGLE_API_KEY) {
      this.availableModels.add('gemini');
    }
    
    if (process.env.CHATGPT_MODEL && process.env.GOOGLE_API_KEY) {
      this.availableModels.add('chatgpt');
    }
    
    if (process.env.SORA_MODEL && process.env.GOOGLE_API_KEY) {
      this.availableModels.add('sora');
    }

    console.log('Refreshed available AI models:', Array.from(this.availableModels));
  }
}

// Legacy exports for backward compatibility
export const geminiService = AIServiceFactory.getService('gemini');

// Export the factory as default
export default AIServiceFactory;