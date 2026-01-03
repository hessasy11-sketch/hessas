import { ArrowRight, Info, TreePine, DollarSign, Calendar, TrendingUp, Shield, CheckCircle } from 'lucide-react';

interface InvestmentInfoProps {
  onBack: () => void;
}

export function InvestmentInfo({ onBack }: InvestmentInfoProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 pb-24 md:pb-8">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-medium mb-6 transition-all group"
        >
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          رجوع
        </button>

        <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-emerald-200 mb-8">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-4 rounded-2xl shadow-lg">
              <Info className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                معلومات الاستثمار
              </h1>
              <p className="text-gray-600 mt-1">دليلك الشامل لآلية استئجار الأشجار</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-emerald-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-gradient-to-br from-emerald-100 to-teal-100 p-3 rounded-xl">
                <TreePine className="w-6 h-6 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800">ما هو استئجار الأشجار؟</h2>
            </div>
            <div className="prose prose-lg max-w-none text-gray-600">
              <p className="leading-relaxed">
                استئجار الأشجار هو نظام استثماري يتيح لك استئجار أشجار منتجة (مثل النخيل، الزيتون، الحمضيات) لفترة محددة والحصول على نصيبك من الإنتاج.
              </p>
              <p className="leading-relaxed mt-4">
                يتولى المزارع رعاية الأشجار بالكامل، وأنت تحصل على حصتك من الثمار عند الحصاد - إما منتجات طازجة أو عائد مالي حسب الاتفاق.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-emerald-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-gradient-to-br from-blue-100 to-cyan-100 p-3 rounded-xl">
                <CheckCircle className="w-6 h-6 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800">خطوات الحجز</h2>
            </div>
            <div className="space-y-4">
              {[
                { number: '1', title: 'تصفح الفرص', desc: 'استعرض فرص استئجار الأشجار المتاحة في مناطق مختلفة' },
                { number: '2', title: 'اختر الفرصة', desc: 'حدد الفرصة المناسبة لك من حيث النوع والموقع والتكلفة' },
                { number: '3', title: 'احجز الآن', desc: 'أكمل بياناتك وحدد عدد الأشجار التي تريد استئجارها' },
                { number: '4', title: 'التأكيد', desc: 'سيتواصل معك المزارع لتأكيد الحجز وترتيب التفاصيل' },
                { number: '5', title: 'المتابعة', desc: 'تابع تقدم حجزك والتحديثات عبر لوحة حجوزاتي' }
              ].map((step) => (
                <div key={step.number} className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all">
                  <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                    {step.number}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 mb-1">{step.title}</h3>
                    <p className="text-gray-600 text-sm">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-emerald-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-gradient-to-br from-green-100 to-emerald-100 p-3 rounded-xl">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-800">المميزات</h2>
              </div>
              <ul className="space-y-3">
                {[
                  'عائد استثماري مجزي',
                  'لا يتطلب خبرة زراعية',
                  'المزارع يتولى كل الرعاية',
                  'منتجات طبيعية وطازجة',
                  'عقود واضحة ومحددة'
                ].map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-emerald-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-gradient-to-br from-yellow-100 to-amber-100 p-3 rounded-xl">
                  <Shield className="w-6 h-6 text-yellow-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-800">نصائح مهمة</h2>
              </div>
              <ul className="space-y-3">
                {[
                  'تأكد من مصداقية المزارع',
                  'اقرأ تفاصيل الفرصة جيداً',
                  'وضح توقعاتك مع المزارع',
                  'احتفظ بنسخة من الاتفاق',
                  'تابع حجزك بانتظام'
                ].map((tip) => (
                  <li key={tip} className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full flex-shrink-0"></div>
                    <span className="text-gray-700">{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-xl p-8 text-white">
            <div className="flex items-start gap-4">
              <TrendingUp className="w-12 h-12 flex-shrink-0" />
              <div>
                <h2 className="text-2xl font-bold mb-3">ابدأ استثمارك الآن</h2>
                <p className="text-emerald-50 leading-relaxed mb-4">
                  استكشف الفرص المتاحة واختر ما يناسبك من فرص استئجار الأشجار. استثمر بذكاء واحصل على عائد مجزي من الزراعة دون الحاجة لخبرة أو جهد.
                </p>
                <div className="flex items-center gap-2 text-emerald-50">
                  <Calendar className="w-5 h-5" />
                  <span className="text-sm">مدة الاستئجار: من موسم واحد إلى عدة سنوات حسب الاتفاق</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
