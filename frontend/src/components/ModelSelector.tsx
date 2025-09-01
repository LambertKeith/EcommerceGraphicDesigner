import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Brain, Sparkles, Clock, Award, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { apiService } from '../services/api';
import { AIModelType, AIModelInfo, AIModelsResponse } from '../types';

interface ModelSelectorProps {
  selectedModel?: AIModelType;
  onModelSelect: (model: AIModelType) => void;
  editType: 'optimize' | 'edit' | 'refine';
  className?: string;
  disabled?: boolean;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModel,
  onModelSelect,
  editType,
  className = '',
  disabled = false
}) => {
  const [models, setModels] = useState<AIModelInfo[]>([]);
  const [defaultModel, setDefaultModel] = useState<AIModelType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testingModel, setTestingModel] = useState<AIModelType | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<Record<AIModelType, boolean | null>>({
    gemini: null,
    chatgpt: null,
    sora: null
  });

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      setLoading(true);
      const response: AIModelsResponse = await apiService.getAvailableModels();
      setModels(response.models);
      setDefaultModel(response.default);
      
      // Set selected model to default if not already selected
      if (!selectedModel && response.default) {
        onModelSelect(response.default);
      }
      
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load models');
      console.error('Failed to load models:', err);
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async (model: AIModelType) => {
    try {
      setTestingModel(model);
      const result = await apiService.testModelConnection(model);
      setConnectionStatus(prev => ({
        ...prev,
        [model]: result.success
      }));
    } catch (err) {
      console.error(`Connection test failed for ${model}:`, err);
      setConnectionStatus(prev => ({
        ...prev,
        [model]: false
      }));
    } finally {
      setTestingModel(null);
    }
  };

  const getModelIcon = (modelId: AIModelType) => {
    switch (modelId) {
      case 'gemini':
        return Zap;
      case 'chatgpt':
        return Brain;
      case 'sora':
        return Sparkles;
      default:
        return Zap;
    }
  };

  const getSpeedIcon = (speed: string) => {
    return Clock;
  };

  const getQualityIcon = (quality: string) => {
    return Award;
  };

  const getSpeedColor = (speed: string) => {
    switch (speed) {
      case 'fast':
        return 'text-green-400';
      case 'medium':
        return 'text-yellow-400';
      case 'slow':
        return 'text-orange-400';
      default:
        return 'text-gray-400';
    }
  };

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'standard':
        return 'text-blue-400';
      case 'high':
        return 'text-purple-400';
      case 'premium':
        return 'text-pink-400';
      default:
        return 'text-gray-400';
    }
  };

  const getRecommendationScore = (model: AIModelInfo, editType: string) => {
    const typeMap: Record<string, string[]> = {
      optimize: ['产品图优化', '背景去除', '日常编辑', '批量处理'],
      edit: ['专业产品摄影', '复杂背景处理', '高端修图', '品牌级编辑'],
      refine: ['艺术创作', '创意设计', '风格实验', '独特视觉效果']
    };
    
    const relevantTasks = typeMap[editType] || [];
    const matches = model.recommended.filter(rec => 
      relevantTasks.some(task => rec.includes(task) || task.includes(rec))
    ).length;
    
    return matches / Math.max(relevantTasks.length, model.recommended.length);
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-6 ${className}`}>
        <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
        <span className="ml-2 text-white/70">加载AI模型...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 rounded-xl bg-red-500/10 border border-red-500/20 ${className}`}>
        <div className="flex items-center text-red-400">
          <AlertCircle className="w-5 h-5 mr-2" />
          <span>加载失败: {error}</span>
        </div>
        <button 
          onClick={loadModels}
          className="mt-2 text-sm text-red-300 hover:text-red-200 underline"
        >
          重试
        </button>
      </div>
    );
  }

  const sortedModels = [...models].sort((a, b) => {
    const aScore = getRecommendationScore(a, editType);
    const bScore = getRecommendationScore(b, editType);
    return bScore - aScore;
  });

  return (
    <div className={className}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white mb-2 flex items-center">
          <Brain className="w-5 h-5 mr-2 text-purple-400" />
          选择AI模型
        </h3>
        <p className="text-sm text-white/60">
          不同模型针对不同场景进行了优化，请选择最适合您需求的模型
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <AnimatePresence>
          {sortedModels.map((model) => {
            const IconComponent = getModelIcon(model.id);
            const SpeedIcon = getSpeedIcon(model.speed);
            const QualityIcon = getQualityIcon(model.quality);
            const isSelected = selectedModel === model.id;
            const isDefault = defaultModel === model.id;
            const isRecommended = getRecommendationScore(model, editType) > 0.5;
            const connectionOk = connectionStatus[model.id];
            const isTesting = testingModel === model.id;
            
            return (
              <motion.div
                key={model.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`relative p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
                  disabled 
                    ? 'opacity-50 cursor-not-allowed'
                    : isSelected
                    ? 'border-purple-500 bg-purple-500/10'
                    : 'border-white/20 bg-white/5 hover:border-white/30 hover:bg-white/10'
                }`}
                onClick={() => !disabled && onModelSelect(model.id)}
                whileHover={!disabled ? { scale: 1.02 } : {}}
                whileTap={!disabled ? { scale: 0.98 } : {}}
              >
                {/* Selection Indicator */}
                {isSelected && (
                  <motion.div
                    layoutId="selectedModel"
                    className="absolute inset-0 rounded-xl border-2 border-purple-400 shadow-ai-glow"
                    initial={false}
                  />
                )}

                <div className="relative">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isSelected ? 'bg-purple-500' : 'bg-white/10'
                      }`}>
                        <IconComponent className={`w-5 h-5 ${
                          isSelected ? 'text-white' : 'text-purple-400'
                        }`} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-white flex items-center">
                          {model.name}
                          {isDefault && (
                            <span className="ml-2 px-2 py-0.5 text-xs bg-blue-500/20 text-blue-300 rounded-full">
                              默认
                            </span>
                          )}
                          {isRecommended && (
                            <span className="ml-2 px-2 py-0.5 text-xs bg-green-500/20 text-green-300 rounded-full">
                              推荐
                            </span>
                          )}
                        </h4>
                        <p className="text-sm text-white/70">{model.description}</p>
                      </div>
                    </div>

                    {/* Connection Status */}
                    <div className="flex items-center space-x-2">
                      {isTesting ? (
                        <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
                      ) : connectionOk === true ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : connectionOk === false ? (
                        <AlertCircle className="w-4 h-4 text-red-400" />
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            testConnection(model.id);
                          }}
                          className="text-xs text-white/50 hover:text-white/70"
                        >
                          测试
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Performance Indicators */}
                  <div className="flex items-center space-x-4 mb-3">
                    <div className="flex items-center space-x-1">
                      <SpeedIcon className={`w-4 h-4 ${getSpeedColor(model.speed)}`} />
                      <span className="text-xs text-white/60">
                        速度: {model.speed === 'fast' ? '快' : model.speed === 'medium' ? '中' : '慢'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <QualityIcon className={`w-4 h-4 ${getQualityColor(model.quality)}`} />
                      <span className="text-xs text-white/60">
                        质量: {model.quality === 'standard' ? '标准' : model.quality === 'high' ? '高' : '顶级'}
                      </span>
                    </div>
                  </div>

                  {/* Capabilities */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {model.capabilities.slice(0, 3).map((capability, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 text-xs bg-white/10 text-white/70 rounded-full"
                      >
                        {capability}
                      </span>
                    ))}
                    {model.capabilities.length > 3 && (
                      <span className="px-2 py-1 text-xs text-white/50">
                        +{model.capabilities.length - 3}
                      </span>
                    )}
                  </div>

                  {/* Recommended For */}
                  {model.recommended.length > 0 && (
                    <div className="text-xs text-white/50">
                      <span className="font-medium">适用于: </span>
                      {model.recommended.slice(0, 2).join(', ')}
                      {model.recommended.length > 2 && '...'}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {models.length === 0 && (
        <div className="text-center p-6 text-white/60">
          <AlertCircle className="w-8 h-8 mx-auto mb-2" />
          <p>没有可用的AI模型</p>
          <p className="text-xs mt-1">请检查服务器配置</p>
        </div>
      )}
    </div>
  );
};

export default ModelSelector;