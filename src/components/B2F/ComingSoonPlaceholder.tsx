import React from 'react';
import { Clock, Sparkles } from 'lucide-react';

interface ComingSoonPlaceholderProps {
  title?: string;
  description?: string;
}

export const ComingSoonPlaceholder: React.FC<ComingSoonPlaceholderProps> = ({
  title = 'قريباً',
  description = 'نعمل على تطوير هذا القسم ليقدم لك تجربة أفضل'
}) => {
  return (
    <div className="flex items-center justify-center min-h-[400px] p-8">
      <div className="text-center space-y-6 max-w-md">
        <div className="relative inline-flex">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/20 to-teal-400/20 blur-2xl animate-pulse" />
          <div className="relative bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full p-6 shadow-lg">
            <Clock className="w-12 h-12 text-white" />
          </div>
          <div className="absolute -top-1 -right-1">
            <Sparkles className="w-6 h-6 text-amber-400 animate-pulse" />
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-2xl font-bold text-gray-900">
            {title}
          </h3>
          <p className="text-gray-600 leading-relaxed">
            {description}
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 pt-4">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
};
