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
   * Get recommended model for a specific task
   */
  static getRecommendedModel(taskType: 'optimize' | 'edit' | 'refine', userPreference?: AIModelType): AIModelType {
    // If user has a preference and it's available, use it
    if (userPreference && this.isModelAvailable(userPreference)) {
      return userPreference;
    }

    // Task-specific recommendations
    switch (taskType) {
      case 'optimize':
        // For optimization, prioritize speed (Gemini)
        if (this.isModelAvailable('gemini')) return 'gemini';
        if (this.isModelAvailable('chatgpt')) return 'chatgpt';
        if (this.isModelAvailable('sora')) return 'sora';
        break;

      case 'edit':
        // For complex editing, prioritize quality (ChatGPT)
        if (this.isModelAvailable('chatgpt')) return 'chatgpt';
        if (this.isModelAvailable('gemini')) return 'gemini';
        if (this.isModelAvailable('sora')) return 'sora';
        break;

      case 'refine':
        // For refinement, can use any available model
        if (this.isModelAvailable('chatgpt')) return 'chatgpt';
        if (this.isModelAvailable('gemini')) return 'gemini';
        if (this.isModelAvailable('sora')) return 'sora';
        break;
    }

    // Fallback to default
    return this.getDefaultModel();
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