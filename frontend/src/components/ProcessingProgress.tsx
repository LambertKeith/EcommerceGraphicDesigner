import React from 'react';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { JobStatus } from '../types';

interface ProcessingProgressProps {
  status: JobStatus;
}

const ProcessingProgress: React.FC<ProcessingProgressProps> = ({ status }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-gray-500';
      case 'running':
        return 'text-blue-500';
      case 'done':
        return 'text-green-500';
      case 'error':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <div className="w-4 h-4 border-2 border-gray-300 rounded-full" />;
      case 'running':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      case 'done':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <div className="w-4 h-4 border-2 border-gray-300 rounded-full" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Queued for processing';
      case 'running':
        return 'AI is enhancing your image';
      case 'done':
        return 'Processing complete!';
      case 'error':
        return 'Processing failed';
      default:
        return 'Unknown status';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <h3 className="font-medium text-gray-900 mb-4">Processing Status</h3>
      
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          {getStatusIcon(status.status)}
          <div className="flex-1">
            <p className={`text-sm font-medium ${getStatusColor(status.status)}`}>
              {getStatusText(status.status)}
            </p>
            {status.error_msg && (
              <p className="text-xs text-red-500 mt-1">{status.error_msg}</p>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              status.status === 'error' ? 'bg-red-500' : 
              status.status === 'done' ? 'bg-green-500' : 'bg-blue-500'
            }`}
            style={{ width: `${status.progress || 0}%` }}
          />
        </div>
        
        <p className="text-xs text-gray-500">
          {status.progress || 0}% complete
        </p>
      </div>
    </div>
  );
};

export default ProcessingProgress;