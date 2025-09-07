import React, { useState, useEffect } from 'react';
import { Wand2, RotateCw, Download, MessageSquare, Sparkles, Zap, Settings, ArrowLeft, Eye, Layers, Loader2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiService } from '../services/api';
import { useAppStore } from '../stores/appStore';
import { AIModelType } from '../types';
import VariantGallery from './VariantGallery';
import ProcessingProgress from './ProcessingProgress';
import ModelSelector from './ModelSelector';
import ImageUpload from './ImageUpload';

const ImageEditor: React.FC = () => {
  const {
    currentImage,
    currentSession,
    isProcessing,
    setIsProcessing,
    variants,
    setVariants,
    jobStatus,
    setJobStatus,
    setCurrentJob,
    setCurrentImage,
    setCurrentSession
  } = useAppStore();

  const [editType, setEditType] = useState<'optimize' | 'edit' | 'refine'>('optimize');
  const [prompt, setPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState<AIModelType | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [imageLoadError, setImageLoadError] = useState(false);

  const handleStartEdit = async () => {
    if (!currentImage || !currentSession) return;

    setError(null);
    setIsProcessing(true);
    setVariants([]);

    try {
      const result = await apiService.editImage(
        currentSession.id,
        currentImage.id,
        editType,
        editType === 'optimize' ? undefined : prompt,
        selectedModel
      );

      setCurrentJob({
        id: result.job_id,
        session_id: currentSession.id,
        input_image_id: currentImage.id,
        type: editType,
        prompt: prompt,
        status: 'pending',
        result_variant_ids: [],
        created_at: new Date().toISOString(),
        model: result.model
      });

      pollJobStatus(result.job_id);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start editing');
      setIsProcessing(false);
    }
  };

  const pollJobStatus = async (jobId: string) => {
    try {
      const status = await apiService.getJobStatus(jobId);
      setJobStatus(status);

      if (status.status === 'done') {
        setVariants(status.result_variants || []);
        setIsProcessing(false);
      } else if (status.status === 'error') {
        setError(status.error_msg || 'Processing failed');
        setIsProcessing(false);
      } else {
        setTimeout(() => pollJobStatus(jobId), 5000);
      }
    } catch (err) {
      setError('Failed to check job status');
      setIsProcessing(false);
    }
  };

  const handleStartOver = () => {
    setCurrentImage(null);
    setCurrentSession(null);
    setVariants([]);
    setError(null);
    setIsProcessing(false);
  };

  const editTypes = [
    {
      id: 'optimize',
      icon: Sparkles,
      title: '优化',
      description: 'AI 自动增强，白色背景',
      color: 'from-green-500 to-emerald-500',
      requiresPrompt: false
    },
    {
      id: 'edit',
      icon: Wand2,
      title: '编辑',
      description: '根据您的指令进行 AI 编辑',
      color: 'from-purple-500 to-pink-500',
      requiresPrompt: true
    },
    {
      id: 'refine',
      icon: RotateCw,
      title: '精修',
      description: '对现有结果进行微调',
      color: 'from-blue-500 to-cyan-500',
      requiresPrompt: true
    }
  ];

  // 当没有图像时显示上传界面
  if (!currentImage) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="py-8"
      >
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">
            上传图片开始编辑
          </h2>
          <p className="text-white/70">
            上传一张产品图片，使用AI进行专业编辑和优化
          </p>
        </div>
        <ImageUpload onImageUploaded={() => {
          // 图片上传后会自动更新currentImage状态
        }} />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen relative"
    >
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900/50 via-purple-900/30 to-slate-900/50 backdrop-blur-sm"></div>
      
      <div className="relative z-10">
        {/* Header */}
        <div className="backdrop-blur-md bg-white/5 border-b border-white/10 mb-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <motion.button
                onClick={handleStartOver}
                className="flex items-center space-x-2 text-white/70 hover:text-white transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <ArrowLeft className="h-5 w-5" />
                <span>重新开始</span>
              </motion.button>
              
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 text-white/60">
                  <Eye className="h-4 w-4" />
                  <span className="text-sm">实时预览</span>
                </div>
                {variants.length > 0 && (
                  <div className="flex items-center space-x-2 text-purple-300">
                    <Layers className="h-4 w-4" />
                    <span className="text-sm">{variants.length} 个变体已就绪</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Original Image Panel */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="xl:col-span-1"
            >
              <div className="backdrop-blur-xl bg-white/10 rounded-3xl p-6 border border-white/10 shadow-glass">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-white">原图</h2>
                  <div className="flex items-center space-x-2 text-white/60 text-sm">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span>就绪</span>
                  </div>
                </div>
                
                <div className="relative group">
                  <div className="aspect-square bg-white/5 rounded-2xl overflow-hidden border border-white/10">
                    {imageLoadError ? (
                      <div className="w-full h-full flex flex-col items-center justify-center text-white/60">
                        <AlertCircle className="h-12 w-12 mb-2" />
                        <p className="text-sm">图像加载失败</p>
                        <button 
                          onClick={() => {
                            setImageLoadError(false);
                            // Force re-render by updating the image src
                          }}
                          className="mt-2 text-xs text-purple-400 hover:text-purple-300"
                        >
                          重试
                        </button>
                      </div>
                    ) : (
                      <img
                        src={currentImage.url}
                        alt="Original"
                        className="w-full h-full object-contain hover:scale-105 transition-transform duration-300"
                        onError={() => setImageLoadError(true)}
                        onLoad={() => setImageLoadError(false)}
                      />
                    )}
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"></div>
                </div>
                
                {/* Image Info */}
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-white/60 text-sm">尺寸</span>
                    <span className="text-white font-medium text-sm">{currentImage.width} × {currentImage.height}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/60 text-sm">格式</span>
                    <span className="text-white font-medium text-sm">{currentImage.meta_json?.mimeType?.split('/')[1]?.toUpperCase() || 'Unknown'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/60 text-sm">状态</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                      <span className="text-purple-300 font-medium text-sm">AI 就绪</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Control Panel */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="xl:col-span-2 space-y-6"
            >

              {/* Enhancement Panel */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="backdrop-blur-xl bg-white/10 rounded-3xl p-8 border border-white/10 shadow-glass"
              >
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                        <Wand2 className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">AI 增强工作室</h3>
                        <p className="text-white/60 text-sm">选择您的增强类型，让 AI 发挥它的魔法</p>
                      </div>
                    </div>

                    {/* Enhancement Types */}
                    <div className="grid md:grid-cols-3 gap-4 mb-6">
                      {editTypes.map((type) => (
                        <motion.button
                          key={type.id}
                          onClick={() => setEditType(type.id as any)}
                          className={`relative p-4 rounded-2xl border transition-all duration-200 ${
                            editType === type.id
                              ? 'border-purple-500 bg-purple-500/10'
                              : 'border-white/20 bg-white/5 hover:border-white/30 hover:bg-white/10'
                          }`}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="flex flex-col items-center text-center space-y-3">
                            <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${type.color} flex items-center justify-center shadow-lg`}>
                              <type.icon className="h-6 w-6 text-white" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-white">{type.title}</h4>
                              <p className="text-xs text-white/60 mt-1">{type.description}</p>
                            </div>
                          </div>
                          {editType === type.id && (
                            <motion.div
                              layoutId="activeType"
                              className="absolute inset-0 rounded-2xl border-2 border-purple-400 shadow-ai-glow"
                              initial={false}
                            />
                          )}
                        </motion.button>
                      ))}
                    </div>

                    {/* AI Model Selection */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="mb-6"
                    >
                      <ModelSelector
                        selectedModel={selectedModel}
                        onModelSelect={setSelectedModel}
                        editType={editType}
                        disabled={isProcessing}
                      />
                    </motion.div>

                    {/* Prompt Input */}
                    <AnimatePresence>
                      {editType !== 'optimize' && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mb-6"
                        >
                          <label className="block text-sm font-medium text-white/80 mb-3">
                            <MessageSquare className="inline h-4 w-4 mr-2" />
                            描述您的想法
                          </label>
                          <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder={
                              editType === 'edit' 
                                ? 'e.g., "将背景更改为纯白色，添加柔和阴影，增强产品光照"'
                                : 'e.g., "让颜色更鲜艾，适度提高对比度"'
                            }
                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-white/40 backdrop-blur-xl focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 resize-none"
                            rows={3}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Generate Button */}
                    <motion.button
                      onClick={handleStartEdit}
                      disabled={isProcessing || (editType !== 'optimize' && !prompt.trim())}
                      className="w-full flex items-center justify-center px-6 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl shadow-ai-glow hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                      whileHover={!isProcessing ? { scale: 1.02 } : {}}
                      whileTap={!isProcessing ? { scale: 0.98 } : {}}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5" />
                          正在处理魔法...
                        </>
                      ) : (
                        <>
                          <Zap className="-ml-1 mr-3 h-5 w-5" />
                          {`使用 AI ${editType === 'optimize' ? '优化' : editType === 'edit' ? '转换' : '精修'}`}
                        </>
                      )}
                    </motion.button>
              </motion.div>

              {/* Processing Progress */}
              <AnimatePresence>
                {isProcessing && jobStatus && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <ProcessingProgress status={jobStatus} />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Error Display */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="backdrop-blur-xl bg-red-500/10 border border-red-500/20 rounded-2xl p-4"
                  >
                    <div className="flex items-center space-x-3">
                      <AlertCircle className="h-5 w-5 text-red-400" />
                      <div>
                        <h4 className="text-sm font-medium text-red-300">处理错误</h4>
                        <p className="text-sm text-red-400/80">{error}</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>

          {/* Results Section */}
          <AnimatePresence>
            {variants.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mt-12"
              >
                <VariantGallery />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

export default ImageEditor;