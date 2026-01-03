import { CheckCircle, X, Phone, TreePine, Calendar, DollarSign } from 'lucide-react';

interface BookingSuccessModalProps {
  onClose: () => void;
  bookingDetails: {
    numberOfTrees: number;
    totalAmount: number;
    phoneNumber: string;
    opportunityTitle: string;
    duration: number;
  };
}

export function BookingSuccessModal({ onClose, bookingDetails }: BookingSuccessModalProps) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full relative animate-in fade-in zoom-in duration-300 my-8">
        <button
          onClick={onClose}
          className="absolute top-4 left-4 z-10 bg-gray-100 hover:bg-gray-200 rounded-full p-2 transition-colors"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>

        <div className="p-6 sm:p-8 text-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full mx-auto mb-4 sm:mb-6 flex items-center justify-center shadow-2xl animate-bounce">
            <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 sm:mb-3">
            تم استلام طلبك بنجاح!
          </h2>

          <p className="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8 leading-relaxed">
            شكراً لك على اهتمامك بالاستثمار معنا. سنتواصل معك قريباً لتأكيد الحجز.
          </p>

          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4 sm:p-6 space-y-3 sm:space-y-4 mb-4 sm:mb-6">
            <h3 className="font-bold text-gray-900 mb-3 sm:mb-4 text-base sm:text-lg">تفاصيل الحجز</h3>

            <div className="flex items-center justify-between bg-white/60 rounded-lg p-2.5 sm:p-3">
              <span className="text-sm sm:text-base text-gray-600 flex items-center gap-2">
                <TreePine className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                عدد الأشجار
              </span>
              <span className="text-sm sm:text-base font-bold text-gray-900">{bookingDetails.numberOfTrees} شجرة</span>
            </div>

            <div className="flex items-center justify-between bg-white/60 rounded-lg p-2.5 sm:p-3">
              <span className="text-sm sm:text-base text-gray-600 flex items-center gap-2">
                <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                المبلغ الإجمالي
              </span>
              <span className="text-sm sm:text-base font-bold text-gray-900">{bookingDetails.totalAmount.toLocaleString()} ريال</span>
            </div>

            <div className="flex items-center justify-between bg-white/60 rounded-lg p-2.5 sm:p-3">
              <span className="text-sm sm:text-base text-gray-600 flex items-center gap-2">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                مدة الاستثمار
              </span>
              <span className="text-sm sm:text-base font-bold text-gray-900">{bookingDetails.duration} شهر</span>
            </div>

            <div className="flex items-center justify-between bg-white/60 rounded-lg p-2.5 sm:p-3">
              <span className="text-sm sm:text-base text-gray-600 flex items-center gap-2">
                <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                رقم التواصل
              </span>
              <span className="text-sm sm:text-base font-bold text-gray-900" dir="ltr">{bookingDetails.phoneNumber}</span>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
            <p className="text-xs sm:text-sm text-blue-800 leading-relaxed">
              سيتم التواصل معك خلال 24 ساعة لتأكيد الحجز وترتيب خطوات الدفع والتعاقد
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white py-3.5 sm:py-4 rounded-xl font-bold text-base sm:text-lg hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl active:scale-95"
          >
            تم، استلمت التفاصيل
          </button>
        </div>
      </div>
    </div>
  );
}
