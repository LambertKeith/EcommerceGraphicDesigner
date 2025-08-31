import React from 'react';
import { Star, Download, Maximize2 } from 'lucide-react';
import { Variant } from '../types';

interface VariantGalleryProps {
  variants: Variant[];
}

const VariantGallery: React.FC<VariantGalleryProps> = ({ variants }) => {
  if (variants.length === 0) {
    return null;
  }

  const sortedVariants = [...variants].sort((a, b) => b.score - a.score);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium text-gray-900">AI Enhanced Results</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedVariants.map((variant, index) => (
          <div
            key={variant.id}
            className="bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-md transition-shadow"
          >
            {/* Variant Image */}
            <div className="relative aspect-square bg-gray-100">
              <img
                src={variant.thumb_path ? `/static${variant.thumb_path}` : '/static/placeholder.jpg'}
                alt={`Variant ${index + 1}`}
                className="w-full h-full object-cover"
              />
              
              {/* Score Badge */}
              <div className="absolute top-2 right-2 bg-white bg-opacity-90 rounded-full px-2 py-1 flex items-center space-x-1">
                <Star className="h-3 w-3 text-yellow-500 fill-current" />
                <span className="text-xs font-medium text-gray-700">
                  {Math.round(variant.score * 100)}
                </span>
              </div>

              {/* Best Result Badge */}
              {index === 0 && (
                <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                  Best Result
                </div>
              )}
            </div>

            {/* Variant Info */}
            <div className="p-4">
              <h3 className="font-medium text-gray-900 mb-2">
                Variant {index + 1}
              </h3>
              
              {/* Enhancement Details */}
              {variant.meta_json?.applied && (
                <div className="text-xs text-gray-500 mb-3">
                  <p className="font-medium">Enhancements:</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {variant.meta_json.applied.map((enhancement: string, i: number) => (
                      <span
                        key={i}
                        className="bg-gray-100 px-2 py-1 rounded text-xs"
                      >
                        {enhancement.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-2">
                <button className="flex-1 flex items-center justify-center px-3 py-2 bg-primary-600 text-white text-sm font-medium rounded hover:bg-primary-700 transition-colors">
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </button>
                <button className="px-3 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded hover:bg-gray-50 transition-colors">
                  <Maximize2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="bg-gray-50 rounded-lg p-4">
        <p className="text-sm text-gray-600">
          Generated {variants.length} enhanced {variants.length === 1 ? 'variant' : 'variants'} • 
          Best score: {Math.round(sortedVariants[0]?.score * 100)}% • 
          Processing completed successfully
        </p>
      </div>
    </div>
  );
};

export default VariantGallery;