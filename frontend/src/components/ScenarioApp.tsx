import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../stores/appStore';
import { apiService } from '../services/api';

// Components
import ImageUpload from './ImageUpload';
import ScenarioSelector from './ScenarioSelector';
import ScenarioImageEditor from './ScenarioImageEditor';
import ProcessingProgress from './ProcessingProgress';
import VariantGallery from './VariantGallery';
import { Feature, ScenarioWithFeatures } from '../types';

type AppView = 'upload' | 'scenario-select' | 'feature-edit' | 'processing' | 'results';

const ScenarioApp: React.FC = () => {
  const {
    currentImage,
    currentSession,
    currentJob,
    jobStatus,
    variants,
    scenarios,
    selectedScenario,
    selectedFeature,
    isScenarioMode,
    setScenarios,
    setSelectedScenario,
    setSelectedFeature,
    setCurrentSession,
    reset,
  } = useAppStore();

  const [currentView, setCurrentView] = useState<AppView>('upload');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load scenarios on component mount
  useEffect(() => {
    loadScenarios();
  }, []);

  // Update view based on state
  useEffect(() => {
    if (!currentImage) {
      setCurrentView('upload');
    } else if (!selectedFeature) {
      setCurrentView('scenario-select');
    } else if (currentJob && jobStatus?.status === 'running') {
      setCurrentView('processing');
    } else if (variants.length > 0) {
      setCurrentView('results');
    } else {
      setCurrentView('feature-edit');
    }
  }, [currentImage, selectedFeature, currentJob, jobStatus, variants]);

  const loadScenarios = async () => {
    try {
      setIsLoading(true);
      const scenarioData = await apiService.getScenarios();
      setScenarios(scenarioData);
    } catch (err) {
      setError('加载场景失败，请检查网络连接');
      console.error('加载场景失败:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUploaded = async (uploadResult: any) => {
    try {
      // Create session for the uploaded image
      const sessionResult = await apiService.createSession(
        uploadResult.project_id,
        { 
          upload_timestamp: new Date().toISOString(),
          scenario_mode: true 
        }
      );
      
      setCurrentSession({
        id: sessionResult.session_id,
        project_id: uploadResult.project_id,
        context_json: {},
        workflow_context: {},
        created_at: new Date().toISOString(),
        last_active_at: new Date().toISOString(),
      });

      console.log('图像上传成功，会话已创建:', sessionResult.session_id);
    } catch (err) {
      setError('创建会话失败');
      console.error('创建会话失败:', err);
    }
  };

  const handleScenarioSelect = (scenario: ScenarioWithFeatures) => {
    setSelectedScenario(scenario);
    // Auto-select first featured feature
    const featuredFeature = scenario.features.find(f => f.is_featured);
    if (featuredFeature) {
      setSelectedFeature(featuredFeature);
    }
  };

  const handleFeatureSelect = (feature: Feature, scenario: ScenarioWithFeatures) => {
    setSelectedScenario(scenario);
    setSelectedFeature(feature);
  };

  const handleJobStarted = (jobId: string) => {
    console.log('处理任务已开始:', jobId);
  };

  const handleBackToScenarios = () => {
    setSelectedFeature(null);
    setCurrentView('scenario-select');
  };

  const handleStartOver = () => {
    reset();
    setSelectedScenario(null);
    setSelectedFeature(null);
    setCurrentView('upload');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载场景数据中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">加载失败</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadScenarios}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            重新加载
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <AnimatePresence mode="wait">
        {currentView === 'upload' && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">
                开始您的创作之旅
              </h2>
              <p className="text-white/70">
                上传一张图片，体验AI驱动的专业图像处理
              </p>
            </div>
            <ImageUpload onImageUploaded={handleImageUploaded} />
          </motion.div>
        )}

        {currentView === 'scenario-select' && (
          <motion.div
            key="scenario-select"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <ScenarioSelector
              onScenarioSelect={handleScenarioSelect}
              onFeatureSelect={handleFeatureSelect}
            />
          </motion.div>
        )}

        {currentView === 'feature-edit' && (
          <motion.div
            key="feature-edit"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* 图片预览 */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-white">
                    原始图片
                  </h3>
                  <button
                    onClick={handleBackToScenarios}
                    className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    ← 重新选择功能
                  </button>
                </div>
                {currentImage && (
                  <div className="backdrop-blur-md bg-white/5 rounded-xl border border-white/10 p-4">
                    <img
                      src={currentImage.url}
                      alt="原始图片"
                      className="w-full h-auto rounded-lg"
                    />
                    <div className="mt-2 text-sm text-white/60">
                      {currentImage.width} × {currentImage.height} px
                    </div>
                  </div>
                )}
              </div>

              {/* 编辑面板 */}
              <div>
                <ScenarioImageEditor onJobStarted={handleJobStarted} />
              </div>
            </div>
          </motion.div>
        )}

        {currentView === 'processing' && (
          <motion.div
            key="processing"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">
                AI正在处理您的图片
              </h2>
              <p className="text-white/70">
                {selectedFeature?.name} - 请稍候，我们正在为您创造惊喜
              </p>
            </div>
            <ProcessingProgress />
          </motion.div>
        )}

        {currentView === 'results' && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">
                处理完成！
              </h2>
              <p className="text-white/70">
                使用 {selectedFeature?.name} 为您生成的结果
              </p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* 原图对比 */}
              <div>
                <h3 className="text-lg font-medium text-white mb-4">
                  原始图片
                </h3>
                {currentImage && (
                  <div className="backdrop-blur-md bg-white/5 rounded-xl border border-white/10 p-4">
                    <img
                      src={currentImage.url}
                      alt="原始图片"
                      className="w-full h-auto rounded-lg"
                    />
                  </div>
                )}
              </div>

              {/* 处理结果 */}
              <div className="lg:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-white">
                    处理结果
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={handleBackToScenarios}
                      className="px-3 py-1 text-sm text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      继续编辑
                    </button>
                    <button
                      onClick={handleStartOver}
                      className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                    >
                      处理新图片
                    </button>
                  </div>
                </div>
                <VariantGallery />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ScenarioApp;