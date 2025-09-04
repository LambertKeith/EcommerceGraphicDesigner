import { db } from './database';
import { ApiKeyEncryption } from '../utils/apiKeyEncryption';

export interface ApiConfiguration {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  base_url: string;
  gemini_model: string;
  chatgpt_model: string;
  sora_model: string;
  gemini_enabled: boolean;
  chatgpt_enabled: boolean;
  sora_enabled: boolean;
  config_json: Record<string, any>;
  last_tested_at?: Date;
  test_results_json: Record<string, any>;
  created_at: Date;
  updated_at: Date;
  created_by: string;
}

export interface ApiConfigurationWithKey extends ApiConfiguration {
  api_key: string; // Decrypted API key (only used internally)
}

export interface ApiConfigurationPublic extends Omit<ApiConfiguration, 'id'> {
  id: string;
  api_key_masked: string; // Masked API key for frontend display
  connection_status: Record<string, { 
    connected: boolean; 
    last_tested?: Date; 
    error?: string 
  }>;
}

export interface CreateApiConfigRequest {
  name: string;
  description?: string;
  api_key: string;
  base_url?: string;
  gemini_model?: string;
  chatgpt_model?: string;
  sora_model?: string;
  gemini_enabled?: boolean;
  chatgpt_enabled?: boolean;
  sora_enabled?: boolean;
}

export interface UpdateApiConfigRequest extends Partial<CreateApiConfigRequest> {
  is_active?: boolean;
}

export class ApiConfigurationService {
  
  /**
   * 获取活动的API配置
   */
  async getActiveConfiguration(): Promise<ApiConfigurationWithKey | null> {
    try {
      const result = await db.query(`
        SELECT * FROM api_configurations 
        WHERE is_active = true 
        LIMIT 1
      `);

      if (result.rows.length === 0) {
        // This is normal for initial setup, not an error to log
        return null;
      }

      const config = result.rows[0];
      
      // 解密API密钥
      let apiKey = '';
      try {
        apiKey = ApiKeyEncryption.decrypt(config.api_key_encrypted);
      } catch (error) {
        console.warn('活动配置的API密钥解密失败，需要重新配置');
        // 如果解密失败，返回null表示需要重新配置
        return null;
      }

      return {
        ...config,
        api_key: apiKey,
        config_json: config.config_json || {}
      };
    } catch (error) {
      // Only log as error if it's not a "table doesn't exist" error (initial setup)
      if (error instanceof Error && error.message.includes('relation "api_configurations" does not exist')) {
        // Database table doesn't exist yet - this is normal for initial setup
        return null;
      }
      console.error('获取活动配置时发生错误:', error);
      throw new Error('获取活动配置失败');
    }
  }

  /**
   * 获取所有配置（用于管理界面）
   */
  async getAllConfigurations(): Promise<ApiConfigurationPublic[]> {
    try {
      const result = await db.query(`
        SELECT * FROM api_configurations 
        ORDER BY is_active DESC, updated_at DESC
      `);

      return result.rows.map(config => this.formatPublicConfiguration(config));
    } catch (error) {
      console.error('Failed to get all configurations:', error);
      throw new Error('获取配置列表失败');
    }
  }

  /**
   * 根据ID获取配置
   */
  async getConfigurationById(id: string): Promise<ApiConfigurationPublic | null> {
    try {
      const result = await db.query(`
        SELECT * FROM api_configurations 
        WHERE id = $1
      `, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.formatPublicConfiguration(result.rows[0]);
    } catch (error) {
      console.error('Failed to get configuration by ID:', error);
      throw new Error('获取指定配置失败');
    }
  }

  /**
   * 创建新的API配置
   */
  async createConfiguration(config: CreateApiConfigRequest, createdBy: string = 'user'): Promise<ApiConfigurationPublic> {
    try {
      // 验证API密钥格式
      if (!config.api_key || config.api_key.trim().length < 10) {
        throw new Error('API密钥长度不能少于10个字符');
      }

      // 加密API密钥
      const encryptedApiKey = ApiKeyEncryption.encrypt(config.api_key.trim());

      // 如果这是第一个配置或明确设置为活动，则设为活动状态
      const isActive = await this.shouldSetAsActive(config.name);

      const result = await db.query(`
        INSERT INTO api_configurations (
          name, description, is_active, api_key_encrypted, base_url,
          gemini_model, chatgpt_model, sora_model,
          gemini_enabled, chatgpt_enabled, sora_enabled,
          created_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
        ) RETURNING *
      `, [
        config.name,
        config.description || null,
        isActive,
        encryptedApiKey,
        config.base_url || 'https://api.laozhang.ai/v1/chat/completions',
        config.gemini_model || 'gemini-2.5-flash-image-preview',
        config.chatgpt_model || 'gpt-4o-image-vip',
        config.sora_model || 'sora_image',
        config.gemini_enabled !== false, // 默认启用
        config.chatgpt_enabled !== false,
        config.sora_enabled !== false,
        createdBy
      ]);

      const newConfig = result.rows[0];
      
      console.log(`Created new API configuration: ${config.name}`);
      return this.formatPublicConfiguration(newConfig);
    } catch (error) {
      if (error instanceof Error && error.message.includes('duplicate key')) {
        throw new Error(`配置名称 "${config.name}" 已存在`);
      }
      console.error('Failed to create configuration:', error);
      throw new Error('创建配置失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  }

  /**
   * 更新API配置
   */
  async updateConfiguration(id: string, updates: UpdateApiConfigRequest, updatedBy: string = 'user'): Promise<ApiConfigurationPublic> {
    try {
      // 获取现有配置
      const existing = await db.query('SELECT * FROM api_configurations WHERE id = $1', [id]);
      if (existing.rows.length === 0) {
        throw new Error('配置不存在');
      }

      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let valueIndex = 1;

      // 构建动态更新查询
      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) {
          if (key === 'api_key') {
            // 加密新的API密钥
            updateFields.push(`api_key_encrypted = $${valueIndex}`);
            updateValues.push(ApiKeyEncryption.encrypt(value));
          } else {
            updateFields.push(`${key} = $${valueIndex}`);
            updateValues.push(value);
          }
          valueIndex++;
        }
      }

      if (updateFields.length === 0) {
        throw new Error('没有要更新的字段');
      }

      // 添加ID参数
      updateValues.push(id);

      const result = await db.query(`
        UPDATE api_configurations 
        SET ${updateFields.join(', ')}
        WHERE id = $${valueIndex}
        RETURNING *
      `, updateValues);

      console.log(`Updated API configuration: ${id}`);
      return this.formatPublicConfiguration(result.rows[0]);
    } catch (error) {
      console.error('Failed to update configuration:', error);
      throw new Error('更新配置失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  }

  /**
   * 激活指定配置
   */
  async activateConfiguration(id: string): Promise<void> {
    try {
      const result = await db.query(`
        UPDATE api_configurations 
        SET is_active = true 
        WHERE id = $1 
        RETURNING *
      `, [id]);

      if (result.rows.length === 0) {
        throw new Error('配置不存在');
      }

      console.log(`Activated API configuration: ${id}`);
    } catch (error) {
      console.error('Failed to activate configuration:', error);
      throw new Error('激活配置失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  }

  /**
   * 删除API配置
   */
  async deleteConfiguration(id: string): Promise<void> {
    try {
      // 检查是否是活动配置
      const config = await db.query('SELECT is_active FROM api_configurations WHERE id = $1', [id]);
      if (config.rows.length === 0) {
        throw new Error('配置不存在');
      }

      if (config.rows[0].is_active) {
        throw new Error('不能删除当前活动的配置，请先激活其他配置');
      }

      await db.query('DELETE FROM api_configurations WHERE id = $1', [id]);
      console.log(`Deleted API configuration: ${id}`);
    } catch (error) {
      console.error('Failed to delete configuration:', error);
      throw new Error('删除配置失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  }

  /**
   * 测试配置连接
   */
  async testConfiguration(id: string): Promise<Record<string, { success: boolean; error?: string }>> {
    try {
      // 获取配置
      const result = await db.query('SELECT * FROM api_configurations WHERE id = $1', [id]);
      if (result.rows.length === 0) {
        throw new Error('配置不存在');
      }

      const config = result.rows[0];
      let apiKey = '';
      
      try {
        apiKey = ApiKeyEncryption.decrypt(config.api_key_encrypted);
      } catch (error) {
        throw new Error('API密钥解密失败');
      }

      // 测试每个启用的模型
      const testResults: Record<string, { success: boolean; error?: string }> = {};

      // 这里可以导入AIService相关类进行真实连接测试
      // 为了简化，先返回模拟结果
      const modelsToTest = [
        { name: 'gemini', enabled: config.gemini_enabled },
        { name: 'chatgpt', enabled: config.chatgpt_enabled },
        { name: 'sora', enabled: config.sora_enabled }
      ];

      for (const model of modelsToTest) {
        if (model.enabled) {
          // TODO: 实现真实的连接测试
          testResults[model.name] = await this.testModelConnection(
            model.name, 
            apiKey, 
            config.base_url,
            config[`${model.name}_model`]
          );
        } else {
          testResults[model.name] = { success: false, error: '模型已禁用' };
        }
      }

      // 更新测试结果到数据库
      await db.query(`
        UPDATE api_configurations 
        SET last_tested_at = NOW(), test_results_json = $1
        WHERE id = $2
      `, [JSON.stringify(testResults), id]);

      return testResults;
    } catch (error) {
      console.error('Failed to test configuration:', error);
      throw new Error('测试配置失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  }

  /**
   * 检查是否需要首次配置
   */
  async needsInitialSetup(): Promise<boolean> {
    try {
      const result = await db.query(`
        SELECT COUNT(*) as count FROM api_configurations 
        WHERE api_key_encrypted != 'NEEDS_CONFIGURATION'
      `);

      const needsSetup = parseInt(result.rows[0].count) === 0;
      if (needsSetup) {
        console.info('检测到首次使用，需要进行API配置设置');
      }
      return needsSetup;
    } catch (error) {
      // If table doesn't exist, we definitely need initial setup
      if (error instanceof Error && error.message.includes('relation "api_configurations" does not exist')) {
        console.info('检测到首次使用，需要进行API配置设置');
        return true;
      }
      console.error('检查初始设置状态时发生错误:', error);
      return true; // 出错时假设需要设置
    }
  }

  /**
   * 私有方法：格式化公开配置信息
   */
  private formatPublicConfiguration(config: any): ApiConfigurationPublic {
    // 获取连接状态
    const testResults = config.test_results_json || {};
    const connectionStatus: Record<string, { connected: boolean; last_tested?: Date; error?: string }> = {};
    
    ['gemini', 'chatgpt', 'sora'].forEach(model => {
      const result = testResults[model];
      connectionStatus[model] = {
        connected: result?.success || false,
        last_tested: config.last_tested_at,
        error: result?.error
      };
    });

    return {
      id: config.id,
      name: config.name,
      description: config.description,
      is_active: config.is_active,
      base_url: config.base_url,
      gemini_model: config.gemini_model,
      chatgpt_model: config.chatgpt_model,
      sora_model: config.sora_model,
      gemini_enabled: config.gemini_enabled,
      chatgpt_enabled: config.chatgpt_enabled,
      sora_enabled: config.sora_enabled,
      config_json: config.config_json || {},
      last_tested_at: config.last_tested_at,
      test_results_json: config.test_results_json || {},
      created_at: config.created_at,
      updated_at: config.updated_at,
      created_by: config.created_by,
      api_key_masked: this.maskApiKey(config.api_key_encrypted),
      connection_status: connectionStatus
    };
  }

  /**
   * 私有方法：掩码API密钥
   */
  private maskApiKey(encryptedApiKey: string): string {
    if (encryptedApiKey === 'NEEDS_CONFIGURATION') {
      return '未设置';
    }
    
    try {
      const apiKey = ApiKeyEncryption.decrypt(encryptedApiKey);
      return ApiKeyEncryption.maskApiKey(apiKey);
    } catch (error) {
      return '解密失败';
    }
  }

  /**
   * 私有方法：判断是否应该设为活动配置
   */
  private async shouldSetAsActive(configName: string): Promise<boolean> {
    try {
      // 如果没有活动配置，设为活动
      const activeResult = await db.query(`
        SELECT COUNT(*) as count FROM api_configurations 
        WHERE is_active = true
      `);

      return parseInt(activeResult.rows[0].count) === 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * 私有方法：测试单个模型连接
   */
  private async testModelConnection(
    modelName: string, 
    apiKey: string, 
    baseUrl: string,
    modelId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // 简化的连接测试 - 检查API密钥格式和URL
      if (!apiKey || apiKey.length < 10) {
        return { success: false, error: 'API密钥无效' };
      }

      if (!baseUrl.startsWith('http')) {
        return { success: false, error: 'API地址格式无效' };
      }

      // TODO: 实现真实的API调用测试
      // 这里可以发送一个简单的测试请求到API端点
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '连接测试失败' 
      };
    }
  }
}

export const apiConfigService = new ApiConfigurationService();