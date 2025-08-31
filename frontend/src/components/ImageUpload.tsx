import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, AlertCircle, Loader2, Image, CheckCircle2, FileImage, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiService } from '../services/api';
import { useAppStore } from '../stores/appStore';

const ImageUpload: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { 
    isUploading, 
    setIsUploading, 
    setCurrentImage, 
    setCurrentSession 
  } = useAppStore();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setError(null);
    setIsUploading(true);
    setUploadProgress(0);

    // Simulate progress updates
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + Math.random() * 15;
      });
    }, 200);

    try {
      const uploadResult = await apiService.uploadImage(file, 'My Project');
      
      setUploadProgress(95);
      
      const sessionResult = await apiService.createSession(uploadResult.project_id);
      
      setUploadProgress(100);
      
      setCurrentImage({
        id: uploadResult.image_id,
        project_id: uploadResult.project_id,
        path: '',
        url: uploadResult.url,
        width: uploadResult.width,
        height: uploadResult.height,
        meta_json: {},
        created_at: new Date().toISOString(),
      });

      setCurrentSession({
        id: sessionResult.session_id,
        project_id: uploadResult.project_id,
        context_json: {},
        created_at: new Date().toISOString(),
        last_active_at: new Date().toISOString(),
      });

      clearInterval(progressInterval);

    } catch (err) {
      clearInterval(progressInterval);
      setError(err instanceof Error ? err.message : 'Upload failed');
      setUploadProgress(0);
    } finally {
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 1000);
    }
  }, [setIsUploading, setCurrentImage, setCurrentSession]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
    disabled: isUploading,
  });

  const dropzoneVariants = {
    idle: { 
      scale: 1,
      borderColor: 'rgba(255, 255, 255, 0.2)',
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    hover: { 
      scale: 1.02,
      borderColor: 'rgba(147, 51, 234, 0.5)',
      backgroundColor: 'rgba(147, 51, 234, 0.1)',
      boxShadow: '0 0 30px rgba(147, 51, 234, 0.3)',
    },
    active: { 
      scale: 1.05,
      borderColor: 'rgba(236, 72, 153, 0.7)',
      backgroundColor: 'rgba(236, 72, 153, 0.1)',
      boxShadow: '0 0 40px rgba(236, 72, 153, 0.4)',
    },
    reject: {
      scale: 0.98,
      borderColor: 'rgba(239, 68, 68, 0.7)',
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
    }
  };

  const uploadStates = {
    idle: {
      icon: Upload,
      title: "将图像放在这里",
      subtitle: "或点击浏览文件",
      color: "text-white/70"
    },
    dragActive: {
      icon: FileImage,
      title: "太棒了！🔥",
      subtitle: "释放鼠标上传您的图像",
      color: "text-purple-300"
    },
    dragReject: {
      icon: AlertCircle,
      title: "无效的文件类型",
      subtitle: "请选择有效的图像文件",
      color: "text-red-300"
    },
    uploading: {
      icon: Loader2,
      title: "正在上传您的作品...",
      subtitle: `${Math.round(uploadProgress)}% complete`,
      color: "text-purple-300"
    }
  };

  const getCurrentState = () => {
    if (isUploading) return uploadStates.uploading;
    if (isDragReject) return uploadStates.dragReject;
    if (isDragActive) return uploadStates.dragActive;
    return uploadStates.idle;
  };

  const currentState = getCurrentState();
  const IconComponent = currentState.icon;

  return (
    <div className="w-full">
      <motion.div
        {...getRootProps()}
        variants={dropzoneVariants}
        initial="idle"
        animate={
          isUploading ? "idle" :
          isDragReject ? "reject" :
          isDragActive ? "active" : 
          "hover"
        }
        whileHover={!isUploading ? "hover" : "idle"}
        className="relative cursor-pointer transition-all duration-300 ease-out"
      >
        <div className="relative backdrop-blur-xl bg-white/10 border-2 border-dashed rounded-2xl p-12 text-center overflow-hidden">
          {/* Animated background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          
          <input {...getInputProps()} />
          
          <div className="relative z-10 space-y-6">
            {/* Icon */}
            <motion.div
              animate={isUploading ? { rotate: 360 } : { rotate: 0 }}
              transition={{ 
                duration: isUploading ? 2 : 0.3,
                repeat: isUploading ? Infinity : 0,
                ease: "linear"
              }}
              className="flex justify-center"
            >
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center shadow-ai-glow">
                  <IconComponent className="h-8 w-8 text-white" />
                </div>
                {isUploading && (
                  <motion.div
                    className="absolute inset-0 rounded-full border-4 border-purple-300 border-t-transparent"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                )}
              </div>
            </motion.div>

            {/* Text Content */}
            <div className="space-y-2">
              <motion.h3 
                key={currentState.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`text-xl font-semibold ${currentState.color}`}
              >
                {currentState.title}
              </motion.h3>
              
              <motion.p 
                key={currentState.subtitle}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-white/60"
              >
                {currentState.subtitle}
              </motion.p>
            </div>

            {/* Progress Bar */}
            <AnimatePresence>
              {isUploading && (
                <motion.div
                  initial={{ opacity: 0, scaleX: 0 }}
                  animate={{ opacity: 1, scaleX: 1 }}
                  exit={{ opacity: 0, scaleX: 0 }}
                  className="w-full max-w-xs mx-auto"
                >
                  <div className="bg-white/20 rounded-full h-2 overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                      initial={{ width: "0%" }}
                      animate={{ width: `${uploadProgress}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* File Requirements */}
            {!isUploading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="flex flex-wrap justify-center gap-3 text-xs text-white/50"
              >
                {['JPEG', 'PNG', 'WebP'].map((format, index) => (
                  <div key={format} className="flex items-center space-x-1">
                    <div className="w-1 h-1 bg-purple-400 rounded-full"></div>
                    <span>{format}</span>
                  </div>
                ))}
                <div className="flex items-center space-x-1">
                  <div className="w-1 h-1 bg-pink-400 rounded-full"></div>
                  <span>Max 10MB</span>
                </div>
              </motion.div>
            )}

            {/* Success State */}
            {uploadProgress === 100 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center justify-center space-x-2 text-green-300"
              >
                <CheckCircle2 className="h-5 w-5" />
                <span className="text-sm font-medium">上传成功！</span>
              </motion.div>
            )}
          </div>

          {/* Floating particles effect */}
          {isDragActive && (
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 bg-purple-400 rounded-full"
                  style={{
                    left: `${20 + i * 15}%`,
                    top: `${30 + (i % 2) * 40}%`,
                  }}
                  animate={{
                    y: [-10, -30, -10],
                    opacity: [0.3, 1, 0.3],
                    scale: [0.8, 1.2, 0.8],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* Error Display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="mt-6"
          >
            <div className="backdrop-blur-md bg-red-500/10 border border-red-500/20 rounded-xl p-4">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-red-300">上传失败</h4>
                  <p className="text-sm text-red-400/80">{error}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ImageUpload;