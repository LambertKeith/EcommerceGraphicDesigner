import React, { useState, useEffect } from 'react';
import { useApiConfigStore } from '../stores/apiConfigStore';
import { CreateApiConfigRequest, UpdateApiConfigRequest } from '../stores/apiConfigStore';

interface ConfigFormData extends Omit<CreateApiConfigRequest, 'api_key'> {
  api_key?: string; // 可选，因为编辑时可能不修改
}

const ApiSettingsPage: React.FC = () => {
  const {
    configurations,
    activeConfiguration,
    isLoading,
    isTesting,
    error,
    operationInProgress,
    purchaseInfo,
    fetchConfigurations,
    fetchActiveConfiguration,
    fetchPurchaseInfo,
    createConfiguration,
    updateConfiguration,
    activateConfiguration,
    deleteConfiguration,
    testConfiguration,
    clearError
  } = useApiConfigStore();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingConfig, setEditingConfig] = useState<string | null>(null);
  const [formData, setFormData] = useState<ConfigFormData>({
    name: '',
    description: '',
    api_key: '',
    base_url: 'https://api.laozhang.ai/v1/chat/completions',
    gemini_model: 'gemini-2.5-flash-image-preview',
    chatgpt_model: 'gpt-4o-image-vip',
    sora_model: 'sora_image',
    gemini_enabled: true,
    chatgpt_enabled: true,
    sora_enabled: true
  });
  
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    fetchConfigurations();
    fetchActiveConfiguration();
    fetchPurchaseInfo();
  }, []);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        clearError();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingConfig) {
      // 更新配置
      const updates: UpdateApiConfigRequest = { ...formData };
      if (!formData.api_key?.trim()) {
        delete updates.api_key; // 不更新密钥
      }
      
      const success = await updateConfiguration(editingConfig, updates);
      if (success) {
        setEditingConfig(null);
        resetForm();
      }
    } else {
      // 创建配置
      if (!formData.api_key?.trim()) {
        alert('请输入API密钥');
        return;
      }
      
      const newConfig = await createConfiguration(formData as CreateApiConfigRequest);
      if (newConfig) {
        setShowCreateForm(false);
        resetForm();
      } else {
        // 错误信息会由store设置，但我们可以提供额外的提示
        console.error('配置创建失败，请检查输入的信息');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      api_key: '',
      base_url: 'https://api.laozhang.ai/v1/chat/completions',
      gemini_model: 'gemini-2.5-flash-image-preview',
      chatgpt_model: 'gpt-4o-image-vip',
      sora_model: 'sora_image',
      gemini_enabled: true,
      chatgpt_enabled: true,
      sora_enabled: true
    });
    setShowApiKey(false);
  };

  const handleEdit = (configId: string) => {
    const config = configurations.find(c => c.id === configId);
    if (config) {
      setFormData({
        name: config.name,
        description: config.description || '',
        api_key: '', // 不显示现有密钥
        base_url: config.base_url,
        gemini_model: config.gemini_model,
        chatgpt_model: config.chatgpt_model,
        sora_model: config.sora_model,
        gemini_enabled: config.gemini_enabled,
        chatgpt_enabled: config.chatgpt_enabled,
        sora_enabled: config.sora_enabled
      });
      setEditingConfig(configId);
      setShowCreateForm(true);
    }
  };

  const handleCancel = () => {
    setShowCreateForm(false);
    setEditingConfig(null);
    resetForm();
  };

  const handleTest = async (configId: string) => {
    const result = await testConfiguration(configId);
    if (result.success) {
      alert('连接测试成功！');
    } else {
      alert(`连接测试失败：${result.message}`);
    }
  };

  const handleDelete = async (configId: string) => {
    if (confirm('确定要删除这个配置吗？')) {
      await deleteConfiguration(configId);
    }
  };

  const getModelStatus = (config: any, modelName: string) => {
    const status = config.connection_status?.[modelName];
    if (!status) return { icon: '❓', text: '未知', color: 'text-gray-500' };
    
    if (status.connected) {
      return { icon: '✅', text: '已连接', color: 'text-green-600' };
    } else {
      return { icon: '❌', text: status.error || '连接失败', color: 'text-red-600' };
    }
  };

  if (isLoading && configurations.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">加载配置中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">API配置管理</h1>
        <p className="text-gray-600">管理您的AI模型API密钥和配置</p>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <div className="text-red-400 mr-3">❌</div>
            <div>
              <p className="text-red-800 font-medium">操作失败</p>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
            <button 
              onClick={clearError}
              className="ml-auto text-red-400 hover:text-red-600"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 购买信息 */}
      {purchaseInfo && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">🔗 {purchaseInfo.provider.name}</h3>
          <p className="text-blue-800 text-sm mb-3">{purchaseInfo.provider.description}</p>
          <div className="flex flex-wrap gap-2">
            <a 
              href={purchaseInfo.purchase_links.main} 
              target="_blank" 
              rel="noopener noreferrer"
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              官网
            </a>
            <a 
              href={purchaseInfo.purchase_links.pricing} 
              target="_blank" 
              rel="noopener noreferrer"
              className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
            >
              价格
            </a>
            <a 
              href={purchaseInfo.purchase_links.register} 
              target="_blank" 
              rel="noopener noreferrer"
              className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
            >
              注册
            </a>
            <a 
              href={purchaseInfo.purchase_links.docs} 
              target="_blank" 
              rel="noopener noreferrer"
              className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
            >
              文档
            </a>
          </div>
        </div>
      )}

      {/* 活动配置状态 */}
      {activeConfiguration && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="text-lg font-semibold text-green-900 mb-3">🟢 当前活动配置</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="font-medium text-green-800">{activeConfiguration.name}</p>
              <p className="text-sm text-green-700">{activeConfiguration.description}</p>
              <p className="text-xs text-green-600 mt-1">
                密钥：{activeConfiguration.api_key_masked}
              </p>
            </div>
            <div className="space-y-1">
              {['gemini', 'chatgpt', 'sora'].map(model => {
                const status = getModelStatus(activeConfiguration, model);
                return (
                  <div key={model} className="flex items-center text-sm">
                    <span className="w-16 capitalize">{model}:</span>
                    <span className={`ml-2 ${status.color}`}>
                      {status.icon} {status.text}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="mb-6 flex justify-between items-center">
        <button
          onClick={() => setShowCreateForm(true)}
          disabled={operationInProgress.create}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {operationInProgress.create ? '创建中...' : '+ 新增配置'}
        </button>
        
        <button
          onClick={() => {
            fetchConfigurations();
            fetchActiveConfiguration();
          }}
          disabled={isLoading}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
        >
          {isLoading ? '刷新中...' : '🔄 刷新'}
        </button>
      </div>

      {/* 配置表单 */}
      {showCreateForm && (
        <div className="mb-6 p-6 bg-gray-50 border border-gray-200 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">
            {editingConfig ? '编辑配置' : '创建新配置'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  配置名称 *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例如：主配置"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  API密钥 {editingConfig ? '(留空不修改)' : '*'}
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? "text" : "password"}
                    name="api_key"
                    value={formData.api_key}
                    onChange={handleInputChange}
                    required={!editingConfig}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="输入您的API密钥"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                  >
                    {showApiKey ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                描述
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="配置描述（可选）"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API地址
              </label>
              <input
                type="url"
                name="base_url"
                value={formData.base_url}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gemini模型
                </label>
                <input
                  type="text"
                  name="gemini_model"
                  value={formData.gemini_model}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <label className="flex items-center mt-2">
                  <input
                    type="checkbox"
                    name="gemini_enabled"
                    checked={formData.gemini_enabled}
                    onChange={handleInputChange}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-600">启用Gemini</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ChatGPT模型
                </label>
                <input
                  type="text"
                  name="chatgpt_model"
                  value={formData.chatgpt_model}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <label className="flex items-center mt-2">
                  <input
                    type="checkbox"
                    name="chatgpt_enabled"
                    checked={formData.chatgpt_enabled}
                    onChange={handleInputChange}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-600">启用ChatGPT</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sora模型
                </label>
                <input
                  type="text"
                  name="sora_model"
                  value={formData.sora_model}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <label className="flex items-center mt-2">
                  <input
                    type="checkbox"
                    name="sora_enabled"
                    checked={formData.sora_enabled}
                    onChange={handleInputChange}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-600">启用Sora</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={operationInProgress.create || operationInProgress.update}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {operationInProgress.create || operationInProgress.update ? 
                  '处理中...' : 
                  (editingConfig ? '更新配置' : '创建配置')
                }
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 配置列表 */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">配置列表</h3>
        
        {configurations.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <p className="text-gray-600">暂无配置，点击"新增配置"开始使用</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {configurations.map(config => (
              <div
                key={config.id}
                className={`p-4 border rounded-lg ${
                  config.is_active 
                    ? 'border-green-300 bg-green-50' 
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <h4 className="text-lg font-medium text-gray-900">
                        {config.name}
                      </h4>
                      {config.is_active && (
                        <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                          活动中
                        </span>
                      )}
                    </div>
                    
                    {config.description && (
                      <p className="text-gray-600 text-sm mb-2">{config.description}</p>
                    )}
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">API密钥：</span>
                        <span className="text-gray-700">{config.api_key_masked}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">更新时间：</span>
                        <span className="text-gray-700">
                          {new Date(config.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">创建者：</span>
                        <span className="text-gray-700">{config.created_by}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">最后测试：</span>
                        <span className="text-gray-700">
                          {config.last_tested_at 
                            ? new Date(config.last_tested_at).toLocaleDateString()
                            : '未测试'
                          }
                        </span>
                      </div>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2">
                      {['gemini', 'chatgpt', 'sora'].map(model => {
                        const enabled = config[`${model}_enabled` as keyof typeof config] as boolean;
                        const status = getModelStatus(config, model);
                        return (
                          <span
                            key={model}
                            className={`px-2 py-1 text-xs rounded ${
                              enabled 
                                ? status.color.includes('green') 
                                  ? 'bg-green-100 text-green-800'
                                  : status.color.includes('red')
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {model.toUpperCase()}: {enabled ? status.text : '已禁用'}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex flex-col space-y-2 ml-4">
                    <button
                      onClick={() => handleTest(config.id)}
                      disabled={isTesting}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isTesting ? '测试中...' : '测试连接'}
                    </button>
                    
                    {!config.is_active && (
                      <button
                        onClick={() => activateConfiguration(config.id)}
                        disabled={operationInProgress.activate}
                        className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        {operationInProgress.activate ? '激活中...' : '激活'}
                      </button>
                    )}
                    
                    <button
                      onClick={() => handleEdit(config.id)}
                      disabled={operationInProgress.update}
                      className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700 disabled:opacity-50"
                    >
                      编辑
                    </button>
                    
                    {!config.is_active && (
                      <button
                        onClick={() => handleDelete(config.id)}
                        disabled={operationInProgress.delete}
                        className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
                      >
                        {operationInProgress.delete ? '删除中...' : '删除'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ApiSettingsPage;