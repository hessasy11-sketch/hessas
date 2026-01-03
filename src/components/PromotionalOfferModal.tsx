import { useState } from 'react';
import { X, Gift, Sparkles, Calendar, Clock, Zap, Star } from 'lucide-react';
import { usePromotionalOffer } from '../hooks/usePromotionalOffer';

interface PromotionalOfferModalProps {
  userId: string;
  onAccept: (offerId: string, planId: string) => void;
  onClose: () => void;
}

export function PromotionalOfferModal({ userId, onAccept, onClose }: PromotionalOfferModalProps) {
  const { offer, daysRemaining, acceptOffer, rejectOffer } = usePromotionalOffer(userId);
  const [accepting, setAccepting] = useState(false);

  if (!offer) return null;

  const handleAccept = async () => {
    setAccepting(true);
    const success = await acceptOffer(offer.id);
    if (success) {
      onAccept(offer.id, offer.target_plan_id);
    }
    setAccepting(false);
  };

  const handleReject = async () => {
    await rejectOffer(offer.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="relative bg-gradient-to-br from-yellow-50 via-white to-yellow-50 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-scaleIn border-4 border-yellow-400">
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-400 animate-shimmer" />

        <div className="relative bg-gradient-to-r from-yellow-500 via-yellow-600 to-yellow-500 text-white p-8 overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-4 left-4 w-20 h-20 bg-white rounded-full blur-xl animate-pulse" />
            <div className="absolute bottom-4 right-4 w-32 h-32 bg-white rounded-full blur-xl animate-pulse delay-1000" />
          </div>

          <button
            onClick={handleReject}
            className="absolute top-4 left-4 p-2 hover:bg-white/20 rounded-lg transition z-10"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="relative text-center space-y-4">
            <div className="inline-block relative">
              <div className="absolute inset-0 bg-white/30 rounded-full blur-xl animate-ping" />
              <div className="relative bg-white/20 backdrop-blur-sm p-6 rounded-full border-4 border-white/40">
                <Gift className="w-16 h-16 animate-bounce" />
              </div>
            </div>

            <div>
              <h2 className="text-4xl font-bold mb-2 drop-shadow-lg">
                {offer.offer_title}
              </h2>
              <p className="text-xl text-yellow-100">
                عرض خاص ومحدود لك فقط!
              </p>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-6">
          <div className="bg-gradient-to-br from-yellow-100 to-orange-100 rounded-2xl p-6 border-2 border-yellow-300 shadow-lg">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <Sparkles className="w-8 h-8 text-yellow-600 animate-pulse" />
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-gray-800 mb-2">كيف يعمل العرض؟</h3>
                <div className="space-y-3 text-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-yellow-500 text-white rounded-full flex items-center justify-center font-bold">
                      1
                    </div>
                    <p>اشترك في باقة <span className="font-bold">{offer.plan_name}</span> الآن</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-yellow-500 text-white rounded-full flex items-center justify-center font-bold">
                      2
                    </div>
                    <p>استمتع بجميع المميزات لمدة شهر كامل</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-yellow-500 text-white rounded-full flex items-center justify-center font-bold">
                      3
                    </div>
                    <p>نهديك <span className="font-bold text-yellow-700">شهراً إضافياً مجاناً</span> بعد أول دورة دفع!</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-4 border-2 border-yellow-200 shadow-md text-center">
              <Calendar className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-800">{offer.bonus_months}</div>
              <div className="text-sm text-gray-600">شهر مجاني</div>
            </div>

            <div className="bg-white rounded-xl p-4 border-2 border-yellow-200 shadow-md text-center">
              <Clock className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-800">{daysRemaining}</div>
              <div className="text-sm text-gray-600">يوم متبقي</div>
            </div>

            <div className="bg-white rounded-xl p-4 border-2 border-yellow-200 shadow-md text-center">
              <Zap className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-800">{offer.plan_price} ر.س</div>
              <div className="text-sm text-gray-600">سعر الشهر</div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-2xl p-6 border-2 border-blue-200">
            <div className="flex items-start gap-3">
              <Star className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-bold text-blue-900 mb-2">رسالة من المساعد الذكي:</h4>
                <p className="text-blue-800 whitespace-pre-line leading-relaxed">
                  {offer.ai_message}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-red-50 rounded-xl p-4 border-2 border-red-200">
            <div className="flex items-center justify-center gap-2 text-red-700">
              <Clock className="w-5 h-5 animate-pulse" />
              <p className="font-bold">
                هذا العرض صالح لمدة {daysRemaining} {daysRemaining === 1 ? 'يوم' : 'أيام'} فقط!
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleAccept}
              disabled={accepting}
              className="flex-1 bg-gradient-to-r from-yellow-500 via-yellow-600 to-yellow-500 text-white py-5 rounded-xl hover:from-yellow-600 hover:via-yellow-700 hover:to-yellow-600 transition-all shadow-lg font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed animate-pulse"
            >
              {accepting ? 'جاري المعالجة...' : '🎉 اشترك الآن واحصل على الهدية'}
            </button>
            <button
              onClick={handleReject}
              className="px-6 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all"
            >
              لاحقاً
            </button>
          </div>
        </div>

        <div className="absolute top-10 right-10 animate-float">
          <div className="text-6xl">🎁</div>
        </div>
        <div className="absolute bottom-10 left-10 animate-float delay-1000">
          <div className="text-5xl">✨</div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
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
        @keyframes shimmer {
          0%, 100% { background-position: -200% center; }
          50% { background-position: 200% center; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .animate-scaleIn {
          animation: scaleIn 0.4s ease-out;
        }
        .animate-shimmer {
          background-size: 200% 100%;
          animation: shimmer 3s linear infinite;
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        .delay-1000 {
          animation-delay: 1s;
        }
      `}</style>
    </div>
  );
}
