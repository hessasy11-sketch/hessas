import { X, Lock, Crown, Sparkles } from 'lucide-react';

interface FeatureLockedModalProps {
  featureName: string;
  requiredPlan: 'silver' | 'gold';
  onClose: () => void;
  onUpgrade: () => void;
}

export function FeatureLockedModal({
  featureName,
  requiredPlan,
  onClose,
  onUpgrade,
}: FeatureLockedModalProps) {
  const planNames = {
    silver: 'الفضية',
    gold: 'الذهبية',
  };

  const planPrices = {
    silver: '20',
    gold: '49',
  };

  const planColors = {
    silver: 'from-blue-500 to-blue-600',
    gold: 'from-yellow-500 to-yellow-600',
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scaleIn">
        <div className={`bg-gradient-to-r ${planColors[requiredPlan]} text-white p-6`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 rounded-xl">
                <Lock className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-xl font-bold">ميزة محجوزة</h2>
                <p className="text-sm text-white/90">يتطلب الباقة {planNames[requiredPlan]}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              {requiredPlan === 'gold' ? (
                <Crown className="w-10 h-10 text-yellow-500" />
              ) : (
                <Sparkles className="w-10 h-10 text-blue-500" />
              )}
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">{featureName}</h3>
            <p className="text-gray-600">
              هذه الميزة متاحة فقط لمشتركي الباقة {planNames[requiredPlan]} أو أعلى
            </p>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
            <h4 className="font-bold text-gray-800 mb-3">مميزات الباقة {planNames[requiredPlan]}:</h4>
            <ul className="space-y-2">
              {requiredPlan === 'silver' && (
                <>
                  <li className="flex items-center gap-2 text-sm text-gray-700">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                    <span>إعلانات غير محدودة</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-700">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                    <span>تمديد المزادات</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-700">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                    <span>إعادة نشر المزادات</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-700">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                    <span>دعم أولوية</span>
                  </li>
                </>
              )}
              {requiredPlan === 'gold' && (
                <>
                  <li className="flex items-center gap-2 text-sm text-gray-700">
                    <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full" />
                    <span>جميع مميزات الفضية</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-700">
                    <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full" />
                    <span>المساعد الذكي المتقدم</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-700">
                    <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full" />
                    <span>تحليلات متقدمة</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-700">
                    <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full" />
                    <span>علامة تجارية مخصصة</span>
                  </li>
                </>
              )}
            </ul>
          </div>

          <div className="text-center">
            <div className="text-3xl font-bold text-gray-800 mb-2">
              {planPrices[requiredPlan]} ر.س
              <span className="text-sm text-gray-500 font-normal"> / شهرياً</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onUpgrade}
              className={`flex-1 bg-gradient-to-r ${planColors[requiredPlan]} text-white py-4 rounded-xl hover:shadow-lg transition-all font-bold`}
            >
              الترقية الآن
            </button>
            <button
              onClick={onClose}
              className="px-6 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all"
            >
              إلغاء
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scaleIn {
          from {
            transform: scale(0.9);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
