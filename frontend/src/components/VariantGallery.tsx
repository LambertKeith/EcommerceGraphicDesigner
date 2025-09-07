import React, { useState } from 'react';
import { Star, Download, Maximize2, Trophy, Zap, Heart, Share2, Eye, CheckCircle, Copy, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Variant } from '../types';
import { useAppStore } from '../stores/appStore';
import DownloadModal from './DownloadModal';

const VariantGallery: React.FC = () => {
  const { variants } = useAppStore();
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [hoveredVariant, setHoveredVariant] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [imageLoadErrors, setImageLoadErrors] = useState<Set<string>>(new Set());
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const [downloadingVariant, setDownloadingVariant] = useState<Variant | null>(null);

  if (variants.length === 0) {
    return null;
  }

  const sortedVariants = [...variants].sort((a, b) => b.score - a.score);
  const bestVariant = sortedVariants[0];

  const handleImageError = (variantId: string) => {
    setImageLoadErrors(prev => new Set(prev).add(variantId));
  };

  const handleImageLoad = (variantId: string) => {
    setImageLoadErrors(prev => {
      const newSet = new Set(prev);
      newSet.delete(variantId);
      return newSet;
    });
  };

  const handleCopyUrl = async (variantId: string) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/variant/${variantId}`);
      setCopiedId(variantId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  const handleDownloadClick = (variant: Variant) => {
    setDownloadingVariant(variant);
    setDownloadModalOpen(true);
  };

  const handleDownloadModalClose = () => {
    setDownloadModalOpen(false);
    setTimeout(() => {
      setDownloadingVariant(null);
    }, 300);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut",
      },
    },
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.9) return 'from-green-500 to-emerald-500';
    if (score >= 0.8) return 'from-blue-500 to-cyan-500';
    if (score >= 0.7) return 'from-yellow-500 to-orange-500';
    return 'from-purple-500 to-pink-500';
  };

  const getScoreText = (score: number) => {
    if (score >= 0.9) return 'Excellent';
    if (score >= 0.8) return 'Great';
    if (score >= 0.7) return 'Good';
    return 'Fair';
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {/* Header */}
      <div className="text-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center space-x-3 mb-4"
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center shadow-ai-glow">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white">AI 增强结果</h2>
        </motion.div>
        
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-white/70 max-w-2xl mx-auto"
        >
          您的图像已经变换成功！比较结果并选择您最喜欢的变体。
        </motion.p>
      </div>

      {/* Variants Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedVariants.map((variant, index) => (
          <motion.div
            key={variant.id}
            variants={cardVariants}
            className="group relative"
            onHoverStart={() => setHoveredVariant(variant.id)}
            onHoverEnd={() => setHoveredVariant(null)}
          >
            <div className="relative backdrop-blur-xl bg-white/10 rounded-3xl overflow-hidden border border-white/10 shadow-glass hover:shadow-ai-glow transition-all duration-300">
              {/* Variant Image */}
              <div className="relative aspect-square bg-gradient-to-br from-white/5 to-white/10 overflow-hidden">
                {imageLoadErrors.has(variant.id) ? (
                  <div className="w-full h-full flex flex-col items-center justify-center text-white/60">
                    <AlertCircle className="h-8 w-8 mb-2" />
                    <p className="text-xs">图像加载失败</p>
                    <button 
                      onClick={() => handleImageLoad(variant.id)}
                      className="mt-1 text-xs text-purple-400 hover:text-purple-300"
                    >
                      重试
                    </button>
                  </div>
                ) : (
                  <img
                    src={variant.thumb_path ? `/static${variant.thumb_path}` : '/static/placeholder.jpg'}
                    alt={`Variant ${index + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={() => handleImageError(variant.id)}
                    onLoad={() => handleImageLoad(variant.id)}
                  />
                )}
                
                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                {/* Best Result Badge */}
                {index === 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    className="absolute top-3 left-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs px-3 py-1 rounded-full font-bold shadow-lg flex items-center space-x-1"
                  >
                    <Trophy className="h-3 w-3" />
                    <span>最佳</span>
                  </motion.div>
                )}

                {/* Score Badge */}
                <div className="absolute top-3 right-3">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className={`bg-gradient-to-r ${getScoreColor(variant.score)} rounded-full px-3 py-1 shadow-lg`}
                  >
                    <div className="flex items-center space-x-1">
                      <Star className="h-3 w-3 text-white fill-current" />
                      <span className="text-xs font-bold text-white">
                        {Math.round(variant.score * 100)}
                      </span>
                    </div>
                  </motion.div>
                </div>

                {/* Quick Actions */}
                <AnimatePresence>
                  {hoveredVariant === variant.id && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute bottom-3 left-1/2 transform -translate-x-1/2"
                    >
                      <div className="flex space-x-2">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full border border-white/30 flex items-center justify-center hover:bg-white/30 transition-colors"
                          onClick={() => setSelectedVariant(variant.id)}
                        >
                          <Eye className="h-4 w-4 text-white" />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full border border-white/30 flex items-center justify-center hover:bg-white/30 transition-colors"
                          onClick={() => handleCopyUrl(variant.id)}
                        >
                          {copiedId === variant.id ? (
                            <CheckCircle className="h-4 w-4 text-green-400" />
                          ) : (
                            <Share2 className="h-4 w-4 text-white" />
                          )}
                        </motion.button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Variant Info */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-white text-lg">
                    变体 {index + 1}
                  </h3>
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${getScoreColor(variant.score)}`} />
                    <span className="text-xs text-white/70 font-medium">
                      {getScoreText(variant.score)}
                    </span>
                  </div>
                </div>
                
                {/* Enhancement Details */}
                {variant.meta_json?.applied && (
                  <div className="mb-4">
                    <p className="text-xs font-medium text-white/80 mb-2">已应用增强效果：</p>
                    <div className="flex flex-wrap gap-1">
                      {variant.meta_json.applied.slice(0, 3).map((enhancement: string, i: number) => (
                        <span
                          key={i}
                          className="bg-white/10 backdrop-blur-md px-2 py-1 rounded-full text-xs text-white/70 border border-white/10"
                        >
                          {enhancement.replace(/_/g, ' ')}
                        </span>
                      ))}
                      {variant.meta_json.applied.length > 3 && (
                        <span className="text-xs text-white/50">
                          +{variant.meta_json.applied.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex space-x-2">
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleDownloadClick(variant)}
                    className="flex-1 flex items-center justify-center px-4 py-2 text-sm font-semibold rounded-xl shadow-lg transition-all duration-200 bg-gradient-to-r from-purple-500 to-pink-500 hover:shadow-ai-glow text-white"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    下载
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 text-white text-sm font-medium rounded-xl hover:bg-white/20 transition-all duration-200"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </motion.button>
                </div>
              </div>

              {/* Selection Indicator */}
              {selectedVariant === variant.id && (
                <motion.div
                  layoutId="selection"
                  className="absolute inset-0 border-2 border-purple-400 rounded-3xl shadow-ai-glow"
                  initial={false}
                />
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Summary Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="backdrop-blur-xl bg-white/5 rounded-2xl p-6 border border-white/10 shadow-glass"
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-center">
          <div>
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Zap className="h-5 w-5 text-purple-400" />
              <h4 className="font-semibold text-white">已生成</h4>
            </div>
            <p className="text-2xl font-bold text-white">{variants.length}</p>
            <p className="text-white/60 text-sm">{variants.length === 1 ? '个变体' : '个变体'}</p>
          </div>
          
          <div>
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Trophy className="h-5 w-5 text-yellow-400" />
              <h4 className="font-semibold text-white">最佳评分</h4>
            </div>
            <p className="text-2xl font-bold text-white">{Math.round(bestVariant?.score * 100)}%</p>
            <p className="text-white/60 text-sm">质量评级</p>
          </div>
          
          <div>
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Star className="h-5 w-5 text-purple-400" />
              <h4 className="font-semibold text-white">平均分</h4>
            </div>
            <p className="text-2xl font-bold text-white">
              {Math.round(variants.reduce((acc, v) => acc + v.score, 0) / variants.length * 100)}%
            </p>
            <p className="text-white/60 text-sm">整体质量</p>
          </div>
          
          <div>
            <div className="flex items-center justify-center space-x-2 mb-2">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <h4 className="font-semibold text-white">状态</h4>
            </div>
            <p className="text-2xl font-bold text-green-400">就绪</p>
            <p className="text-white/60 text-sm">可下载</p>
          </div>
        </div>

        {/* Processing Summary */}
        <div className="mt-6 pt-6 border-t border-white/10 text-center">
          <p className="text-white/70 text-sm">
            🎉 处理成功完成 • AI 已为您的图像增强了 {variants.length} 个独特{variants.length === 1 ? '变体' : '变体'} • 
            最佳结果达到 {Math.round(bestVariant?.score * 100)}% 质量评分
          </p>
        </div>
      </motion.div>

      {/* Download Modal */}
      <DownloadModal
        isOpen={downloadModalOpen}
        onClose={handleDownloadModalClose}
        variant={downloadingVariant}
      />
    </motion.div>
  );
};

export default VariantGallery;