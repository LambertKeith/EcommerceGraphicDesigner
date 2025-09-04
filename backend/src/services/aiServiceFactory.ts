import { AIService, AIModelType, AIModelInfo } from './aiService';
import { GeminiService } from './gemini';
import { ChatGPTService } from './chatgpt';
import { SoraService } from './sora';
import { apiConfigService, ApiConfigurationWithKey } from './apiConfigService';

export class AIServiceFactory {
  private static services: Map<AIModelType, AIService> = new Map();
  private static availableModels: Set<AIModelType> = new Set();
  private static currentConfig: ApiConfigurationWithKey | null = null;
  private static configLoadedAt: Date | null = null;
  private static readonly CONFIG_CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

  // Initialize available models based on database configuration
  static {
    this.initializeModels().catch(error => {
      // Initialize silently on startup, proper logging will occur during configuration loading
      this.initializeFromEnvironment();
    });
  }

  /**
   * Initialize models from database configuration
   */
  private static async initializeModels(): Promise<void> {
    try {
      await this.loadConfiguration();
      if (this.currentConfig) {
        console.log('AI模型已从数据库配置初始化');
      }
    } catch (error) {
      // Silent fallback during initialization
      this.initializeFromEnvironment();
    }
  }

  /**
   * Fallback initialization from environment variables
   */
  private static initializeFromEnvironment(): void {
    try {
      this.availableModels.clear();
      
      // Check which models are configured via environment
      if (process.env.GEMINI_MODEL && process.env.GOOGLE_API_KEY) {
        this.availableModels.add('gemini');
      }
      
      if (process.env.CHATGPT_MODEL && process.env.GOOGLE_API_KEY) {
        this.availableModels.add('chatgpt');
      }
      
      if (process.env.SORA_MODEL && process.env.GOOGLE_API_KEY) {
        this.availableModels.add('sora');
      }

      if (this.availableModels.size > 0) {
        console.log('AI模型已从环境变量配置初始化:', Array.from(this.availableModels));
      }
    } catch (error) {
      console.error('Error initializing AI models from environment:', error);
    }
  }

  /**
   * Load configuration from database
   */
  private static async loadConfiguration(): Promise<void> {
    try {
      // Check if we need to refresh the configuration
      const now = new Date();
      if (this.currentConfig && this.configLoadedAt && 
          (now.getTime() - this.configLoadedAt.getTime()) < this.CONFIG_CACHE_TTL) {
        return; // Use cached configuration
      }

      const config = await apiConfigService.getActiveConfiguration();
      
      if (!config) {
        // This is normal for initial setup, not an error
        this.currentConfig = null;
        this.availableModels.clear();
        return;
      }

      this.currentConfig = config;
      this.configLoadedAt = now;
      
      // Update available models based on configuration
      this.availableModels.clear();
      
      if (config.gemini_enabled && config.gemini_model) {
        this.availableModels.add('gemini');
      }
      
      if (config.chatgpt_enabled && config.chatgpt_model) {
        this.availableModels.add('chatgpt');
      }
      
      if (config.sora_enabled && config.sora_model) {
        this.availableModels.add('sora');
      }

      console.log('已更新可用AI模型:', Array.from(this.availableModels));
      
      // Clear service cache to force recreation with new configuration
      this.services.clear();
    } catch (error) {
      // Only log as error if we have a database connection but configuration loading fails
      if (error instanceof Error && !error.message.includes('relation "api_configurations" does not exist')) {
        console.error('数据库API配置加载失败:', error.message);
      }
      throw error;
    }
  }

  /**
   * Get an AI service instance for the specified model
   */
  static async getService(modelType: AIModelType): Promise<AIService> {
    // Ensure we have the latest configuration
    await this.loadConfiguration();
    
    if (!this.availableModels.has(modelType)) {
      if (this.availableModels.size === 0) {
        throw new Error(`请先配置API密钥才能使用AI模型。访问设置页面进行配置。`);
      } else {
        throw new Error(`模型 ${modelType} 不可用或未配置。可用模型: ${Array.from(this.availableModels).join(', ')}`);
      }
    }

    // Use singleton pattern for service instances
    if (!this.services.has(modelType)) {
      this.services.set(modelType, await this.createService(modelType));
    }

    const service = this.services.get(modelType);
    if (!service) {
      throw new Error(`Failed to create service for model ${modelType}`);
    }

    return service;
  }

  /**
   * Create a new service instance with dynamic configuration
   */
  private static async createService(modelType: AIModelType): Promise<AIService> {
    // Ensure we have current configuration
    await this.loadConfiguration();
    
    if (!this.currentConfig) {
      // Fallback to environment-based service creation
      return this.createServiceFromEnvironment(modelType);
    }

    // Create service with database configuration
    switch (modelType) {
      case 'gemini':
        return new GeminiService({
          name: 'Gemini 2.5 Flash',
          apiKey: this.currentConfig.api_key,
          apiUrl: this.currentConfig.base_url,
          model: this.currentConfig.gemini_model,
          maxRetries: 3,
          retryDelay: 2000,
          timeout: 120000
        });
      case 'chatgpt':
        return new ChatGPTService({
          name: 'ChatGPT Vision',
          apiKey: this.currentConfig.api_key,
          apiUrl: this.currentConfig.base_url,
          model: this.currentConfig.chatgpt_model,
          maxRetries: 3,
          retryDelay: 2000,
          timeout: 120000
        });
      case 'sora':
        return new SoraService({
          name: 'Sora Image',
          apiKey: this.currentConfig.api_key,
          apiUrl: this.currentConfig.base_url,
          model: this.currentConfig.sora_model,
          maxRetries: 3,
          retryDelay: 2000,
          timeout: 120000
        });
      default:
        throw new Error(`Unsupported model type: ${modelType}`);
    }
  }

  /**
   * Fallback service creation from environment variables
   */
  private static createServiceFromEnvironment(modelType: AIModelType): AIService {
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
  static async getAvailableModels(): Promise<AIModelInfo[]> {
    try {
      await this.loadConfiguration();
      const models: AIModelInfo[] = [];
      
      for (const modelType of this.availableModels) {
        try {
          const service = await this.getService(modelType);
          models.push(service.getModelInfo());
        } catch (error) {
          console.error(`Failed to get info for model ${modelType}:`, error);
        }
      }

      return models;
    } catch (error) {
      // Return empty array silently for initial setup state
      return []; // No configuration available - this is normal for initial setup
    }
  }

  /**
   * Check if a model is available
   */
  static async isModelAvailable(modelType: AIModelType): Promise<boolean> {
    await this.loadConfiguration();
    return this.availableModels.has(modelType);
  }

  /**
   * Get the default model (prioritize Gemini, then ChatGPT, then Sora)
   */
  static async getDefaultModel(): Promise<AIModelType> {
    try {
      await this.loadConfiguration();
      const priority: AIModelType[] = ['gemini', 'chatgpt', 'sora'];
      
      for (const modelType of priority) {
        if (this.availableModels.has(modelType)) {
          return modelType;
        }
      }

      throw new Error('请先配置API密钥才能使用AI模型。访问设置页面进行配置。');
    } catch (error) {
      if (error instanceof Error && error.message.includes('Please configure your API settings first')) {
        throw error; // Re-throw configuration-specific errors
      }
      throw new Error('没有可用的AI模型。请检查您的配置设置。');
    }
  }

  /**
   * Test connection for all available models
   */
  static async testAllConnections(): Promise<Record<AIModelType, { success: boolean; error?: string }>> {
    await this.loadConfiguration();
    const results: Record<string, { success: boolean; error?: string }> = {};
    
    for (const modelType of this.availableModels) {
      try {
        const service = await this.getService(modelType);
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
      const service = await this.getService(modelType);
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
  static async getModelsByTaskSuitability(taskType: 'optimize' | 'edit' | 'refine'): Promise<Array<{
    model: AIModelType;
    score: number;
    available: boolean;
    capabilities: any;
    reason: string;
  }>> {
    await this.loadConfiguration();
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
      const available = await this.isModelAvailable(model);
      
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
  static async getRecommendedModel(taskType: 'optimize' | 'edit' | 'refine', userPreference?: AIModelType): Promise<AIModelType> {
    await this.loadConfiguration();
    
    // If user has a preference and it's available, use it
    if (userPreference && await this.isModelAvailable(userPreference)) {
      console.log(`Using user preferred model: ${userPreference} for ${taskType}`);
      return userPreference;
    }

    // Get models ranked by suitability
    const rankedModels = await this.getModelsByTaskSuitability(taskType);
    
    // Find the best available model
    const bestAvailableModel = rankedModels.find(model => model.available);
    
    if (bestAvailableModel) {
      console.log(`Selected model: ${bestAvailableModel.model} for ${taskType} (score: ${bestAvailableModel.score}, reason: ${bestAvailableModel.reason})`);
      return bestAvailableModel.model;
    }

    // Emergency fallback to default model
    console.warn(`No suitable models available for ${taskType}, falling back to default model`);
    return await this.getDefaultModel();
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
    await this.loadConfiguration();
    const rankedModels = await this.getModelsByTaskSuitability(taskType);
    const availableModels = rankedModels.filter(model => model.available);

    if (availableModels.length === 0) {
      return {
        success: false,
        error: 'No models available for processing'
      };
    }

    const fallbackChain: string[] = [];
    let lastError: string = '';

    // Try user preference first if provided and available
    if (userPreference && await this.isModelAvailable(userPreference)) {
      availableModels.unshift({
        model: userPreference,
        score: 999, // Highest priority
        available: true,
        capabilities: this.getModelCapabilities(userPreference)!,
        reason: 'User preference'
      });
    }

    for (const modelInfo of availableModels) {
      const model = modelInfo.model;
      fallbackChain.push(model);
      
      let retryCount = 0;
      while (retryCount < maxRetries) {
        try {
          console.log(`Attempting processing with ${model} (attempt ${retryCount + 1}/${maxRetries})`);
          
          const service = await this.getService(model);
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
  static async getModelStats(): Promise<{
    total: number;
    available: number;
    configured: number;
    models: Record<AIModelType, {
      configured: boolean;
      available: boolean;
      info?: AIModelInfo;
    }>;
  }> {
    await this.loadConfiguration();
    const allModels: AIModelType[] = ['gemini', 'chatgpt', 'sora'];
    const stats = {
      total: allModels.length,
      available: this.availableModels.size,
      configured: 0,
      models: {} as any
    };

    for (const modelType of allModels) {
      const isConfigured = await this.isModelConfigured(modelType);
      const isAvailable = this.availableModels.has(modelType);
      
      if (isConfigured) stats.configured++;

      stats.models[modelType] = {
        configured: isConfigured,
        available: isAvailable
      };

      if (isAvailable) {
        try {
          const service = await this.getService(modelType);
          stats.models[modelType].info = service.getModelInfo();
        } catch (error) {
          console.error(`Failed to get info for ${modelType}:`, error);
        }
      }
    }

    return stats;
  }

  /**
   * Check if a model is configured
   */
  private static async isModelConfigured(modelType: AIModelType): Promise<boolean> {
    await this.loadConfiguration();
    
    // First check database configuration
    if (this.currentConfig) {
      switch (modelType) {
        case 'gemini':
          return this.currentConfig.gemini_enabled && !!this.currentConfig.gemini_model;
        case 'chatgpt':
          return this.currentConfig.chatgpt_enabled && !!this.currentConfig.chatgpt_model;
        case 'sora':
          return this.currentConfig.sora_enabled && !!this.currentConfig.sora_model;
      }
    }
    
    // Fallback to environment variables
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
   * Force refresh configuration from database
   */
  static async refreshConfiguration(): Promise<void> {
    console.log('Forcing configuration refresh from database...');
    
    // Clear cache
    this.currentConfig = null;
    this.configLoadedAt = null;
    this.services.clear();
    
    // Reload configuration
    try {
      await this.loadConfiguration();
      console.log('Configuration refreshed successfully');
    } catch (error) {
      console.error('Failed to refresh configuration:', error);
      throw error;
    }
  }

  /**
   * Clear service cache (useful for testing or configuration changes)
   */
  static clearCache(): void {
    this.services.clear();
    this.currentConfig = null;
    this.configLoadedAt = null;
  }

  /**
   * Refresh available models (alias for refreshConfiguration)
   */
  static async refreshModels(): Promise<void> {
    await this.refreshConfiguration();
  }

  /**
   * Get current configuration summary (for debugging)
   */
  static async getConfigurationSummary(): Promise<{
    source: 'database' | 'environment' | 'none';
    config_name?: string;
    available_models: AIModelType[];
    cached_at?: Date;
    cache_expires_at?: Date;
  }> {
    await this.loadConfiguration();
    
    return {
      source: this.currentConfig ? 'database' : (process.env.GOOGLE_API_KEY ? 'environment' : 'none'),
      config_name: this.currentConfig?.name,
      available_models: Array.from(this.availableModels),
      cached_at: this.configLoadedAt || undefined,
      cache_expires_at: this.configLoadedAt ? 
        new Date(this.configLoadedAt.getTime() + this.CONFIG_CACHE_TTL) : undefined
    };
  }
}

// Note: Legacy exports removed due to async nature of new getService method
// Use AIServiceFactory.getService(modelType) directly instead

// Export the factory as default
export default AIServiceFactory;