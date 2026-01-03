import { X, Shield, FileText, Lock, AlertCircle, CheckCircle } from 'lucide-react';

interface TermsAndConditionsModalProps {
  onClose: () => void;
}

export function TermsAndConditionsModal({ onClose }: TermsAndConditionsModalProps) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-white" />
            <h2 className="text-xl font-bold text-white">الشروط والأحكام وسياسة الخصوصية</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* الشروط والأحكام */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b-2 border-green-600">
              <FileText className="w-6 h-6 text-green-600" />
              <h3 className="text-2xl font-bold text-gray-900">الشروط والأحكام</h3>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                <p className="text-sm text-green-900 leading-relaxed">
                  يرجى قراءة الشروط والأحكام بعناية قبل استخدام منصة حصص زراعية
                </p>
              </div>
            </div>

            <div className="space-y-4 text-gray-700">
              <div className="bg-white border-2 border-gray-200 rounded-xl p-5">
                <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  1. طبيعة المنصة
                </h4>
                <p className="leading-relaxed">
                  منصة حصص زراعية هي وسيط إداري وخدمي يربط المستثمرين بالفرص الزراعية المتاحة.
                  <span className="font-bold text-red-600"> المنصة ليست ضامناً للأرباح</span> وتعتمد النتائج على عوامل زراعية وطبيعية متعددة.
                </p>
              </div>

              <div className="bg-white border-2 border-gray-200 rounded-xl p-5">
                <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  2. صحة البيانات
                </h4>
                <p className="leading-relaxed">
                  يلتزم المستخدم بتقديم بيانات صحيحة ودقيقة عند التسجيل.
                  <span className="font-bold"> صحة البيانات شرط أساسي</span> لاستخدام خدمات المنصة وإتمام أي معاملات.
                </p>
              </div>

              <div className="bg-white border-2 border-gray-200 rounded-xl p-5">
                <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  3. تأكيد الطلبات والدفع
                </h4>
                <p className="leading-relaxed">
                  <span className="font-bold">لا يتم تأكيد أي طلب استثمار إلا بعد الموافقة الكاملة والدفع المؤكد.</span>
                  جميع الطلبات تخضع لمراجعة المنصة قبل التفعيل النهائي.
                </p>
              </div>

              <div className="bg-white border-2 border-gray-200 rounded-xl p-5">
                <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  4. إيقاف الحسابات المخالفة
                </h4>
                <p className="leading-relaxed">
                  يحق للمنصة إيقاف أو تعليق أي حساب مسيء أو مخالف للسياسات،
                  بما في ذلك الحسابات التي تستخدم بيانات غير صحيحة أو تمارس أنشطة مشبوهة.
                </p>
              </div>

              <div className="bg-white border-2 border-gray-200 rounded-xl p-5">
                <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  5. موقع الأشجار والتفاصيل الدقيقة
                </h4>
                <p className="leading-relaxed">
                  <span className="font-bold">لا يتم تحديد مواقع دقيقة للأشجار المستأجرة قبل التعاقد الرسمي.</span>
                  سيتم مشاركة التفاصيل الكاملة مع المستثمر بعد إتمام عملية الحجز والدفع.
                </p>
              </div>

              <div className="bg-white border-2 border-gray-200 rounded-xl p-5">
                <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  6. الإقرارات المالية والعوائد
                </h4>
                <p className="leading-relaxed">
                  جميع الإقرارات المالية والعوائد المتوقعة خاضعة لإشعار رسمي داخل المنصة.
                  تعتمد العوائد على الإنتاج الفعلي وظروف السوق.
                </p>
              </div>

              <div className="bg-white border-2 border-gray-200 rounded-xl p-5">
                <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  7. المسؤولية والضمانات
                </h4>
                <p className="leading-relaxed">
                  المنصة تبذل قصارى جهدها لتوفير خدمة ممتازة ومتابعة دقيقة،
                  لكنها غير مسؤولة عن أي خسائر ناتجة عن ظروف طبيعية أو قوة قاهرة خارجة عن السيطرة.
                </p>
              </div>
            </div>
          </section>

          {/* سياسة الخصوصية */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b-2 border-blue-600">
              <Lock className="w-6 h-6 text-blue-600" />
              <h3 className="text-2xl font-bold text-gray-900">سياسة الخصوصية</h3>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-1" />
                <p className="text-sm text-blue-900 leading-relaxed">
                  نحن نحترم خصوصيتك ونلتزم بحماية بياناتك الشخصية
                </p>
              </div>
            </div>

            <div className="space-y-4 text-gray-700">
              <div className="bg-white border-2 border-gray-200 rounded-xl p-5">
                <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                  1. جمع البيانات
                </h4>
                <p className="leading-relaxed">
                  نقوم بجمع المعلومات الضرورية فقط لتقديم الخدمة،
                  بما في ذلك الاسم ورقم الجوال والموقع والبيانات المالية للمعاملات.
                </p>
              </div>

              <div className="bg-white border-2 border-gray-200 rounded-xl p-5">
                <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                  2. حماية البيانات
                </h4>
                <p className="leading-relaxed">
                  نستخدم أفضل معايير الأمان والتشفير لحماية بياناتك.
                  <span className="font-bold"> لا نشارك بياناتك مع أطراف ثالثة دون إذن صريح منك.</span>
                </p>
              </div>

              <div className="bg-white border-2 border-gray-200 rounded-xl p-5">
                <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                  3. استخدام البيانات
                </h4>
                <p className="leading-relaxed">
                  نستخدم بياناتك فقط لتوفير الخدمة وتحسين التجربة وإرسال إشعارات مهمة متعلقة باستثماراتك.
                </p>
              </div>

              <div className="bg-white border-2 border-gray-200 rounded-xl p-5">
                <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                  4. حقوقك
                </h4>
                <ul className="space-y-2 list-disc list-inside">
                  <li>حق الوصول إلى بياناتك ومراجعتها</li>
                  <li>حق تعديل أو تحديث بياناتك</li>
                  <li>حق طلب حذف حسابك (ما لم يكن مرتبطاً بعقد نافذ)</li>
                  <li>حق الاعتراض على معالجة بياناتك</li>
                </ul>
              </div>

              <div className="bg-white border-2 border-gray-200 rounded-xl p-5">
                <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                  5. الكوكيز وتقنيات التتبع
                </h4>
                <p className="leading-relaxed">
                  نستخدم الكوكيز لتحسين تجربة الاستخدام وحفظ تفضيلاتك.
                  يمكنك التحكم في الكوكيز من إعدادات المتصفح.
                </p>
              </div>

              <div className="bg-white border-2 border-gray-200 rounded-xl p-5">
                <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                  6. الالتزام بأفضل الممارسات
                </h4>
                <p className="leading-relaxed">
                  نلتزم بجميع القوانين واللوائح المحلية والدولية المتعلقة بحماية البيانات والخصوصية،
                  ونحدث سياساتنا باستمرار لضمان أعلى معايير الحماية.
                </p>
              </div>
            </div>
          </section>

          {/* ملاحظة ختامية */}
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl p-6 text-white">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 flex-shrink-0" />
              <div>
                <h4 className="font-bold text-lg mb-2">ملاحظة هامة</h4>
                <p className="leading-relaxed">
                  بالموافقة على هذه الشروط والأحكام وسياسة الخصوصية،
                  فإنك تقر بأنك قرأت وفهمت جميع البنود وتوافق على الالتزام بها.
                  في حال وجود أي استفسار، يمكنك التواصل مع فريق الدعم من خلال المنصة.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4">
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg"
          >
            فهمت، العودة للتسجيل
          </button>
        </div>
      </div>
    </div>
  );
}
