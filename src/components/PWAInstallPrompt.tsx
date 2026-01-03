import { useState } from 'react';
import { Download, X, Smartphone } from 'lucide-react';
import { usePWA } from '../hooks/usePWA';

export function PWAInstallPrompt() {
  const { isInstallable, isInstalled, installApp } = usePWA();
  const [isDismissed, setIsDismissed] = useState(false);

  if (!isInstallable || isInstalled || isDismissed) {
    return null;
  }

  const handleInstall = async () => {
    const success = await installApp();
    if (success) {
      setIsDismissed(true);
    }
  };

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-slide-up" dir="rtl">
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl shadow-2xl p-4 border-2 border-white/30">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center flex-shrink-0">
            <Smartphone className="w-7 h-7 text-green-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-white mb-1">
              ثبّت تطبيق حصص زراعية للاستثمار
            </h3>
            <p className="text-sm text-white/90 mb-3">
              احصل على تجربة أسرع مع إشعارات فورية وإمكانية الوصول السريع
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleInstall}
                className="flex items-center gap-2 bg-white text-green-600 px-4 py-2 rounded-xl font-bold text-sm hover:bg-green-50 transition-all shadow-lg"
              >
                <Download className="w-4 h-4" />
                تثبيت الآن
              </button>
              <button
                onClick={() => setIsDismissed(true)}
                className="bg-white/20 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-white/30 transition-all"
              >
                لاحقاً
              </button>
            </div>
          </div>
          <button
            onClick={() => setIsDismissed(true)}
            className="text-white/70 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}
