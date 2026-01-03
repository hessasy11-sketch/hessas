import { X, Download, CheckCircle2, FileText } from 'lucide-react';
import { useEffect, useState } from 'react';

interface TreeLeaseAgreementProps {
  bookingData: {
    customer_name: string;
    customer_phone: string;
    number_of_trees: number;
    total_amount: number;
    opportunity_title: string;
    farm_name: string;
    city_name: string;
    duration_months: number;
    tree_types: string[];
    price_per_tree: number;
    booking_date: string;
    booking_id: string;
  };
  onClose: () => void;
}

export function TreeLeaseAgreement({ bookingData, onClose }: TreeLeaseAgreementProps) {
  const [currentDate] = useState(new Date().toLocaleDateString('ar-SA'));

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 overflow-y-auto" dir="rtl">
      <div className="min-h-screen p-4 flex items-start justify-center py-8">
        <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full">
          {/* Header - Not printed */}
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6 rounded-t-2xl print:hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8 text-white" />
                <div>
                  <h2 className="text-2xl font-bold text-white">عقد استئجار أشجار</h2>
                  <p className="text-green-100 text-sm">منصة حصص زراعية</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-white font-semibold flex items-center gap-2 transition-colors"
                >
                  <Download className="w-5 h-5" />
                  طباعة / حفظ PDF
                </button>
                <button
                  onClick={onClose}
                  className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
          </div>

          {/* Agreement Content - Printable */}
          <div className="p-8 space-y-6 print:p-12">
            {/* Logo & Header */}
            <div className="text-center border-b-2 border-green-600 pb-6">
              <div className="text-5xl mb-3">🌳</div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">عقد استئجار أشجار زراعية</h1>
              <p className="text-lg text-green-700 font-semibold">منصة حصص زراعية</p>
              <p className="text-sm text-gray-600 mt-2">رقم العقد: {bookingData.booking_id}</p>
            </div>

            {/* Agreement Date */}
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-center text-gray-800">
                تحرر هذا العقد بتاريخ: <span className="font-bold">{currentDate}</span>
              </p>
            </div>

            {/* Parties */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900 border-r-4 border-green-600 pr-3">
                أطراف العقد
              </h2>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-bold text-gray-800 mb-2">الطرف الأول (المؤجر):</h3>
                  <p className="text-gray-700">منصة حصص زراعية</p>
                  <p className="text-sm text-gray-600">المنصة الإلكترونية للاستثمار الزراعي</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-bold text-gray-800 mb-2">الطرف الثاني (المستأجر):</h3>
                  <p className="text-gray-700 font-semibold">{bookingData.customer_name}</p>
                  <p className="text-sm text-gray-600">رقم الجوال: {bookingData.customer_phone}</p>
                </div>
              </div>
            </div>

            {/* Subject */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900 border-r-4 border-green-600 pr-3">
                موضوع العقد
              </h2>

              <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-lg border-2 border-green-200">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">الفرصة الاستثمارية</p>
                    <p className="font-bold text-gray-900">{bookingData.opportunity_title}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">موقع المزرعة</p>
                    <p className="font-bold text-gray-900">{bookingData.farm_name} - {bookingData.city_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">نوع الأشجار</p>
                    <p className="font-bold text-gray-900">{bookingData.tree_types.join(', ')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">عدد الأشجار</p>
                    <p className="font-bold text-green-700 text-xl">{bookingData.number_of_trees} شجرة</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">سعر الشجرة الواحدة</p>
                    <p className="font-bold text-gray-900">{bookingData.price_per_tree.toLocaleString('ar-SA')} ريال</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">المدة</p>
                    <p className="font-bold text-gray-900">{bookingData.duration_months} شهر</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Details */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900 border-r-4 border-green-600 pr-3">
                القيمة المالية
              </h2>

              <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6 rounded-lg text-white">
                <div className="flex justify-between items-center">
                  <span className="text-lg">إجمالي قيمة العقد:</span>
                  <span className="text-3xl font-bold">{bookingData.total_amount.toLocaleString('ar-SA')} ريال</span>
                </div>
              </div>
            </div>

            {/* Terms & Conditions */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900 border-r-4 border-green-600 pr-3">
                شروط وأحكام العقد
              </h2>

              <div className="space-y-3">
                <div className="flex items-start gap-3 bg-gray-50 p-4 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                  <p className="text-gray-700 leading-relaxed">
                    <span className="font-bold">إدارة وصيانة الأشجار:</span> تتكفل منصة حصص زراعية بالإشراف الكامل على الأشجار المستأجرة، بما يشمل الري والتسميد والعناية والصيانة الدورية.
                  </p>
                </div>

                <div className="flex items-start gap-3 bg-gray-50 p-4 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                  <p className="text-gray-700 leading-relaxed">
                    <span className="font-bold">مدة العقد:</span> يبدأ العقد من تاريخ التوقيع ويستمر لمدة {bookingData.duration_months} شهر، ويجدد تلقائياً ما لم يخطر أحد الطرفين برغبته في عدم التجديد قبل شهر من انتهاء المدة.
                  </p>
                </div>

                <div className="flex items-start gap-3 bg-gray-50 p-4 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                  <p className="text-gray-700 leading-relaxed">
                    <span className="font-bold">توزيع المحصول:</span> يحق للمستأجر الحصول على نصيبه من محصول الأشجار المستأجرة حسب الاتفاق، ويتم التوزيع بعد موسم الحصاد مباشرة.
                  </p>
                </div>

                <div className="flex items-start gap-3 bg-gray-50 p-4 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                  <p className="text-gray-700 leading-relaxed">
                    <span className="font-bold">التقارير والمتابعة:</span> تلتزم المنصة بإرسال تقارير دورية مصورة عن حالة الأشجار ومراحل نموها وموسم الحصاد عبر لوحة التحكم الإلكترونية.
                  </p>
                </div>

                <div className="flex items-start gap-3 bg-gray-50 p-4 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                  <p className="text-gray-700 leading-relaxed">
                    <span className="font-bold">الدفع:</span> تم سداد كامل قيمة العقد مقدماً بمبلغ {bookingData.total_amount.toLocaleString('ar-SA')} ريال سعودي.
                  </p>
                </div>

                <div className="flex items-start gap-3 bg-gray-50 p-4 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                  <p className="text-gray-700 leading-relaxed">
                    <span className="font-bold">الظروف الطارئة:</span> في حالة حدوث ظروف قاهرة تؤثر على الإنتاج (كوارث طبيعية، أمراض نباتية)، يتم التعامل معها وفق الأعراف الزراعية المتبعة والنظام السعودي.
                  </p>
                </div>

                <div className="flex items-start gap-3 bg-gray-50 p-4 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                  <p className="text-gray-700 leading-relaxed">
                    <span className="font-bold">فسخ العقد:</span> لا يجوز فسخ العقد إلا باتفاق الطرفين أو في حالة الإخلال الجوهري بأحد بنود العقد.
                  </p>
                </div>
              </div>
            </div>

            {/* Acceptance */}
            <div className="space-y-4 border-t-2 border-gray-200 pt-6">
              <div className="bg-green-50 p-6 rounded-lg border-2 border-green-200">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-bold text-gray-900 mb-2">إقرار وموافقة</p>
                    <p className="text-gray-700 leading-relaxed">
                      بقبولي لهذا العقد، أقر أنا <span className="font-bold">{bookingData.customer_name}</span> بأنني اطلعت على جميع بنود وشروط هذا العقد،
                      وأوافق عليها بشكل كامل، وأتعهد بالالتزام بها. كما أقر بصحة جميع البيانات المقدمة.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Signatures */}
            <div className="grid md:grid-cols-2 gap-8 pt-8 print:pt-16">
              <div className="text-center">
                <div className="border-t-2 border-gray-400 pt-2">
                  <p className="font-bold text-gray-900">الطرف الأول</p>
                  <p className="text-gray-600 text-sm">منصة حصص زراعية</p>
                </div>
              </div>
              <div className="text-center">
                <div className="border-t-2 border-gray-400 pt-2">
                  <p className="font-bold text-gray-900">الطرف الثاني</p>
                  <p className="text-gray-600 text-sm">{bookingData.customer_name}</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center pt-8 border-t border-gray-200 print:pt-16">
              <p className="text-gray-600 text-sm">
                هذا العقد محرر إلكترونياً عبر منصة حصص زراعية
              </p>
              <p className="text-gray-500 text-xs mt-1">
                رقم العقد: {bookingData.booking_id} | تاريخ الإنشاء: {currentDate}
              </p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .fixed > div > div:last-child,
          .fixed > div > div:last-child * {
            visibility: visible;
          }
          .fixed > div > div:last-child {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            box-shadow: none;
            border-radius: 0;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
