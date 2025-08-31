import { useState } from 'react';
import { Upload, Wand2 } from 'lucide-react';
import ImageUpload from './components/ImageUpload';
import ImageEditor from './components/ImageEditor';
import { useAppStore } from './stores/appStore';

function App() {
  const { currentImage } = useAppStore();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-2">
              <Wand2 className="h-8 w-8 text-primary-600" />
              <h1 className="text-xl font-semibold text-gray-900">
                AI E-commerce Image Editor
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!currentImage ? (
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <h2 className="mt-2 text-lg font-medium text-gray-900">
                Upload Your Product Image
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Get started by uploading a product image to optimize with AI
              </p>
            </div>
            <ImageUpload />
          </div>
        ) : (
          <ImageEditor />
        )}
      </main>
    </div>
  );
}

export default App;