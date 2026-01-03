import { X, Zap, CheckCircle, Crown, Clock, Gift, Star, Sparkles } from 'lucide-react';
import { useState, useEffect } from 'react';

interface FreeTrialModalProps {
  onClose: () => void;
  planType: 'silver' | 'gold';
  onActivate: (planType: 'silver' | 'gold') => Promise<void>;
}

export function FreeTrialModal({ onClose, planType, onActivate }: FreeTrialModalProps) {
  const [countdown, setCountdown] = useState(5);
  const [isActivating, setIsActivating] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const planDetails = {
    silver: {
      name: 'الفضية',
      emoji: '🥈',
      color: 'from-blue-500 to-blue-600',
      features: [
        'تمديد المزاد تلقائياً',
        'إعادة نشر غير محدودة',
        'دعم فني مميز 24/7',
        'إحصائيات متقدمة',
        'أولوية في البحث',
        'إشعارات فورية'
      ],
      benefits: [
        '⚡ أسرع 3x في البيع',
        '📈 زيادة 200% في المشاهدات',
        '💰 أرباح أعلى بـ 150%'
      ]
    },
    gold: {
      name: 'الذهبية',
      emoji: '🥇',
      color: 'from-yellow-400 to-orange-500',
      features: [
        'كل مميزات الباقة الفضية',
        'المساعد الذكي بالذكاء الصناعي',
        'التحليلات والتقارير المتقدمة',
        'أولوية قصوى في العرض',
        'مدير حساب شخصي',
        'استشارات تسويقية مجانية',
        'شهادة بائع موثوق',
        'حماية مزدوجة للحساب'
      ],
      benefits: [
        '🚀 أسرع 5x في البيع',
        '📊 زيادة 400% في المبيعات',
        '👑 مكانة VIP حصرية',
        '🎯 دقة 95% في التوصيات'
      ]
    }
  };

  const plan = planDetails[planType];

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleActivate = async () => {
    setIsActivating(true);
    try {
      await onActivate(planType);
      setShowConfetti(true);
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('Error activating trial:', error);
      setIsActivating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={onClose}>
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute text-2xl animate-bounce"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-10%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 3}s`
              }}
            >
              {['🎉', '✨', '🎊', '⭐', '💫'][Math.floor(Math.random() * 5)]}
            </div>
          ))}
        </div>
      )}

      <div
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        <div className={`bg-gradient-to-r ${plan.color} p-6 text-white relative overflow-hidden`}>
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />

          <div className="relative z-10">
            <button
              onClick={onClose}
              className="absolute top-0 left-0 w-10 h-10 bg-white/20 hover:bg-white/30 backdrop-blur rounded-xl flex items-center justify-center transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="text-center mb-6">
              <div className="text-6xl mb-3 animate-bounce">{plan.emoji}</div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <Gift className="w-6 h-6" />
                <h2 className="text-3xl font-bold">تجربة مجانية!</h2>
                <Gift className="w-6 h-6" />
              </div>
              <p className="text-xl">الباقة {plan.name}</p>
            </div>

            <div className="bg-white/10 backdrop-blur-xl rounded-xl p-4 border-2 border-white/30">
              <div className="flex items-center justify-center gap-3 mb-3">
                <Clock className="w-8 h-8" />
                <div className="text-center">
                  <p className="text-5xl font-bold">7</p>
                  <p className="text-sm opacity-90">أيام كاملة</p>
                </div>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold mb-1">168 ساعة من الإمكانيات اللامحدودة!</p>
                <p className="text-sm opacity-90">بدون أي التزامات مالية</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <Zap className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-green-900 mb-2">✨ ما الذي ستحصل عليه؟</h3>
                <ul className="space-y-2">
                  {plan.benefits.map((benefit, i) => (
                    <li key={i} className="text-sm text-green-800 font-medium">{benefit}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" />
              المميزات الكاملة:
            </h3>
            <div className="grid gap-2">
              {plan.features.map((feature, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 p-2 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-6">
            <h3 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              الشروط والأحكام:
            </h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li>✅ تفعيل فوري بدون دفع</li>
              <li>✅ إلغاء في أي وقت بدون رسوم</li>
              <li>✅ جميع المميزات مفعلة بالكامل</li>
              <li>✅ إشعار قبل انتهاء التجربة بـ 24 ساعة</li>
              <li>⚠️ لا يمكن تكرار التجربة المجانية</li>
              <li>💡 يمكنك الترقية للباقة المدفوعة في أي وقت</li>
            </ul>
          </div>

          <div className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-orange-200 rounded-xl p-4 mb-6 text-center">
            <p className="text-sm text-orange-800 mb-2">🎁 عرض حصري لفترة محدودة!</p>
            <p className="font-bold text-orange-900">
              أكثر من <span className="text-2xl">2,500+</span> بائع يستمتعون بالتجربة المجانية الآن!
            </p>
          </div>

          {countdown > 0 ? (
            <div className="text-center mb-4">
              <div className="inline-flex items-center gap-3 bg-gradient-to-r from-purple-100 to-pink-100 px-6 py-4 rounded-xl border-2 border-purple-300">
                <Clock className="w-6 h-6 text-purple-600 animate-pulse" />
                <div>
                  <p className="text-sm text-purple-700 mb-1">يمكنك التفعيل خلال</p>
                  <p className="text-4xl font-bold text-purple-900">{countdown}</p>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={handleActivate}
              disabled={isActivating}
              className={`w-full bg-gradient-to-r ${plan.color} text-white font-bold py-4 px-6 rounded-xl hover:shadow-2xl transition-all flex items-center justify-center gap-3 text-lg group ${
                isActivating ? 'opacity-70 cursor-not-allowed' : 'hover:-translate-y-1'
              }`}
            >
              {isActivating ? (
                <>
                  <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
                  <span>جاري التفعيل...</span>
                </>
              ) : (
                <>
                  <Crown className="w-6 h-6 group-hover:scale-110 transition-transform" />
                  <span>تفعيل التجربة المجانية الآن!</span>
                  <Zap className="w-6 h-6 group-hover:scale-110 transition-transform" />
                </>
              )}
            </button>
          )}

          <p className="text-xs text-gray-500 text-center mt-4">
            بالضغط على "تفعيل" فإنك توافق على الشروط والأحكام
          </p>
        </div>
      </div>
    </div>
  );
}
