import React, { useCallback, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Wand2, 
  Image as ImageIcon, 
  Download, 
  RefreshCw, 
  AlertCircle,
  CheckCircle2,
  Loader2,
  Palette,
  Settings
} from 'lucide-react';
import { useAppStore } from '../stores/appStore';

// Mock API service functions (these should be implemented in api.ts)
const generateImageAPI = async (prompt: string, style: string, size: string, model?: string) => {
  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      style,
      size,
      model
    })
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Generation failed');
  }
  
  return await response.json();
};

const checkJobStatus = async (jobId: string) => {
  const response = await fetch(`/api/generate/jobs/${jobId}`);
  if (!response.ok) {
    throw new Error('Failed to check job status');
  }
  return await response.json();
};

const TextToImageGenerator: React.FC = () => {
  const {
    currentPrompt,
    selectedStyle,
    selectedSize,
    isGenerating,
    generationProgress,
    generatedImage,
    currentGenerateJob,
    setCurrentPrompt,
    setSelectedStyle,
    setSelectedSize,
    setIsGenerating,
    setGenerationProgress,
    setGeneratedImage,
    setCurrentGenerateJob,
    resetGeneration
  } = useAppStore();

  const [error, setError] = useState<string | null>(null);
  const [availableStyles, setAvailableStyles] = useState([
    { id: 'commercial', name: '商业风格', description: '专业产品摄影，清洁背景，工作室照明' },
    { id: 'artistic', name: '艺术风格', description: '创意艺术效果，独特构图，视觉冲击' },
    { id: 'minimal', name: '简约风格', description: '简洁设计，清晰线条，现代美学' },
    { id: 'realistic', name: '写实风格', description: '照片级真实感，自然光照，真实纹理' },
    { id: 'vibrant', name: '活力风格', description: '明亮色彩，高对比度，充满活力' }
  ]);

  const [availableSizes] = useState([
    { id: '512x512', name: '512×512', width: 512, height: 512 },
    { id: '768x768', name: '768×768', width: 768, height: 768 },
    { id: '1024x1024', name: '1024×1024', width: 1024, height: 1024 },
    { id: '1920x1920', name: '1920×1920', width: 1920, height: 1920 }
  ]);

  // Poll job status when generating
  useEffect(() => {
    if (!currentGenerateJob || !isGenerating) return;

    const pollInterval = setInterval(async () => {
      try {
        const result = await checkJobStatus(currentGenerateJob);
        
        if (result.success) {
          const jobData = result.data;
          
          if (jobData.status === 'done') {
            setGeneratedImage(jobData);
            setIsGenerating(false);
            setGenerationProgress(100);
            clearInterval(pollInterval);
          } else if (jobData.status === 'error') {
            setError(jobData.error_msg || 'Generation failed');
            setIsGenerating(false);
            clearInterval(pollInterval);
          } else if (jobData.status === 'running') {
            // Simulate progress for running state
            setGenerationProgress(prev => Math.min(95, prev + Math.random() * 10));
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to check generation status');
        setIsGenerating(false);
        clearInterval(pollInterval);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [currentGenerateJob, isGenerating]);

  const handleGenerate = useCallback(async () => {
    if (!currentPrompt.trim()) {
      setError('请输入图像描述');
      return;
    }

    setError(null);
    setIsGenerating(true);
    setGenerationProgress(10);

    try {
      const result = await generateImageAPI(currentPrompt, selectedStyle, selectedSize);
      
      if (result.success) {
        setCurrentGenerateJob(result.data.job_id);
        setGenerationProgress(30);
      } else {
        throw new Error(result.error || 'Generation failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
      setIsGenerating(false);
      setGenerationProgress(0);
    }
  }, [currentPrompt, selectedStyle, selectedSize]);

  const handleReset = useCallback(() => {
    resetGeneration();
    setError(null);
  }, [resetGeneration]);

  const handleDownload = useCallback(() => {
    if (generatedImage?.image_url) {
      const link = document.createElement('a');
      link.href = generatedImage.image_url;
      link.download = `generated-${generatedImage.id}.png`;
      link.click();
    }
  }, [generatedImage]);

  const selectedStyleData = availableStyles.find(s => s.id === selectedStyle);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-4">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <div className="flex items-center justify-center space-x-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center shadow-ai-glow">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-white">文字生成图像</h1>
          </div>
          <p className="text-white/70 text-lg max-w-2xl mx-auto">
            通过AI技术将您的文字描述转换为高质量的商业级图像，支持多种风格和尺寸选择。
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Panel - Controls */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            {/* Prompt Input */}
            <div className="backdrop-blur-xl bg-white/10 rounded-2xl p-6 border border-white/20">
              <label className="block text-white font-medium mb-4">
                <Wand2 className="inline h-5 w-5 mr-2" />
                图像描述
              </label>
              <textarea
                value={currentPrompt}
                onChange={(e) => setCurrentPrompt(e.target.value)}
                placeholder="描述您想要生成的图像，例如：一个优雅的咖啡杯放在木桌上，温暖的自然光照，简约风格..."
                className="w-full h-32 bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-white/50 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 resize-none"
                disabled={isGenerating}
              />
            </div>

            {/* Style Selector */}
            <div className="backdrop-blur-xl bg-white/10 rounded-2xl p-6 border border-white/20">
              <label className="block text-white font-medium mb-4">
                <Palette className="inline h-5 w-5 mr-2" />
                艺术风格
              </label>
              <div className="grid grid-cols-1 gap-3">
                {availableStyles.map((style) => (
                  <motion.button
                    key={style.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedStyle(style.id)}
                    disabled={isGenerating}
                    className={`p-4 rounded-xl text-left transition-all ${
                      selectedStyle === style.id
                        ? 'bg-purple-500/30 border-purple-400 border-2'
                        : 'bg-white/5 border border-white/20 hover:bg-white/10'
                    }`}
                  >
                    <div className="font-medium text-white">{style.name}</div>
                    <div className="text-sm text-white/70 mt-1">{style.description}</div>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Size Selector */}
            <div className="backdrop-blur-xl bg-white/10 rounded-2xl p-6 border border-white/20">
              <label className="block text-white font-medium mb-4">
                <Settings className="inline h-5 w-5 mr-2" />
                图像尺寸
              </label>
              <div className="grid grid-cols-2 gap-3">
                {availableSizes.map((size) => (
                  <motion.button
                    key={size.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedSize(size.id)}
                    disabled={isGenerating}
                    className={`p-3 rounded-xl text-center transition-all ${
                      selectedSize === size.id
                        ? 'bg-purple-500/30 border-purple-400 border-2'
                        : 'bg-white/5 border border-white/20 hover:bg-white/10'
                    }`}
                  >
                    <div className="font-medium text-white">{size.name}</div>
                    <div className="text-xs text-white/70">{size.width}×{size.height}</div>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleGenerate}
                disabled={isGenerating || !currentPrompt.trim()}
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium py-3 px-6 rounded-xl shadow-ai-glow disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>生成中...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    <span>开始生成</span>
                  </>
                )}
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleReset}
                disabled={isGenerating}
                className="bg-white/10 border border-white/20 text-white font-medium py-3 px-6 rounded-xl hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <RefreshCw className="h-5 w-5" />
                <span>重置</span>
              </motion.button>
            </div>
          </motion.div>

          {/* Right Panel - Result */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            {/* Generation Result */}
            <div className="backdrop-blur-xl bg-white/10 rounded-2xl p-6 border border-white/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-medium flex items-center">
                  <ImageIcon className="h-5 w-5 mr-2" />
                  生成结果
                </h3>
                {generatedImage && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleDownload}
                    className="bg-green-500/20 border border-green-400/50 text-green-300 px-3 py-1 rounded-lg text-sm flex items-center space-x-1"
                  >
                    <Download className="h-4 w-4" />
                    <span>下载</span>
                  </motion.button>
                )}
              </div>

              {/* Image Display Area */}
              <div className="aspect-square bg-white/5 rounded-xl border-2 border-dashed border-white/20 flex items-center justify-center relative overflow-hidden">
                <AnimatePresence mode="wait">
                  {generatedImage?.image_url ? (
                    <motion.img
                      key="generated-image"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      src={generatedImage.image_url}
                      alt="Generated image"
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : isGenerating ? (
                    <motion.div
                      key="generating"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-center space-y-4"
                    >
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-400 rounded-full mx-auto"
                      />
                      <div className="space-y-2">
                        <p className="text-white font-medium">正在生成图像...</p>
                        <div className="w-48 bg-white/10 rounded-full h-2 mx-auto">
                          <motion.div
                            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                            style={{ width: `${generationProgress}%` }}
                            transition={{ duration: 0.3 }}
                          />
                        </div>
                        <p className="text-white/60 text-sm">{Math.round(generationProgress)}%</p>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-center space-y-3 text-white/50"
                    >
                      <ImageIcon className="h-16 w-16 mx-auto" />
                      <div>
                        <p className="text-lg font-medium">等待生成</p>
                        <p className="text-sm">输入描述并点击生成按钮开始</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Generation Info */}
              {generatedImage && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-4 bg-white/5 rounded-lg space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-white/70 text-sm">风格:</span>
                    <span className="text-white text-sm">
                      {availableStyles.find(s => s.id === generatedImage.style)?.name || generatedImage.style}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/70 text-sm">尺寸:</span>
                    <span className="text-white text-sm">{generatedImage.size}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/70 text-sm">模型:</span>
                    <span className="text-white text-sm">{generatedImage.model_used || '自动选择'}</span>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Error Display */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="backdrop-blur-md bg-red-500/10 border border-red-500/20 rounded-xl p-4"
            >
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-red-300">生成失败</h4>
                  <p className="text-sm text-red-400/80">{error}</p>
                </div>
                <button
                  onClick={() => setError(null)}
                  className="ml-auto text-red-400 hover:text-red-300 text-sm"
                >
                  ×
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default TextToImageGenerator;