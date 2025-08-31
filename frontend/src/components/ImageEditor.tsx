import React, { useState, useEffect } from 'react';
import { Wand2, RotateCw, Download, MessageSquare, Sparkles } from 'lucide-react';
import { apiService } from '../services/api';
import { useAppStore } from '../stores/appStore';
import VariantGallery from './VariantGallery';
import ProcessingProgress from './ProcessingProgress';

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
    setCurrentJob
  } = useAppStore();

  const [editType, setEditType] = useState<'optimize' | 'edit' | 'refine'>('optimize');
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState<string | null>(null);

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
        editType === 'optimize' ? undefined : prompt
      );

      setCurrentJob({
        id: result.job_id,
        session_id: currentSession.id,
        input_image_id: currentImage.id,
        type: editType,
        prompt: prompt,
        status: 'pending',
        result_variant_ids: [],
        created_at: new Date().toISOString()
      });

      // Start polling for job status
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
        // Continue polling
        setTimeout(() => pollJobStatus(jobId), 2000);
      }
    } catch (err) {
      setError('Failed to check job status');
      setIsProcessing(false);
    }
  };

  const handleExport = async (format: 'jpg' | 'png' | 'webp', width?: number, height?: number) => {
    if (!currentImage) return;

    try {
      const result = await apiService.exportImage(currentImage.id, format, width, height);
      
      // Create download link
      const link = document.createElement('a');
      link.href = result.download_url;
      link.download = `exported_image.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    }
  };

  if (!currentImage) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Original Image */}
      <div className="space-y-4">
        <h2 className="text-lg font-medium text-gray-900">Original Image</h2>
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <img
            src={currentImage.url}
            alt="Original"
            className="w-full h-auto max-h-96 object-contain"
          />
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <h3 className="font-medium text-gray-900 mb-3">Image Details</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <div>Dimensions: {currentImage.width} × {currentImage.height}</div>
            <div>Format: {currentImage.meta_json?.mimeType || 'Unknown'}</div>
          </div>
        </div>
      </div>

      {/* Editor Controls */}
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">AI Enhancement</h2>
          
          {/* Edit Type Selection */}
          <div className="space-y-3 mb-4">
            <label className="block text-sm font-medium text-gray-700">
              Enhancement Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setEditType('optimize')}
                className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                  editType === 'optimize'
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <Sparkles className="h-4 w-4 mx-auto mb-1" />
                Optimize
              </button>
              <button
                onClick={() => setEditType('edit')}
                className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                  editType === 'edit'
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <Wand2 className="h-4 w-4 mx-auto mb-1" />
                Edit
              </button>
              <button
                onClick={() => setEditType('refine')}
                className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                  editType === 'refine'
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <RotateCw className="h-4 w-4 mx-auto mb-1" />
                Refine
              </button>
            </div>
          </div>

          {/* Prompt Input */}
          {editType !== 'optimize' && (
            <div className="space-y-2 mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Instructions
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={
                  editType === 'edit' 
                    ? 'Describe how you want to modify the image (e.g., "change background to white", "improve lighting")'
                    : 'Describe specific refinements you want to make'
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                rows={3}
              />
            </div>
          )}

          {/* Action Button */}
          <button
            onClick={handleStartEdit}
            disabled={isProcessing || (editType !== 'optimize' && !prompt.trim())}
            className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <RotateCw className="animate-spin -ml-1 mr-3 h-4 w-4" />
            ) : (
              <Wand2 className="-ml-1 mr-3 h-4 w-4" />
            )}
            {isProcessing ? 'Processing...' : `${editType === 'optimize' ? 'Optimize' : editType === 'edit' ? 'Edit' : 'Refine'} Image`}
          </button>

          {/* Error Display */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>

        {/* Processing Progress */}
        {isProcessing && jobStatus && (
          <ProcessingProgress status={jobStatus} />
        )}

        {/* Export Options */}
        {variants.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="font-medium text-gray-900 mb-4">Export Options</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleExport('jpg', 1080, 1080)}
                className="flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
              >
                <Download className="h-4 w-4 mr-2" />
                JPG 1080×1080
              </button>
              <button
                onClick={() => handleExport('png', 1500, 1500)}
                className="flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
              >
                <Download className="h-4 w-4 mr-2" />
                PNG 1500×1500
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {variants.length > 0 && (
        <div className="lg:col-span-2">
          <VariantGallery variants={variants} />
        </div>
      )}
    </div>
  );
};

export default ImageEditor;