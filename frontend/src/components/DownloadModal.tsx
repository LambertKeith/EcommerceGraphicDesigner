import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Image, Zap, Loader2, CheckCircle } from 'lucide-react';
import { apiService } from '../services/api';
import { Variant } from '../types';

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  variant: Variant | null;
}

interface DownloadOption {
  format: 'jpg' | 'png' | 'webp';
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  recommended?: boolean;
}

interface ResolutionOption {
  width?: number;
  height?: number;
  name: string;
  description: string;
  recommended?: boolean;
}

const DownloadModal: React.FC<DownloadModalProps> = ({ isOpen, onClose, variant }) => {
  const [selectedFormat, setSelectedFormat] = useState<'jpg' | 'png' | 'webp'>('jpg');
  const [selectedResolution, setSelectedResolution] = useState<ResolutionOption | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const formatOptions: DownloadOption[] = [
    {
      format: 'jpg',
      name: 'JPEG',
      description: '标准格式，文件小，兼容性好',
      icon: Image,
      recommended: true
    },
    {
      format: 'png',
      name: 'PNG',
      description: '支持透明背景，无损压缩',
      icon: Zap
    },
    {
      format: 'webp',
      name: 'WebP',
      description: '现代格式，体积更小，质量更高',
      icon: Zap
    }
  ];

  const resolutionOptions: ResolutionOption[] = [
    {
      name: '原始尺寸',
      description: '保持图像原始分辨率',
      recommended: true
    },
    {
      width: 1920,
      height: 1920,
      name: '高清 (1920x1920)',
      description: '适合大尺寸展示'
    },
    {
      width: 1080,
      height: 1080,
      name: '标准 (1080x1080)',
      description: '适合社交媒体分享'
    },
    {
      width: 512,
      height: 512,
      name: '小尺寸 (512x512)',
      description: '适合缩略图使用'
    }
  ];

  const handleDownload = async () => {
    if (!variant) return;

    setIsDownloading(true);
    setDownloadError(null);
    setDownloadSuccess(false);

    try {
      const result = await apiService.exportImage(
        variant.image_id,
        selectedFormat,
        selectedResolution?.width,
        selectedResolution?.height
      );

      // Create download link
      const link = document.createElement('a');
      link.href = result.download_url;
      link.download = `variant_${variant.id}.${selectedFormat}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setDownloadSuccess(true);
      
      // Auto close after success
      setTimeout(() => {
        onClose();
        setDownloadSuccess(false);
      }, 2000);

    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : '下载失败');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleClose = () => {
    if (!isDownloading) {
      onClose();
      // Reset state
      setTimeout(() => {
        setSelectedFormat('jpg');
        setSelectedResolution(null);
        setDownloadError(null);
        setDownloadSuccess(false);
      }, 300);
    }
  };

  if (!variant) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">下载图像</h2>
                <p className="text-white/60">选择您想要的格式和分辨率</p>
              </div>
              <motion.button
                onClick={handleClose}
                disabled={isDownloading}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors disabled:opacity-50"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <X className="w-5 h-5 text-white" />
              </motion.button>
            </div>

            {/* Preview */}
            <div className="mb-8">
              <div className="aspect-square w-32 mx-auto rounded-2xl overflow-hidden bg-white/5 border border-white/10">
                <img
                  src={variant.thumb_path ? `/static${variant.thumb_path}` : '/static/placeholder.jpg'}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Format Selection */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-white mb-4">文件格式</h3>
              <div className="grid grid-cols-3 gap-3">
                {formatOptions.map((option) => {
                  const IconComponent = option.icon;
                  const isSelected = selectedFormat === option.format;
                  
                  return (
                    <motion.button
                      key={option.format}
                      onClick={() => setSelectedFormat(option.format)}
                      disabled={isDownloading}
                      className={`relative p-4 rounded-xl border transition-all duration-200 ${
                        isSelected
                          ? 'border-purple-500 bg-purple-500/10'
                          : 'border-white/20 bg-white/5 hover:border-white/30 hover:bg-white/10'
                      } disabled:opacity-50`}
                      whileHover={!isDownloading ? { scale: 1.02 } : {}}
                      whileTap={!isDownloading ? { scale: 0.98 } : {}}
                    >
                      {option.recommended && (
                        <div className="absolute -top-2 -right-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                          推荐
                        </div>
                      )}
                      
                      <div className="flex flex-col items-center space-y-2">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          isSelected ? 'bg-purple-500' : 'bg-white/10'
                        }`}>
                          <IconComponent className={`w-5 h-5 ${
                            isSelected ? 'text-white' : 'text-purple-400'
                          }`} />
                        </div>
                        <div className="text-center">
                          <div className="font-medium text-white text-sm">{option.name}</div>
                          <div className="text-xs text-white/60 mt-1">{option.description}</div>
                        </div>
                      </div>
                      
                      {isSelected && (
                        <motion.div
                          layoutId="formatSelection"
                          className="absolute inset-0 rounded-xl border-2 border-purple-400 shadow-ai-glow"
                          initial={false}
                        />
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Resolution Selection */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-white mb-4">分辨率选择</h3>
              <div className="grid grid-cols-2 gap-3">
                {resolutionOptions.map((option, index) => {
                  const isSelected = selectedResolution === option;
                  
                  return (
                    <motion.button
                      key={index}
                      onClick={() => setSelectedResolution(option)}
                      disabled={isDownloading}
                      className={`relative p-4 rounded-xl border transition-all duration-200 text-left ${
                        isSelected
                          ? 'border-purple-500 bg-purple-500/10'
                          : 'border-white/20 bg-white/5 hover:border-white/30 hover:bg-white/10'
                      } disabled:opacity-50`}
                      whileHover={!isDownloading ? { scale: 1.02 } : {}}
                      whileTap={!isDownloading ? { scale: 0.98 } : {}}
                    >
                      {option.recommended && (
                        <div className="absolute -top-2 -right-2 bg-gradient-to-r from-green-400 to-blue-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                          推荐
                        </div>
                      )}
                      
                      <div className="font-medium text-white mb-1">{option.name}</div>
                      <div className="text-sm text-white/60">{option.description}</div>
                      
                      {isSelected && (
                        <motion.div
                          layoutId="resolutionSelection"
                          className="absolute inset-0 rounded-xl border-2 border-purple-400 shadow-ai-glow"
                          initial={false}
                        />
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Error Message */}
            {downloadError && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl"
              >
                <p className="text-red-400 text-sm">{downloadError}</p>
              </motion.div>
            )}

            {/* Download Button */}
            <div className="flex space-x-4">
              <motion.button
                onClick={handleClose}
                disabled={isDownloading}
                className="flex-1 px-6 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors disabled:opacity-50"
                whileHover={!isDownloading ? { scale: 1.02 } : {}}
                whileTap={!isDownloading ? { scale: 0.98 } : {}}
              >
                取消
              </motion.button>
              <motion.button
                onClick={handleDownload}
                disabled={isDownloading}
                className="flex-1 flex items-center justify-center px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:shadow-ai-glow transition-all disabled:opacity-50 font-semibold"
                whileHover={!isDownloading ? { scale: 1.02 } : {}}
                whileTap={!isDownloading ? { scale: 0.98 } : {}}
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    下载中...
                  </>
                ) : downloadSuccess ? (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" />
                    下载成功！
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5 mr-2" />
                    开始下载
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DownloadModal;