import { useState } from 'react';
import { Upload, Wand2, Sparkles, Zap, Star, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ImageUpload from './components/ImageUpload';
import ImageEditor from './components/ImageEditor';
import { useAppStore } from './stores/appStore';

function App() {
  const { currentImage } = useAppStore();

  // Test if basic Tailwind works
  return (
    <div className="min-h-screen bg-slate-900">
      <div className="p-8">
        <h1 className="text-4xl font-bold text-white mb-4">
          AI Image Studio - Testing
        </h1>
        <p className="text-white/70 mb-8">
          If you can see this styled text, Tailwind is working!
        </p>
        
        <div className="bg-purple-500 p-4 rounded-lg mb-4">
          <p className="text-white">Purple box test</p>
        </div>
        
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-4 rounded-lg mb-4">
          <p className="text-white">Gradient test</p>
        </div>
        
        <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-lg p-4 mb-4">
          <p className="text-white">Glassmorphism test</p>
        </div>
        
        {!currentImage ? (
          <div className="max-w-2xl mx-auto">
            <ImageUpload />
          </div>
        ) : (
          <ImageEditor />
        )}
      </div>
    </div>
  );
}

export default App;