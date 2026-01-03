import { X, Info, Sparkles } from 'lucide-react';

interface DetailsComingSoonModalProps {
  onClose: () => void;
}

export function DetailsComingSoonModal({ onClose }: DetailsComingSoonModalProps) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="bg-gradient-to-r from-emerald-500 to-green-600 p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12" />

          <button
            onClick={onClose}
            className="absolute top-4 left-4 text-white/80 hover:text-white p-2 hover:bg-white/20 rounded-full transition-all"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center justify-center mb-3">
            <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-white animate-pulse" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-white text-center mb-2">
            قريباً جداً
          </h2>
          <p className="text-white/90 text-center text-sm">
            نعمل على إضافة تفاصيل أكثر
          </p>
        </div>

        <div className="p-6">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-gray-700 leading-relaxed">
                <p className="font-semibold text-emerald-700 mb-1">التفاصيل ستظهر في المرحلة القادمة</p>
                <p>سنوفر لك معلومات شاملة عن كل عرض استثماري مع إمكانية الحجز والتواصل المباشر.</p>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold py-3 px-4 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg"
          >
            فهمت
          </button>
        </div>
      </div>
    </div>
  );
}
