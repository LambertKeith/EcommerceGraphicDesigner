import React, { useState, useEffect } from 'react';
import { useApiConfigStore } from '../stores/apiConfigStore';
import { CreateApiConfigRequest } from '../stores/apiConfigStore';

interface WizardStep {
  id: number;
  title: string;
  description: string;
  completed: boolean;
}

const InitialSetupWizard: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const {
    purchaseInfo,
    isLoading,
    error,
    operationInProgress,
    fetchPurchaseInfo,
    createConfiguration,
    testConfiguration,
    clearError
  } = useApiConfigStore();

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<CreateApiConfigRequest>({
    name: '主配置',
    description: '系统默认配置',
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
  const [testResults, setTestResults] = useState<any>(null);
  const [createdConfigId, setCreatedConfigId] = useState<string | null>(null);

  const steps: WizardStep[] = [
    {
      id: 1,
      title: '欢迎使用',
      description: '了解AI图像编辑器和API配置',
      completed: currentStep > 1
    },
    {
      id: 2,
      title: '获取API密钥',
      description: '了解如何购买和获取API密钥',
      completed: currentStep > 2
    },
    {
      id: 3,
      title: '配置API',
      description: '输入API密钥和模型配置',
      completed: currentStep > 3
    },
    {
      id: 4,
      title: '测试连接',
      description: '验证API配置是否正确',
      completed: currentStep > 4
    },
    {
      id: 5,
      title: '完成设置',
      description: '开始使用AI图像编辑功能',
      completed: currentStep > 5
    }
  ];

  useEffect(() => {
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

  const handleNext = () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCreateConfig = async () => {
    if (!formData.api_key.trim()) {
      alert('请输入API密钥');
      return;
    }

    const newConfig = await createConfiguration(formData);
    if (newConfig) {
      // 使用实际创建的配置ID
      setCreatedConfigId(newConfig.id);
      handleNext();
    } else {
      // 如果创建失败，显示用户友好的错误信息
      alert('配置创建失败，请检查API密钥是否正确并重试');
    }
  };

  const handleTestConnection = async () => {
    if (!createdConfigId) {
      alert('配置ID丢失，请重新创建配置');
      setCurrentStep(3);
      return;
    }

    const result = await testConfiguration(createdConfigId);
    setTestResults(result);
    
    if (result.success) {
      handleNext();
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="text-center py-8">
            <div className="text-6xl mb-6">🎨</div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              欢迎使用AI图像编辑器
            </h2>
            <p className="text-lg text-gray-600 mb-6 max-w-2xl mx-auto">
              这是一个强大的AI驱动图像编辑工具，支持多种AI模型：
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl mb-2">🧠</div>
                <h3 className="font-semibold text-blue-900">Gemini 2.5 Flash</h3>
                <p className="text-sm text-blue-800">顶级AI处理，最强大的图像优化能力</p>
              </div>
              
              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl mb-2">🎭</div>
                <h3 className="font-semibold text-purple-900">Sora Image</h3>
                <p className="text-sm text-purple-800">创意艺术处理，独特的视觉效果</p>
              </div>
              
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-2xl mb-2">💬</div>
                <h3 className="font-semibold text-green-900">ChatGPT Vision</h3>
                <p className="text-sm text-green-800">标准图像编辑，日常使用首选</p>
              </div>
            </div>

            <p className="text-gray-600 mb-6">
              要开始使用，您需要配置API密钥。让我们引导您完成设置过程。
            </p>
          </div>
        );

      case 2:
        return (
          <div className="py-8">
            <div className="text-center mb-8">
              <div className="text-5xl mb-4">🔑</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                获取API密钥
              </h2>
              <p className="text-gray-600 mb-6">
                您需要从老张API平台获取API密钥来使用AI模型服务
              </p>
            </div>

            {purchaseInfo && (
              <div className="max-w-2xl mx-auto">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                  <h3 className="text-xl font-semibold text-blue-900 mb-4">
                    🏢 {purchaseInfo.provider.name}
                  </h3>
                  <p className="text-blue-800 mb-4">{purchaseInfo.provider.description}</p>
                  
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <a 
                      href={purchaseInfo.purchase_links.register} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block p-4 bg-blue-600 text-white text-center rounded hover:bg-blue-700 transition-colors"
                    >
                      <div className="text-2xl mb-2">📝</div>
                      <div className="font-medium">注册账号</div>
                      <div className="text-sm opacity-90">创建新账户</div>
                    </a>
                    
                    <a 
                      href={purchaseInfo.purchase_links.pricing} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block p-4 bg-green-600 text-white text-center rounded hover:bg-green-700 transition-colors"
                    >
                      <div className="text-2xl mb-2">💰</div>
                      <div className="font-medium">查看价格</div>
                      <div className="text-sm opacity-90">选择合适套餐</div>
                    </a>
                  </div>

                  <div className="bg-white p-4 rounded border">
                    <h4 className="font-medium text-gray-900 mb-3">📞 客服支持</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                      <div>
                        <span className="text-gray-600">邮箱：</span>
                        <span className="text-gray-900">{purchaseInfo.support.email}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">QQ：</span>
                        <span className="text-gray-900">{purchaseInfo.support.qq}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">微信：</span>
                        <span className="text-gray-900">{purchaseInfo.support.wechat}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-medium text-yellow-800 mb-2">💡 获取步骤</h4>
                  <ol className="text-sm text-yellow-700 space-y-1">
                    <li>1. 点击上方"注册账号"链接</li>
                    <li>2. 完成账户注册和实名认证</li>
                    <li>3. 查看价格并选择合适的套餐</li>
                    <li>4. 充值购买API调用次数</li>
                    <li>5. 在控制台获取您的API密钥</li>
                  </ol>
                </div>
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="py-8">
            <div className="text-center mb-8">
              <div className="text-5xl mb-4">⚙️</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                配置API设置
              </h2>
              <p className="text-gray-600 mb-6">
                请输入您的API密钥和模型配置
              </p>
            </div>

            <div className="max-w-2xl mx-auto">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    配置名称
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="例如：主配置"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    API密钥 *
                  </label>
                  <div className="relative">
                    <input
                      type={showApiKey ? "text" : "password"}
                      name="api_key"
                      value={formData.api_key}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="输入从老张API获取的密钥"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                    >
                      {showApiKey ? '🙈' : '👁️'}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    密钥将被安全加密存储，不会以明文保存
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    API地址
                  </label>
                  <input
                    type="url"
                    name="base_url"
                    value={formData.base_url}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    通常使用默认地址即可
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    启用的模型
                  </label>
                  <div className="space-y-3">
                    <label className="flex items-center p-3 border border-gray-200 rounded-lg">
                      <input
                        type="checkbox"
                        name="gemini_enabled"
                        checked={formData.gemini_enabled}
                        onChange={handleInputChange}
                        className="mr-3"
                      />
                      <div>
                        <div className="font-medium text-gray-900">Gemini 2.5 Flash</div>
                        <div className="text-sm text-gray-600">最强大的图像处理能力，适合专业用途</div>
                      </div>
                    </label>

                    <label className="flex items-center p-3 border border-gray-200 rounded-lg">
                      <input
                        type="checkbox"
                        name="chatgpt_enabled"
                        checked={formData.chatgpt_enabled}
                        onChange={handleInputChange}
                        className="mr-3"
                      />
                      <div>
                        <div className="font-medium text-gray-900">ChatGPT Vision</div>
                        <div className="text-sm text-gray-600">标准图像编辑，日常使用首选</div>
                      </div>
                    </label>

                    <label className="flex items-center p-3 border border-gray-200 rounded-lg">
                      <input
                        type="checkbox"
                        name="sora_enabled"
                        checked={formData.sora_enabled}
                        onChange={handleInputChange}
                        className="mr-3"
                      />
                      <div>
                        <div className="font-medium text-gray-900">Sora Image</div>
                        <div className="text-sm text-gray-600">创意艺术处理，独特的视觉效果</div>
                      </div>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    配置描述（可选）
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="描述这个配置的用途..."
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="py-8">
            <div className="text-center mb-8">
              <div className="text-5xl mb-4">🔍</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                测试API连接
              </h2>
              <p className="text-gray-600 mb-6">
                验证您的API配置是否正确设置
              </p>
            </div>

            <div className="max-w-2xl mx-auto">
              {!testResults ? (
                <div className="text-center">
                  <p className="text-gray-600 mb-6">点击下方按钮测试API连接</p>
                  <button
                    onClick={handleTestConnection}
                    disabled={!createdConfigId || isLoading}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isLoading ? '测试中...' : '🚀 开始测试'}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {testResults.success ? (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center mb-3">
                        <div className="text-green-600 text-xl mr-2">✅</div>
                        <h3 className="text-lg font-semibold text-green-900">连接测试成功！</h3>
                      </div>
                      <p className="text-green-800 mb-4">所有启用的模型都可以正常连接</p>
                    </div>
                  ) : (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center mb-3">
                        <div className="text-red-600 text-xl mr-2">❌</div>
                        <h3 className="text-lg font-semibold text-red-900">连接测试失败</h3>
                      </div>
                      <p className="text-red-800 mb-4">{testResults.message}</p>
                    </div>
                  )}

                  {testResults.data && (
                    <div className="space-y-3">
                      {Object.entries(testResults.data).map(([model, result]: [string, any]) => (
                        <div
                          key={model}
                          className={`p-3 border rounded-lg ${
                            result.success 
                              ? 'bg-green-50 border-green-200' 
                              : 'bg-red-50 border-red-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium capitalize">{model}</span>
                            <span className={result.success ? 'text-green-600' : 'text-red-600'}>
                              {result.success ? '✅ 成功' : '❌ 失败'}
                            </span>
                          </div>
                          {result.error && (
                            <p className="text-sm text-red-600 mt-1">{result.error}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {!testResults.success && (
                    <div className="text-center pt-4">
                      <button
                        onClick={() => setCurrentStep(3)}
                        className="px-4 py-2 text-blue-600 border border-blue-300 rounded hover:bg-blue-50 mr-3"
                      >
                        返回修改配置
                      </button>
                      <button
                        onClick={handleTestConnection}
                        disabled={isLoading}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                      >
                        重新测试
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );

      case 5:
        return (
          <div className="text-center py-8">
            <div className="text-6xl mb-6">🎉</div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              设置完成！
            </h2>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
              恭喜！您已经成功配置了AI图像编辑器。现在可以开始使用强大的AI功能来编辑和优化您的图像了。
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 max-w-2xl mx-auto">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl mb-2">🖼️</div>
                <h3 className="font-semibold text-blue-900">上传图像</h3>
                <p className="text-sm text-blue-800">拖拽或点击上传您要编辑的图像</p>
              </div>
              
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-2xl mb-2">🎨</div>
                <h3 className="font-semibold text-green-900">AI处理</h3>
                <p className="text-sm text-green-800">选择处理模式，让AI为您优化图像</p>
              </div>
              
              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl mb-2">⚙️</div>
                <h3 className="font-semibold text-purple-900">管理配置</h3>
                <p className="text-sm text-purple-800">随时在设置页面修改API配置</p>
              </div>
              
              <div className="p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl mb-2">📥</div>
                <h3 className="font-semibold text-orange-900">下载结果</h3>
                <p className="text-sm text-orange-800">处理完成后下载您的图像</p>
              </div>
            </div>

            <button
              onClick={onComplete}
              className="px-8 py-3 bg-green-600 text-white text-lg rounded-lg hover:bg-green-700"
            >
              🚀 开始使用
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-screen overflow-y-auto m-4">
        {/* 头部进度条 */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">初始设置向导</h1>
            <span className="text-sm text-gray-600">
              步骤 {currentStep} / {steps.length}
            </span>
          </div>
          
          <div className="flex items-center space-x-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                    step.completed
                      ? 'bg-green-600 text-white'
                      : currentStep === step.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {step.completed ? '✓' : step.id}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`w-12 h-0.5 ml-2 ${
                      step.completed ? 'bg-green-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 内容区域 */}
        <div className="p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <div className="text-red-400 mr-3">❌</div>
                <div className="flex-1">
                  <p className="text-red-800 font-medium">操作失败</p>
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
                <button 
                  onClick={clearError}
                  className="text-red-400 hover:text-red-600"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {renderStepContent()}
        </div>

        {/* 底部操作按钮 */}
        <div className="p-6 border-t border-gray-200 flex justify-between">
          <button
            onClick={handlePrev}
            disabled={currentStep === 1}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← 上一步
          </button>

          {currentStep === 3 ? (
            <button
              onClick={handleCreateConfig}
              disabled={operationInProgress.create || !formData.api_key.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {operationInProgress.create ? '创建中...' : '创建配置 →'}
            </button>
          ) : currentStep === 5 ? (
            <button
              onClick={onComplete}
              className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              完成设置 🎉
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={
                (currentStep === 4 && (!testResults || !testResults.success)) ||
                operationInProgress.create
              }
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              下一步 →
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default InitialSetupWizard;