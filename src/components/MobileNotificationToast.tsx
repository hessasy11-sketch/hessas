import { useEffect, useState } from 'react';
import { X, ExternalLink } from 'lucide-react';

interface MobileNotificationToastProps {
  title: string;
  message: string;
  icon: string;
  type: 'financial' | 'auction' | 'interaction' | 'ai_assistant' | 'system';
  priority?: 'normal' | 'important' | 'urgent';
  link?: string;
  onClose: () => void;
  onNavigate?: (link: string) => void;
}

export function MobileNotificationToast({
  title,
  message,
  icon,
  type,
  priority = 'normal',
  link,
  onClose,
  onNavigate
}: MobileNotificationToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 100);

    const timer = setTimeout(() => {
      handleClose();
    }, 5000);

    if ('vibrate' in navigator && priority === 'urgent') {
      navigator.vibrate([200, 100, 200]);
    }

    return () => clearTimeout(timer);
  }, [priority]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  const handleClick = () => {
    if (link && onNavigate) {
      onNavigate(link);
      handleClose();
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const diff = e.touches[0].clientX - startX;
    if (diff > 0) {
      setCurrentX(diff);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (currentX > 100) {
      handleClose();
    } else {
      setCurrentX(0);
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'financial': return 'from-green-500 to-emerald-600';
      case 'auction': return 'from-yellow-500 to-amber-600';
      case 'interaction': return 'from-gray-500 to-gray-600';
      case 'ai_assistant': return 'from-blue-500 to-cyan-600';
      case 'system': return 'from-purple-500 to-indigo-600';
      default: return 'from-green-500 to-emerald-600';
    }
  };

  const getBorderColor = () => {
    if (priority === 'urgent') return 'border-red-500';
    if (priority === 'important') return 'border-yellow-500';
    return 'border-gray-300';
  };

  return (
    <div
      className={`fixed top-20 left-4 right-4 z-[100] transition-all duration-300 ${
        isVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
      }`}
      style={{
        transform: `translateX(${currentX}px)`,
        transition: isDragging ? 'none' : 'all 0.3s'
      }}
      dir="rtl"
    >
      <div
        className={`bg-gradient-to-r ${getBackgroundColor()} rounded-2xl shadow-2xl border-2 ${getBorderColor()} overflow-hidden cursor-pointer`}
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="bg-white/95 backdrop-blur-sm p-4">
          <div className="flex items-start gap-3">
            <div className="text-4xl flex-shrink-0 animate-bounce">{icon}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h4 className="font-bold text-gray-900 text-lg">{title}</h4>
                {priority === 'urgent' && (
                  <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold animate-pulse">
                    عاجل
                  </span>
                )}
                {priority === 'important' && (
                  <span className="bg-yellow-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                    مهم
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-700 line-clamp-2">{message}</p>
              {link && (
                <div className="mt-2 text-xs text-blue-600 flex items-center gap-1">
                  <ExternalLink className="w-3 h-3" />
                  اضغط لعرض التفاصيل
                </div>
              )}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClose();
              }}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="h-1 bg-white/20">
          <div
            className="h-full bg-white/60 animate-progress"
            style={{
              animation: 'progress 5s linear'
            }}
          />
        </div>
      </div>

      {isDragging && currentX > 50 && (
        <div className="text-center mt-2 text-sm text-white bg-black/50 rounded-lg py-1 px-3 inline-block">
          اسحب لليمين لإغلاق
        </div>
      )}

      <style>{`
        @keyframes progress {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}
