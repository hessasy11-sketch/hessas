import { Sparkles, Zap, Crown, ArrowRight, Gift } from 'lucide-react';

interface PlanAwareBannerProps {
  currentPlanType: string;
  onUpgradeClick: () => void;
}

export function PlanAwareBanner({ currentPlanType, onUpgradeClick }: PlanAwareBannerProps) {
  if (currentPlanType === 'free') {
    return (
      <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 border-2 border-emerald-300 rounded-xl p-5 shadow-lg">
        <div className="flex items-start gap-4">
          <div className="bg-white p-3 rounded-full">
            <Gift className="w-8 h-8 text-emerald-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-black text-white mb-2 flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              عرض حصري: شهر عليك وشهر علينا!
            </h3>
            <p className="text-white/95 font-medium mb-3 leading-relaxed">
              اشترك في الباقة الفضية لشهر واحد واحصل على شهر إضافي مجاناً تماماً!
              استفد من التمديد، إعادة النشر، والأدوات المتقدمة.
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="bg-white/20 text-white px-3 py-1 rounded-full text-sm font-bold">
                ⏰ تمديد حتى 48 ساعة
              </span>
              <span className="bg-white/20 text-white px-3 py-1 rounded-full text-sm font-bold">
                🔄 إعادة نشر مرتين
              </span>
              <span className="bg-white/20 text-white px-3 py-1 rounded-full text-sm font-bold">
                📢 إعلان قرب الانتهاء
              </span>
            </div>
            <button
              onClick={onUpgradeClick}
              className="bg-white text-emerald-600 px-6 py-3 rounded-lg font-black hover:bg-emerald-50 transition-all flex items-center gap-2 shadow-md"
            >
              <span>اشترك الآن واحصل على شهرين!</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (currentPlanType === 'silver') {
    return (
      <div className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 border-2 border-blue-300 rounded-xl p-5 shadow-lg">
        <div className="flex items-start gap-4">
          <div className="bg-white p-3 rounded-full">
            <Crown className="w-8 h-8 text-amber-500" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-black text-white mb-2 flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              ارتقِ للباقة الذهبية واحصل على المساعد الذكي!
            </h3>
            <p className="text-white/95 font-medium mb-3 leading-relaxed">
              باقتك جيدة، لكن الذهبية تقدم لك الذكاء الصناعي الكامل: تحليل تلقائي، اقتراحات ذكية، وتوقع الأسعار!
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="bg-white/20 text-white px-3 py-1 rounded-full text-sm font-bold">
                🤖 مساعد ذكي متكامل
              </span>
              <span className="bg-white/20 text-white px-3 py-1 rounded-full text-sm font-bold">
                📊 تحليل تلقائي كل 5 دقائق
              </span>
              <span className="bg-white/20 text-white px-3 py-1 rounded-full text-sm font-bold">
                ⏱️ تمديد حتى 7 أيام
              </span>
              <span className="bg-white/20 text-white px-3 py-1 rounded-full text-sm font-bold">
                ♾️ إعادة نشر غير محدودة
              </span>
            </div>
            <button
              onClick={onUpgradeClick}
              className="bg-white text-purple-600 px-6 py-3 rounded-lg font-black hover:bg-purple-50 transition-all flex items-center gap-2 shadow-md"
            >
              <span>ارتقِ للباقة الذهبية الآن</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export function GoldAIWelcomeBanner() {
  return (
    <div className="bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 border-2 border-amber-300 rounded-xl p-5 shadow-xl">
      <div className="flex items-start gap-4">
        <div className="bg-white p-3 rounded-full animate-pulse">
          <Zap className="w-8 h-8 text-amber-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-2xl font-black text-gray-900 mb-2 flex items-center gap-2">
            <Crown className="w-6 h-6 text-amber-700" />
            المساعد الذكي جاهز لدعم مزادك!
          </h3>
          <p className="text-gray-800 font-medium mb-3 leading-relaxed">
            باقتك الذهبية تمنحك وصولاً كاملاً للذكاء الصناعي. سيقوم المساعد بتحليل مزادك كل 5 دقائق وإرسال توصيات ذكية لتحسين الأداء.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/80 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">🎯</span>
                <span className="font-bold text-gray-900">تحليل فوري</span>
              </div>
              <p className="text-sm text-gray-700">تحليل شامل للتفاعل والأداء</p>
            </div>
            <div className="bg-white/80 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">💡</span>
                <span className="font-bold text-gray-900">اقتراحات ذكية</span>
              </div>
              <p className="text-sm text-gray-700">توصيات مخصصة لزيادة المبيعات</p>
            </div>
            <div className="bg-white/80 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">📈</span>
                <span className="font-bold text-gray-900">توقع الأسعار</span>
              </div>
              <p className="text-sm text-gray-700">توقع السعر النهائي بدقة عالية</p>
            </div>
            <div className="bg-white/80 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">🔔</span>
                <span className="font-bold text-gray-900">تنبيهات ذكية</span>
              </div>
              <p className="text-sm text-gray-700">إشعارات فورية عند الحاجة</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
