import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface Scenario {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  sort_order: number;
  features: Feature[];
}

interface Feature {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  is_featured: boolean;
  use_case_tags: string[];
  processing_options: {
    dual_image?: boolean;
    mask_required?: boolean;
    mask_supported?: boolean;
    two_step?: boolean;
    custom_prompt?: boolean;
  };
}

interface ScenarioSelectorProps {
  onScenarioSelect: (scenario: Scenario) => void;
  onFeatureSelect: (feature: Feature, scenario: Scenario) => void;
}

const ScenarioSelector: React.FC<ScenarioSelectorProps> = ({
  onScenarioSelect,
  onFeatureSelect,
}) => {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);

  useEffect(() => {
    fetchScenarios();
  }, []);

  const fetchScenarios = async () => {
    try {
      const response = await fetch('/api/scenarios');
      const data = await response.json();
      
      if (data.success) {
        setScenarios(data.data);
      } else {
        setError(data.error || '获取场景失败');
      }
    } catch (err) {
      setError('网络错误，请检查连接');
      console.error('获取场景失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleScenarioClick = (scenario: Scenario) => {
    if (selectedScenario?.id === scenario.id) {
      // 如果点击已选中的场景，执行场景选择
      onScenarioSelect(scenario);
    } else {
      // 否则只是展开该场景
      setSelectedScenario(scenario);
    }
  };

  const handleFeatureClick = (feature: Feature, scenario: Scenario) => {
    onFeatureSelect(feature, scenario);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 mb-4">⚠️ {error}</div>
        <button
          onClick={fetchScenarios}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          重新加载
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          选择处理场景
        </h1>
        <p className="text-gray-600">
          根据您的需求选择最适合的图像处理场景
        </p>
      </div>

      {/* 场景卡片网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {scenarios.map((scenario) => (
          <motion.div
            key={scenario.id}
            className={`relative cursor-pointer rounded-xl border-2 transition-all duration-300 ${
              selectedScenario?.id === scenario.id
                ? 'border-purple-500 bg-purple-500/10 shadow-ai-glow backdrop-blur-md'
                : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10 backdrop-blur-md'
            }`}
            onClick={() => handleScenarioClick(scenario)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="p-6">
              <div
                className="text-4xl mb-3"
                style={{ color: scenario.color }}
              >
                {scenario.icon}
              </div>
              <h3 className="font-semibold text-lg text-white mb-2">
                {scenario.name}
              </h3>
              <p className="text-white/70 text-sm mb-4">
                {scenario.description}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/60">
                  {scenario.features.length} 种功能
                </span>
                <span className="text-xs text-white/60">
                  {scenario.features.filter(f => f.is_featured).length} 推荐
                </span>
              </div>
              
              {selectedScenario?.id === scenario.id && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute top-4 right-4"
                >
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* 功能展示区 */}
      {selectedScenario && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="backdrop-blur-md bg-white/5 rounded-xl border border-white/10 p-6"
        >
          <div className="flex items-center mb-6">
            <span className="text-3xl mr-3">{selectedScenario.icon}</span>
            <div>
              <h2 className="text-xl font-semibold text-white">
                {selectedScenario.name} 功能
              </h2>
              <p className="text-white/70 text-sm">
                点击功能卡片开始处理
              </p>
            </div>
          </div>

          {/* 推荐功能 */}
          <div className="mb-6">
            <h3 className="font-medium text-white mb-3 flex items-center">
              <span className="w-2 h-2 bg-yellow-400 rounded-full mr-2"></span>
              推荐功能
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {selectedScenario.features
                .filter(feature => feature.is_featured)
                .map((feature) => (
                  <FeatureCard
                    key={feature.id}
                    feature={feature}
                    scenario={selectedScenario}
                    onClick={handleFeatureClick}
                    featured
                  />
                ))}
            </div>
          </div>

          {/* 所有功能 */}
          <div>
            <h3 className="font-medium text-white mb-3 flex items-center">
              <span className="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
              所有功能
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {selectedScenario.features.map((feature) => (
                <FeatureCard
                  key={feature.id}
                  feature={feature}
                  scenario={selectedScenario}
                  onClick={handleFeatureClick}
                  compact
                />
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

// 功能卡片组件
const FeatureCard: React.FC<{
  feature: Feature;
  scenario: Scenario;
  onClick: (feature: Feature, scenario: Scenario) => void;
  featured?: boolean;
  compact?: boolean;
}> = ({ feature, scenario, onClick, featured = false, compact = false }) => {
  const handleClick = () => {
    onClick(feature, scenario);
  };

  if (compact) {
    return (
      <motion.div
        className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-3 cursor-pointer hover:bg-white/20 hover:border-white/30 transition-all"
        onClick={handleClick}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="flex items-center">
          <span className="text-lg mr-2">{feature.icon}</span>
          <span className="text-sm font-medium text-white truncate">
            {feature.name}
          </span>
          {feature.processing_options.dual_image && (
            <span className="ml-auto text-xs text-blue-400 bg-blue-400/20 px-2 py-1 rounded">双图</span>
          )}
          {feature.processing_options.mask_required && (
            <span className="ml-auto text-xs text-orange-400 bg-orange-400/20 px-2 py-1 rounded">需蒙版</span>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className={`backdrop-blur-md border rounded-lg p-4 cursor-pointer transition-all ${
        featured 
          ? 'border-yellow-400/50 bg-yellow-400/10 hover:border-yellow-400/70' 
          : 'border-white/10 bg-white/5 hover:border-white/20'
      }`}
      onClick={handleClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-2xl">{feature.icon}</span>
        <div className="flex gap-1">
          {feature.processing_options.dual_image && (
            <span className="text-xs bg-blue-500 bg-opacity-20 text-blue-300 px-2 py-1 rounded">
              双图
            </span>
          )}
          {feature.processing_options.mask_required && (
            <span className="text-xs bg-orange-500 bg-opacity-20 text-orange-300 px-2 py-1 rounded">
              蒙版
            </span>
          )}
          {feature.processing_options.two_step && (
            <span className="text-xs bg-purple-500 bg-opacity-20 text-purple-300 px-2 py-1 rounded">
              两步
            </span>
          )}
        </div>
      </div>
      
      <h4 className="font-medium text-white mb-2">
        {feature.name}
      </h4>
      <p className="text-white/70 text-sm mb-3 line-clamp-2">
        {feature.description}
      </p>
      
      <div className="flex flex-wrap gap-1">
        {feature.use_case_tags.slice(0, 3).map((tag, index) => (
          <span
            key={index}
            className="text-xs bg-white bg-opacity-20 text-white px-2 py-1 rounded"
          >
            {tag}
          </span>
        ))}
        {feature.use_case_tags.length > 3 && (
          <span className="text-xs text-white text-opacity-60">
            +{feature.use_case_tags.length - 3}
          </span>
        )}
      </div>
    </motion.div>
  );
};

export default ScenarioSelector;