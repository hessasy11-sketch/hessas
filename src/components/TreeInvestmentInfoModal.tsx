import { X, BookOpen, CheckCircle, Clock, TrendingUp } from 'lucide-react';

interface TreeInvestmentInfoModalProps {
  onClose: () => void;
  onViewOpportunities: () => void;
  onViewFullDetails: () => void;
}

export function TreeInvestmentInfoModal({
  onClose,
  onViewOpportunities,
  onViewFullDetails
}: TreeInvestmentInfoModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-green-600 to-emerald-600 text-white p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">استثمر في الأشجار بخطوات بسيطة</h2>
                <p className="text-sm text-green-100 mt-1">دليلك السريع للبدء</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 flex items-center justify-center transition-all"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
            <p className="text-gray-700 leading-relaxed text-center">
              هذه المساحة مخصصة لمساعدتك على فهم فكرة استثمار الأشجار،
              وكيف تبدأ بخطوات صغيرة وتجربة آمنة داخل المنصة.
            </p>
          </div>

          <div className="space-y-4">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-5 hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-14 h-14 bg-green-600 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-green-900 mb-2">
                    استثمار بسيط يناسب الجميع
                  </h3>
                  <p className="text-gray-700 leading-relaxed">
                    يمكنك استئجار أشجار منتجة لفترة محددة، والمتابعة بالكامل من داخل حسابك في المنصة،
                    بدون تعقيد إداري أو إجراءات معقدة.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl p-5 hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center">
                  <Clock className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-blue-900 mb-2">
                    من الحجز حتى التفعيل
                  </h3>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold mt-1">•</span>
                      <span>تختار فرصة استئجار مناسبة لك.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold mt-1">•</span>
                      <span>تقوم بحجز مبدئي بدون أي دفع.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold mt-1">•</span>
                      <span>إذا تم قبول الحجز يتم إشعارك قبل التفعيل.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold mt-1">•</span>
                      <span>بعد الموافقة، تكمل خطوات التفعيل من داخل المنصة.</span>
                    </li>
                    <li className="flex items-start gap-2 bg-yellow-50 border border-yellow-300 rounded-lg p-2 -mr-2 -ml-2">
                      <span className="text-yellow-600 font-bold mt-1">⚠️</span>
                      <span className="font-medium text-yellow-900">لا يوجد أي التزام مالي قبل مرحلة الموافقة والتأكيد.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-yellow-50 to-amber-50 border-2 border-yellow-300 rounded-xl p-5 hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-14 h-14 bg-yellow-600 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-yellow-900 mb-2">
                    مناسب لمن يستثمر لأول مرة
                  </h3>
                  <p className="text-gray-700 leading-relaxed">
                    هذا القسم مصمم ليستقبل المستثمر الصغير قبل الكبير؛
                    تقدر تبدأ بمبالغ بسيطة، تتعرف على التجربة،
                    وتتعوّد على متابعة استثمارك من جوالك خطوة بخطوة.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t-2 border-gray-200 pt-6 mt-6 space-y-3">
            <button
              onClick={onViewOpportunities}
              className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold text-lg hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-6 h-6" />
              فهمت الفكرة، استعرض الفرص
            </button>

            <button
              onClick={onViewFullDetails}
              className="w-full py-3 text-green-700 hover:text-green-800 font-medium text-sm hover:bg-green-50 rounded-lg transition-all"
            >
              أرغب بقراءة التفاصيل الكاملة
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
