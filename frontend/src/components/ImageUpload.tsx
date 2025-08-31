import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, AlertCircle, Loader2 } from 'lucide-react';
import { apiService } from '../services/api';
import { useAppStore } from '../stores/appStore';

const ImageUpload: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
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

    try {
      const uploadResult = await apiService.uploadImage(file, 'My Project');
      
      const sessionResult = await apiService.createSession(uploadResult.project_id);
      
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

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  }, [setIsUploading, setCurrentImage, setCurrentSession]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
    disabled: isUploading,
  });

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-gray-400'}
          ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        <div className="space-y-4">
          {isUploading ? (
            <Loader2 className="mx-auto h-12 w-12 text-primary-600 animate-spin" />
          ) : (
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
          )}
          
          <div className="space-y-2">
            {isUploading ? (
              <p className="text-base text-gray-700">Uploading your image...</p>
            ) : isDragActive ? (
              <p className="text-base text-primary-600">Drop your image here...</p>
            ) : (
              <>
                <p className="text-base text-gray-700">
                  Drag & drop your product image here, or{' '}
                  <span className="text-primary-600 hover:text-primary-500">browse</span>
                </p>
                <p className="text-sm text-gray-500">
                  Supports JPEG, PNG, WebP (max 10MB)
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <p className="ml-2 text-sm text-red-600">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;