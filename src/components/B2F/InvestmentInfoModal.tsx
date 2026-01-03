import { X, Sparkles, CheckCircle2, Heart } from 'lucide-react';

interface InvestmentInfoModalProps {
  onClose: () => void;
}

export default function InvestmentInfoModal({ onClose }: InvestmentInfoModalProps) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-gradient-to-br from-green-50 via-white to-emerald-50 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundImage: `
            radial-gradient(circle at 20% 30%, rgba(34, 197, 94, 0.08) 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, rgba(16, 185, 129, 0.08) 0%, transparent 50%)
          `
        }}
      >
        {/* الهيدر */}
        <div className="sticky top-0 bg-gradient-to-r from-green-600 to-emerald-600 p-6 rounded-t-2xl border-b-4 border-green-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/25 p-3 rounded-xl backdrop-blur-sm">
                <span className="text-3xl">🌱</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  استثمار بسيط.. أثره كبير
                  <Sparkles className="w-5 h-5 text-yellow-300" />
                </h2>
                <p className="text-green-100 text-sm mt-1">طريقك للاستثمار الزراعي الآمن</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* المحتوى */}
        <div className="p-6 space-y-6">
          {/* الشرح التسويقي */}
          <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl border-2 border-green-200 shadow-sm">
            <p className="text-gray-800 leading-relaxed text-base">
              مع <span className="font-bold text-green-700">منصة حصص زراعية</span>، يمكنك استثمار جزء من الأشجار المثمرة في موقعها الفعلي داخل المزارع،
              وتستفيد من مواسم الإنتاج تحت إدارة كاملة من المنصة – <span className="font-bold">بدون تعقيد</span>،
              <span className="font-bold"> بدون إدارة ميدانية</span>، <span className="font-bold">وبدون خبرة سابقة</span>.
            </p>
          </div>

          {/* لماذا هذه التجربة مختلفة؟ */}
          <div>
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-green-600" />
              لماذا هذه التجربة مختلفة؟
            </h3>
            <div className="space-y-3">
              <div className="bg-white/80 backdrop-blur-sm border-2 border-green-200 rounded-xl p-4 hover:border-green-400 transition-all hover:shadow-md">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                  <div>
                    <p className="text-gray-800 leading-relaxed">
                      <span className="font-bold text-gray-900">لا زيارات ميدانية ولا متابعة تشغيلية</span> – المنصة تدير كل شيء عنك
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-sm border-2 border-green-200 rounded-xl p-4 hover:border-green-400 transition-all hover:shadow-md">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                  <div>
                    <p className="text-gray-800 leading-relaxed">
                      <span className="font-bold text-gray-900">عقد سنوي واضح</span> + لوحة تحكم لرحلة الشجرة خطوة بخطوة
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-sm border-2 border-green-200 rounded-xl p-4 hover:border-green-400 transition-all hover:shadow-md">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                  <div>
                    <p className="text-gray-800 leading-relaxed">
                      <span className="font-bold text-gray-900">تقارير وصور تحديثات</span> وموسم حصاد موثّق
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-sm border-2 border-green-200 rounded-xl p-4 hover:border-green-400 transition-all hover:shadow-md">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                  <div>
                    <p className="text-gray-800 leading-relaxed">
                      <span className="font-bold text-gray-900">فرصة استثمارية صغيرة</span> تبدأ بمبلغ بسيط وتنمو معك
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* رسالة طمأنة */}
          <div className="bg-gradient-to-br from-green-100 to-emerald-100 border-2 border-green-300 rounded-xl p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="bg-green-500 text-white rounded-full p-2 flex-shrink-0">
                <Heart className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-green-900 mb-2 text-lg">أنت مع المنصة مباشرة</h4>
                <p className="text-green-800 leading-relaxed">
                  لسنا مجرد وسيط، نحن جهة <span className="font-bold">التشغيل والإدارة والمتابعة</span>.
                  ثقتك معنا محفوظة بعقود واضحة وشفافية كاملة.
                </p>
              </div>
            </div>
          </div>

          {/* زر CTA */}
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-5 rounded-xl transition-all transform hover:scale-[1.02] shadow-xl flex items-center justify-center gap-2 text-lg"
          >
            <span className="text-2xl">🌴</span>
            <span>ابدأ رحلة استثمارك الآن</span>
          </button>
        </div>
      </div>
    </div>
  );
}
