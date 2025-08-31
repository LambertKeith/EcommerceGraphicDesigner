import { useState } from 'react';
import { Upload, Wand2, Sparkles, Zap, Star, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ImageUpload from './components/ImageUpload';
import ImageEditor from './components/ImageEditor';
import { useAppStore } from './stores/appStore';

function App() {
  const { currentImage } = useAppStore();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.6,
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
      },
    },
  };

  const floatingVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.8,
        ease: "easeOut",
      },
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse-slow"></div>
        <div className="absolute top-40 right-20 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse-slow animation-delay-2000"></div>
        <div className="absolute bottom-20 left-1/3 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse-slow animation-delay-4000"></div>
      </div>

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/20 via-transparent to-black/20"></div>

      <div className="relative z-10">
        {/* Header */}
        <header className="backdrop-blur-md bg-white/10 border-b border-white/20 shadow-glass">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <motion.div 
                className="flex items-center space-x-3"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
              >
                <div className="relative">
                  <Wand2 className="h-8 w-8 text-white drop-shadow-lg" />
                  <div className="absolute inset-0 animate-glow">
                    <Wand2 className="h-8 w-8 text-purple-400" />
                  </div>
                </div>
                <h1 className="text-xl font-bold text-white drop-shadow-lg">
                  AI Image <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Studio</span>
                </h1>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="flex items-center space-x-2 text-sm text-white/70"
              >
                <Sparkles className="h-4 w-4" />
                <span>Powered by Gemini 2.5 Flash</span>
              </motion.div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatePresence mode="wait">
            {!currentImage ? (
              <motion.div
                key="upload"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0, y: -20 }}
                className="py-12"
              >
                {/* Hero Section */}
                <motion.div 
                  variants={itemVariants}
                  className="text-center mb-16"
                >
                  <motion.h1 
                    className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight"
                    variants={itemVariants}
                  >
                    Transform Your
                    <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400">
                      Product Images
                    </span>
                    <br />
                    with AI Magic
                  </motion.h1>
                  
                  <motion.p 
                    variants={itemVariants}
                    className="text-xl text-white/80 mb-8 max-w-3xl mx-auto leading-relaxed"
                  >
                    Professional e-commerce image optimization powered by cutting-edge AI. 
                    Remove backgrounds, enhance lighting, and create stunning variants in seconds.
                  </motion.p>

                  {/* Feature Pills */}
                  <motion.div 
                    variants={itemVariants}
                    className="flex flex-wrap justify-center gap-4 mb-12"
                  >
                    {[
                      { icon: Zap, text: "Lightning Fast" },
                      { icon: Star, text: "AI-Powered" },
                      { icon: Sparkles, text: "Professional Quality" }
                    ].map((feature, index) => (
                      <motion.div
                        key={index}
                        whileHover={{ scale: 1.05 }}
                        className="flex items-center space-x-2 bg-white/10 backdrop-blur-md rounded-full px-4 py-2 border border-white/20"
                      >
                        <feature.icon className="h-4 w-4 text-purple-400" />
                        <span className="text-sm text-white font-medium">{feature.text}</span>
                      </motion.div>
                    ))}
                  </motion.div>
                </motion.div>

                {/* Upload Section */}
                <motion.div 
                  variants={floatingVariants}
                  className="max-w-3xl mx-auto"
                >
                  <div className="backdrop-blur-md bg-white/5 rounded-3xl p-8 border border-white/10 shadow-glass relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-3xl"></div>
                    <div className="relative z-10">
                      <div className="text-center mb-8">
                        <motion.div
                          animate={{ 
                            rotate: 360,
                          }}
                          transition={{ 
                            duration: 20,
                            repeat: Infinity,
                            ease: "linear"
                          }}
                          className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 mb-4 shadow-ai-glow"
                        >
                          <Upload className="h-8 w-8 text-white" />
                        </motion.div>
                        <h2 className="text-2xl font-bold text-white mb-2">
                          Upload Your Product Image
                        </h2>
                        <p className="text-white/70">
                          Drag & drop or click to select your image and watch the AI magic happen
                        </p>
                      </div>
                      <ImageUpload />
                    </div>
                  </div>
                </motion.div>

                {/* Process Steps */}
                <motion.div 
                  variants={itemVariants}
                  className="mt-16 max-w-4xl mx-auto"
                >
                  <div className="grid md:grid-cols-3 gap-8">
                    {[
                      { step: "01", title: "Upload", desc: "Drop your product image" },
                      { step: "02", title: "Enhance", desc: "AI optimizes automatically" },
                      { step: "03", title: "Download", desc: "Get professional results" }
                    ].map((item, index) => (
                      <motion.div
                        key={index}
                        variants={itemVariants}
                        className="text-center group"
                      >
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold text-lg mb-4 group-hover:scale-110 transition-transform">
                          {item.step}
                        </div>
                        <h3 className="text-xl font-semibold text-white mb-2">{item.title}</h3>
                        <p className="text-white/60">{item.desc}</p>
                        {index < 2 && (
                          <ArrowRight className="h-5 w-5 text-purple-400 mx-auto mt-4 hidden md:block" />
                        )}
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </motion.div>
            ) : (
              <motion.div
                key="editor"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.6 }}
                className="py-8"
              >
                <ImageEditor />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

export default App;