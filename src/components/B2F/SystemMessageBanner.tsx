import React from 'react';
import { Info } from 'lucide-react';

interface SystemMessageBannerProps {
  message: string;
  icon?: string;
  type?: 'info' | 'success' | 'warning';
}

export default function SystemMessageBanner({
  message,
  icon = '🌿',
  type = 'info'
}: SystemMessageBannerProps) {
  const bgColors = {
    info: 'bg-blue-50 border-blue-200',
    success: 'bg-green-50 border-green-200',
    warning: 'bg-yellow-50 border-yellow-200'
  };

  const textColors = {
    info: 'text-blue-800',
    success: 'text-green-800',
    warning: 'text-yellow-800'
  };

  return (
    <div className={`${bgColors[type]} border rounded-lg p-4 mb-6`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {icon ? (
            <span className="text-2xl">{icon}</span>
          ) : (
            <Info className={`w-5 h-5 ${textColors[type]}`} />
          )}
        </div>
        <div className={`flex-1 ${textColors[type]}`}>
          <p className="text-sm leading-relaxed font-medium">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}
