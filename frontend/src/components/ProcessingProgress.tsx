import React from 'react';
import { CheckCircle, AlertCircle, Loader2, Sparkles, Zap, Brain, Wand2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { JobStatus } from '../types';

interface ProcessingProgressProps {
  status: JobStatus;
}

const ProcessingProgress: React.FC<ProcessingProgressProps> = ({ status }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-purple-400';
      case 'running':
        return 'text-blue-400';
      case 'done':
        return 'text-green-400';
      case 'error':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Sparkles className="w-6 h-6 text-purple-400" />;
      case 'running':
        return <Loader2 className="w-6 h-6 animate-spin text-blue-400" />;
      case 'done':
        return <CheckCircle className="w-6 h-6 text-green-400" />;
      case 'error':
        return <AlertCircle className="w-6 h-6 text-red-400" />;
      default:
        return <div className="w-6 h-6 border-2 border-gray-300 rounded-full" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return '初始化 AI 处理中...';
      case 'running':
        return 'AI 正在为您的图像施展魔法';
      case 'done':
        return '处理完成！✨';
      case 'error':
        return '出了点问题';
      default:
        return 'Unknown status';
    }
  };

  const getDetailText = (status: string) => {
    switch (status) {
      case 'pending':
        return '为您的图像准备 AI 增强';
      case 'running':
        return '应用高级滤镜和优化效果';
      case 'done':
        return '您增强后的变体已准备下载';
      case 'error':
        return '请重试或联系支持';
      default:
        return '';
    }
  };

  const processingSteps = [
    { icon: Brain, label: '分析中', description: '理解您的图像' },
    { icon: Wand2, label: '增强中', description: '应用 AI 魔法' },
    { icon: Sparkles, label: '优化中', description: '完善结果' },
    { icon: CheckCircle, label: '完成', description: '准备下载' }
  ];

  const getCurrentStep = () => {
    if (status.status === 'pending') return 0;
    if (status.status === 'running') {
      const progress = status.progress || 0;
      if (progress < 30) return 1;
      if (progress < 70) return 2;
      return 3;
    }
    if (status.status === 'done') return 4;
    return 0;
  };

  const currentStep = getCurrentStep();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="backdrop-blur-xl bg-white/10 rounded-3xl p-8 border border-white/10 shadow-glass relative overflow-hidden"
    >
      {/* Background Animation */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-pink-500/10 animate-pulse"></div>
        {status.status === 'running' && (
          <div className="absolute inset-0">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-purple-400 rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
                animate={{
                  opacity: [0.3, 1, 0.3],
                  scale: [0.5, 1.2, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.1,
                }}
              />
            ))}
          </div>
        )}
      </div>

      <div className="relative z-10 space-y-6">
        {/* Header */}
        <div className="text-center">
          <motion.div
            animate={status.status === 'running' ? { scale: [1, 1.1, 1] } : { scale: 1 }}
            transition={{ duration: 2, repeat: Infinity }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 mb-4 shadow-ai-glow"
          >
            {getStatusIcon(status.status)}
          </motion.div>
          
          <motion.h3
            key={status.status}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`text-xl font-bold ${getStatusColor(status.status)} mb-2`}
          >
            {getStatusText(status.status)}
          </motion.h3>
          
          <motion.p
            key={`${status.status}-detail`}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-white/70"
          >
            {getDetailText(status.status)}
          </motion.p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center items-center space-x-4">
          {processingSteps.slice(0, -1).map((step, index) => (
            <React.Fragment key={index}>
              <motion.div
                className="flex flex-col items-center space-y-2"
                initial={{ opacity: 0.3 }}
                animate={{ 
                  opacity: currentStep > index ? 1 : 0.3,
                  scale: currentStep === index + 1 ? 1.1 : 1,
                }}
                transition={{ duration: 0.3 }}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                  currentStep > index 
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 border-purple-400 shadow-lg' 
                    : currentStep === index + 1
                    ? 'border-blue-400 bg-blue-400/20 animate-pulse'
                    : 'border-white/30 bg-white/10'
                }`}>
                  <step.icon className={`h-5 w-5 ${
                    currentStep > index ? 'text-white' : 
                    currentStep === index + 1 ? 'text-blue-400' : 'text-white/50'
                  }`} />
                </div>
                <div className="text-center">
                  <p className={`text-xs font-medium ${
                    currentStep > index ? 'text-white' : 
                    currentStep === index + 1 ? 'text-blue-400' : 'text-white/50'
                  }`}>
                    {step.label}
                  </p>
                </div>
              </motion.div>
              
              {index < processingSteps.length - 2 && (
                <div className={`w-8 h-px transition-all duration-500 ${
                  currentStep > index + 1 ? 'bg-gradient-to-r from-purple-400 to-pink-400' : 'bg-white/20'
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-white/70">进度</span>
            <span className="text-white font-medium">{status.progress || 0}%</span>
          </div>
          
          <div className="relative w-full bg-white/20 rounded-full h-3 overflow-hidden backdrop-blur-sm">
            <motion.div
              className={`h-full rounded-full transition-all duration-500 ${
                status.status === 'error' ? 'bg-gradient-to-r from-red-500 to-pink-500' : 
                status.status === 'done' ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 
                'bg-gradient-to-r from-purple-500 to-pink-500'
              }`}
              initial={{ width: "0%" }}
              animate={{ width: `${status.progress || 0}%` }}
            />
            
            {/* Animated shine effect */}
            {status.status === 'running' && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
          </div>
        </div>

        {/* Status Details */}
        <AnimatePresence>
          {status.status === 'running' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="text-center"
            >
              <div className="inline-flex items-center space-x-2 bg-white/5 backdrop-blur-md rounded-full px-4 py-2 border border-white/10">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                <span className="text-sm text-white/80">预计时间：15-30 秒</span>
              </div>
            </motion.div>
          )}
          
          {status.status === 'done' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <div className="inline-flex items-center space-x-2 bg-green-500/20 backdrop-blur-md rounded-full px-4 py-2 border border-green-400/30">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="text-sm text-green-300 font-medium">所有变体生成成功！</span>
              </div>
            </motion.div>
          )}

          {status.error_msg && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <div className="bg-red-500/20 backdrop-blur-md rounded-xl p-4 border border-red-400/30">
                <p className="text-sm text-red-300">{status.error_msg}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default ProcessingProgress;