import express from 'express';
import { apiConfigService, CreateApiConfigRequest, UpdateApiConfigRequest } from '../services/apiConfigService';
import { ApiKeyEncryption } from '../utils/apiKeyEncryption';

const router = express.Router();

/**
 * GET /api/config/status
 * 检查系统初始化状态
 */
router.get('/status', async (req, res) => {
  try {
    const needsSetup = await apiConfigService.needsInitialSetup();
    const activeConfig = await apiConfigService.getActiveConfiguration();
    
    res.json({
      success: true,
      data: {
        needs_initial_setup: needsSetup,
        has_active_config: !!activeConfig,
        encryption_test: ApiKeyEncryption.test() // 验证加密功能
      }
    });
  } catch (error) {
    console.error('Failed to get config status:', error);
    res.status(500).json({
      success: false,
      error: '获取系统状态失败',
      code: 'E_CONFIG_STATUS_FAILED'
    });
  }
});

/**
 * GET /api/config/configurations
 * 获取所有API配置（管理界面用）
 */
router.get('/configurations', async (req, res) => {
  try {
    const configurations = await apiConfigService.getAllConfigurations();
    
    res.json({
      success: true,
      data: configurations
    });
  } catch (error) {
    console.error('Failed to get configurations:', error);
    res.status(500).json({
      success: false,
      error: '获取配置列表失败',
      code: 'E_CONFIG_LIST_FAILED'
    });
  }
});

/**
 * GET /api/config/configurations/:id
 * 获取指定API配置
 */
router.get('/configurations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const configuration = await apiConfigService.getConfigurationById(id);
    
    if (!configuration) {
      return res.status(404).json({
        success: false,
        error: '配置不存在',
        code: 'E_CONFIG_NOT_FOUND'
      });
    }
    
    res.json({
      success: true,
      data: configuration
    });
  } catch (error) {
    console.error('Failed to get configuration:', error);
    res.status(500).json({
      success: false,
      error: '获取配置失败',
      code: 'E_CONFIG_GET_FAILED'
    });
  }
});

/**
 * POST /api/config/configurations
 * 创建新的API配置
 */
router.post('/configurations', async (req, res) => {
  try {
    const configData: CreateApiConfigRequest = req.body;
    
    // 验证必需字段
    if (!configData.name?.trim()) {
      return res.status(400).json({
        success: false,
        error: '配置名称不能为空',
        code: 'E_INVALID_NAME'
      });
    }

    if (!configData.api_key?.trim()) {
      return res.status(400).json({
        success: false,
        error: 'API密钥不能为空',
        code: 'E_INVALID_API_KEY'
      });
    }

    // 获取创建者信息（这里简化处理，实际应该从认证中间件获取）
    const createdBy = req.headers['x-user-id'] as string || 'anonymous';
    
    const configuration = await apiConfigService.createConfiguration(configData, createdBy);
    
    res.status(201).json({
      success: true,
      data: configuration,
      message: '配置创建成功'
    });
  } catch (error) {
    console.error('Failed to create configuration:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : '创建配置失败',
      code: 'E_CONFIG_CREATE_FAILED'
    });
  }
});

/**
 * PUT /api/config/configurations/:id
 * 更新API配置
 */
router.put('/configurations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates: UpdateApiConfigRequest = req.body;
    
    // 获取更新者信息
    const updatedBy = req.headers['x-user-id'] as string || 'anonymous';
    
    const configuration = await apiConfigService.updateConfiguration(id, updates, updatedBy);
    
    res.json({
      success: true,
      data: configuration,
      message: '配置更新成功'
    });
  } catch (error) {
    console.error('Failed to update configuration:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : '更新配置失败',
      code: 'E_CONFIG_UPDATE_FAILED'
    });
  }
});

/**
 * POST /api/config/configurations/:id/activate
 * 激活指定配置
 */
router.post('/configurations/:id/activate', async (req, res) => {
  try {
    const { id } = req.params;
    
    await apiConfigService.activateConfiguration(id);
    
    res.json({
      success: true,
      message: '配置激活成功'
    });
  } catch (error) {
    console.error('Failed to activate configuration:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : '激活配置失败',
      code: 'E_CONFIG_ACTIVATE_FAILED'
    });
  }
});

/**
 * DELETE /api/config/configurations/:id
 * 删除API配置
 */
router.delete('/configurations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await apiConfigService.deleteConfiguration(id);
    
    res.json({
      success: true,
      message: '配置删除成功'
    });
  } catch (error) {
    console.error('Failed to delete configuration:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : '删除配置失败',
      code: 'E_CONFIG_DELETE_FAILED'
    });
  }
});

/**
 * POST /api/config/configurations/:id/test
 * 测试指定配置的连接
 */
router.post('/configurations/:id/test', async (req, res) => {
  try {
    const { id } = req.params;
    
    const testResults = await apiConfigService.testConfiguration(id);
    
    // 检查是否有任何模型连接成功
    const hasSuccess = Object.values(testResults).some(result => result.success);
    
    res.json({
      success: hasSuccess,
      data: testResults,
      message: hasSuccess ? '连接测试完成' : '所有模型连接测试失败'
    });
  } catch (error) {
    console.error('Failed to test configuration:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : '连接测试失败',
      code: 'E_CONFIG_TEST_FAILED'
    });
  }
});

/**
 * GET /api/config/active
 * 获取当前活动配置（不包含敏感信息）
 */
router.get('/active', async (req, res) => {
  try {
    const activeConfig = await apiConfigService.getActiveConfiguration();
    
    if (!activeConfig) {
      return res.status(404).json({
        success: false,
        error: '没有活动配置',
        code: 'E_NO_ACTIVE_CONFIG'
      });
    }
    
    // 返回公开信息，不包含API密钥
    const publicConfig = {
      id: activeConfig.id,
      name: activeConfig.name,
      description: activeConfig.description,
      base_url: activeConfig.base_url,
      gemini_model: activeConfig.gemini_model,
      chatgpt_model: activeConfig.chatgpt_model,
      sora_model: activeConfig.sora_model,
      gemini_enabled: activeConfig.gemini_enabled,
      chatgpt_enabled: activeConfig.chatgpt_enabled,
      sora_enabled: activeConfig.sora_enabled,
      api_key_masked: ApiKeyEncryption.maskApiKey(activeConfig.api_key),
      last_tested_at: activeConfig.last_tested_at
    };
    
    res.json({
      success: true,
      data: publicConfig
    });
  } catch (error) {
    console.error('Failed to get active configuration:', error);
    res.status(500).json({
      success: false,
      error: '获取活动配置失败',
      code: 'E_ACTIVE_CONFIG_FAILED'
    });
  }
});

/**
 * GET /api/config/purchase-info
 * 获取购买信息和跳转链接
 */
router.get('/purchase-info', async (req, res) => {
  try {
    const purchaseInfo = {
      provider: {
        name: '老张API',
        website: 'https://api.laozhang.ai',
        description: '提供Gemini、ChatGPT、Sora等多种AI模型API服务'
      },
      models: [
        {
          name: 'Gemini 2.5 Flash',
          tier: 'premium',
          description: '最强大的图像处理能力，专业产品摄影优化',
          features: ['顶级图像优化', '智能背景处理', '专业修图', '完美细节处理'],
          recommended_for: ['专业产品摄影', '高端图像处理', '商业级修图', '品牌宣传图']
        },
        {
          name: 'Sora Image',
          tier: 'creative',
          description: '创意艺术处理和视觉创新',
          features: ['创意效果', '艺术转换', '风格迁移', '视觉创新'],
          recommended_for: ['艺术创作', '创意设计', '风格实验', '视觉艺术']
        },
        {
          name: 'ChatGPT Vision',
          tier: 'standard',
          description: '标准图像编辑和基础优化',
          features: ['通用编辑', '基础增强', '快速修复', '日常处理'],
          recommended_for: ['日常编辑', '基础优化', '简单修图', '入门级处理']
        }
      ],
      purchase_links: {
        main: 'https://api.laozhang.ai',
        pricing: 'https://api.laozhang.ai/pricing',
        register: 'https://api.laozhang.ai/register',
        docs: 'https://api.laozhang.ai/docs'
      },
      support: {
        email: 'support@laozhang.ai',
        qq: 'QQ群：123456789',
        wechat: '微信客服：laozhang_api'
      }
    };
    
    res.json({
      success: true,
      data: purchaseInfo
    });
  } catch (error) {
    console.error('Failed to get purchase info:', error);
    res.status(500).json({
      success: false,
      error: '获取购买信息失败',
      code: 'E_PURCHASE_INFO_FAILED'
    });
  }
});

export default router;