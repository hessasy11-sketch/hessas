import { useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

interface AdminToastProps {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  onClose: () => void;
  duration?: number;
}

export function AdminToast({ message, type, onClose, duration = 3000 }: AdminToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const config = {
    success: {
      icon: CheckCircle,
      bg: 'bg-emerald-500',
      border: 'border-emerald-600',
      text: 'text-white',
    },
    error: {
      icon: XCircle,
      bg: 'bg-red-500',
      border: 'border-red-600',
      text: 'text-white',
    },
    warning: {
      icon: AlertCircle,
      bg: 'bg-orange-500',
      border: 'border-orange-600',
      text: 'text-white',
    },
    info: {
      icon: Info,
      bg: 'bg-blue-500',
      border: 'border-blue-600',
      text: 'text-white',
    },
  };

  const { icon: Icon, bg, border, text } = config[type];

  return (
    <div
      className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] animate-in slide-in-from-top duration-300"
      style={{ minWidth: '320px', maxWidth: '500px' }}
    >
      <div
        className={`${bg} ${border} border-2 rounded-xl shadow-2xl p-4 flex items-center gap-3 ${text}`}
      >
        <div className="flex-shrink-0">
          <Icon className="w-6 h-6" />
        </div>
        <p className="flex-1 font-semibold">{message}</p>
        <button
          onClick={onClose}
          className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
