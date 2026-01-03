import { Check, Circle } from 'lucide-react';

interface JourneyProgressBarProps {
  status: string;
  contractNumber?: string;
  operationalStatus?: string;
}

export function JourneyProgressBar({ status, contractNumber, operationalStatus }: JourneyProgressBarProps) {
  // تحديد المراحل بالترتيب
  const stages = [
    { id: 'booking', label: 'حجز', icon: '📋', description: 'تم حجز الأشجار' },
    { id: 'payment', label: 'دفع', icon: '💳', description: 'تم اعتماد الدفع' },
    { id: 'contract', label: 'عقد', icon: '📄', description: 'تم إصدار العقد' },
    { id: 'operations', label: 'تشغيل', icon: '🌱', description: 'جاري تشغيل المزرعة' },
    { id: 'harvest', label: 'حصاد', icon: '🌾', description: 'موسم الحصاد' },
    { id: 'service', label: 'خدمة', icon: '🤝', description: 'خدمة مستمرة' }
  ];

  // تحديد رقم المرحلة الحالية بناءً على الحالة الفعلية
  const getCurrentStageIndex = () => {
    // ربط حالات النظام بالمراحل
    switch (status) {
      case 'pending':
      case 'payment_open':
        return 0; // مرحلة الحجز
      case 'receipt_uploaded':
      case 'receipt_under_review':
        return 0; // لا يزال في مرحلة الحجز حتى يتم اعتماد الدفع
      case 'receipt_approved':
      case 'approved_pending_payment':
        return 1; // مرحلة الدفع (تم اعتماد الدفع)
      case 'contract_issued':
        return 2; // مرحلة العقد
      case 'transferred_to_operations':
        // التحقق من حالة التشغيل
        if (operationalStatus === 'in_harvest') return 4; // مرحلة الحصاد
        if (operationalStatus === 'completed') return 5; // مرحلة الخدمة
        return 3; // مرحلة التشغيل
      default:
        return 0;
    }
  };

  const currentIndex = getCurrentStageIndex();

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200">
      {/* العنوان */}
      <div className="mb-4">
        <h4 className="text-sm font-black text-gray-900 mb-1">
          مسار الاستثمار
        </h4>
        <p className="text-xs text-gray-500">
          تتبع تقدم استثمارك خطوة بخطوة
        </p>
      </div>

      {/* شريط التقدم */}
      <div className="relative">
        {/* الخط الأساسي */}
        <div className="absolute top-5 right-0 left-0 h-0.5 bg-gray-200" />

        {/* الخط المكتمل */}
        <div
          className="absolute top-5 right-0 h-0.5 bg-gradient-to-l from-emerald-500 to-green-500 transition-all duration-1000 ease-out"
          style={{
            width: `${(currentIndex / (stages.length - 1)) * 100}%`
          }}
        />

        {/* المراحل */}
        <div className="relative flex justify-between">
          {stages.map((stage, index) => {
            const isCompleted = index < currentIndex;
            const isCurrent = index === currentIndex;
            const isPending = index > currentIndex;

            return (
              <div
                key={stage.id}
                className="flex flex-col items-center gap-2 transition-all duration-500"
              >
                {/* الدائرة */}
                <div
                  className={`
                    relative w-10 h-10 rounded-full flex items-center justify-center
                    transition-all duration-500 border-2
                    ${isCompleted
                      ? 'bg-gradient-to-br from-emerald-500 to-green-600 border-emerald-500 scale-105'
                      : isCurrent
                      ? 'bg-white border-emerald-500 ring-4 ring-emerald-100 scale-110 animate-pulse'
                      : 'bg-gray-100 border-gray-300'
                    }
                  `}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5 text-white" strokeWidth={3} />
                  ) : isCurrent ? (
                    <Circle className="w-4 h-4 text-emerald-500 fill-emerald-500" />
                  ) : (
                    <span className="text-lg">{stage.icon}</span>
                  )}

                  {/* نقطة متحركة للمرحلة الحالية */}
                  {isCurrent && (
                    <div className="absolute inset-0 rounded-full border-2 border-emerald-400 animate-ping" />
                  )}
                </div>

                {/* النص */}
                <div className="text-center">
                  <p
                    className={`
                      text-[10px] font-bold transition-all duration-300
                      ${isCompleted
                        ? 'text-emerald-600'
                        : isCurrent
                        ? 'text-emerald-600 scale-105'
                        : 'text-gray-400'
                      }
                    `}
                  >
                    {stage.label}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* رسالة تشجيعية */}
      <div className="mt-4 p-3 bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl border border-emerald-100">
        <p className="text-xs text-emerald-900 font-semibold text-center">
          {currentIndex === 0 && '🌱 بداية موفقة في رحلة الاستثمار'}
          {currentIndex === 1 && '💚 تم اعتماد دفعك بنجاح - جاري إصدار عقدك'}
          {currentIndex === 2 && contractNumber ? `✨ عقدك جاهز (${contractNumber}) - قريباً التشغيل` : '✨ تقدم رائع، استثمارك في أمان'}
          {currentIndex === 3 && '🌿 أشجارك الآن قيد التشغيل والعناية'}
          {currentIndex === 4 && '🌾 موسم الحصاد المبارك قد بدأ'}
          {currentIndex === 5 && '🤝 دائماً في خدمتكم'}
        </p>
        {currentIndex >= 2 && contractNumber && (
          <p className="text-xs text-emerald-700 font-bold text-center mt-2">
            رقم العقد: {contractNumber}
          </p>
        )}
      </div>
    </div>
  );
}
