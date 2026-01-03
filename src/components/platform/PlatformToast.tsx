import { useEffect } from 'react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error';
  message: string;
}

interface PlatformToastProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

export default function PlatformToast({ toasts, onRemove }: PlatformToastProps) {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2" dir="rtl">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onRemove }: { toast: ToastMessage; onRemove: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(toast.id);
    }, 4000);

    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  return (
    <div
      className={`flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl backdrop-blur-sm animate-[slideDown_0.3s_ease-out] min-w-[400px] ${
        toast.type === 'success'
          ? 'bg-green-500/95 text-white'
          : 'bg-red-500/95 text-white'
      }`}
    >
      {toast.type === 'success' ? (
        <CheckCircle className="w-6 h-6 flex-shrink-0" />
      ) : (
        <AlertCircle className="w-6 h-6 flex-shrink-0" />
      )}
      <p className="flex-1 font-semibold">{toast.message}</p>
      <button
        onClick={() => onRemove(toast.id)}
        className="w-8 h-8 hover:bg-white/20 rounded-lg flex items-center justify-center transition-all flex-shrink-0"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}
