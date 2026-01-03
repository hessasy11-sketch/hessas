import { Sprout, Award, TreePine } from 'lucide-react';

interface InvestorIdentityCardProps {
  investorName: string;
  classification: string;
  totalTrees: number;
  currentStage: string;
}

export function InvestorIdentityCard({
  investorName,
  classification,
  totalTrees,
  currentStage
}: InvestorIdentityCardProps) {
  // تحديد الأيقونة والألوان بناءً على التصنيف
  const getClassificationStyle = (classif: string) => {
    switch (classif) {
      case 'غرسة':
        return {
          gradient: 'from-green-400 to-emerald-500',
          icon: <Sprout className="w-6 h-6 text-white" />,
          badge: 'bg-green-500/20 text-green-700 border-green-500/30'
        };
      case 'حديقة':
        return {
          gradient: 'from-emerald-400 to-teal-500',
          icon: <TreePine className="w-6 h-6 text-white" />,
          badge: 'bg-emerald-500/20 text-emerald-700 border-emerald-500/30'
        };
      case 'بستان':
        return {
          gradient: 'from-teal-400 to-cyan-500',
          icon: <TreePine className="w-7 h-7 text-white" />,
          badge: 'bg-teal-500/20 text-teal-700 border-teal-500/30'
        };
      case 'مزرعة صغيرة':
        return {
          gradient: 'from-cyan-400 to-blue-500',
          icon: <Award className="w-7 h-7 text-white" />,
          badge: 'bg-cyan-500/20 text-cyan-700 border-cyan-500/30'
        };
      case 'مزرعة تشغيلية':
        return {
          gradient: 'from-blue-400 to-indigo-500',
          icon: <Award className="w-8 h-8 text-white" />,
          badge: 'bg-blue-500/20 text-blue-700 border-blue-500/30'
        };
      case 'مزرعة استثمارية':
        return {
          gradient: 'from-amber-400 to-orange-500',
          icon: <Award className="w-8 h-8 text-white" />,
          badge: 'bg-amber-500/20 text-amber-700 border-amber-500/30'
        };
      default:
        return {
          gradient: 'from-gray-400 to-gray-500',
          icon: <Sprout className="w-6 h-6 text-white" />,
          badge: 'bg-gray-500/20 text-gray-700 border-gray-500/30'
        };
    }
  };

  const style = getClassificationStyle(classification);

  // رسالة حسب المرحلة
  const getStageMessage = (stage: string) => {
    switch (stage) {
      case 'حجز':
        return 'طلبك قيد المعالجة';
      case 'دفع':
        return 'في انتظار مراجعة الدفع';
      case 'عقد':
        return 'العقد جاهز للاطلاع';
      case 'تشغيل':
        return 'استثمارك في مرحلة النمو';
      case 'حصاد':
        return 'موسم الحصاد المبارك';
      case 'خدمة':
        return 'جاهزون لخدمتك';
      default:
        return 'مرحباً بك';
    }
  };

  return (
    <div className="relative overflow-hidden">
      {/* خلفية متدرجة */}
      <div className={`bg-gradient-to-br ${style.gradient} rounded-xl p-3 shadow-md`}>
        <div className="relative">
          {/* الصف الأول: الأيقونة والاسم */}
          <div className="flex items-center gap-2 mb-2">
            {/* أيقونة التصنيف */}
            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center border border-white/30">
              <div className="scale-75">
                {style.icon}
              </div>
            </div>

            {/* اسم المستثمر */}
            <div className="flex-1 min-w-0">
              <p className="text-[9px] text-white/80 font-semibold">
                مستثمر
              </p>
              <h3 className="text-sm font-black text-white truncate">
                {investorName}
              </h3>
            </div>
          </div>

          {/* الصف الثاني: التصنيف وعدد الأشجار */}
          <div className="grid grid-cols-2 gap-1.5">
            {/* التصنيف */}
            <div className={`${style.badge} rounded-lg px-2 py-1.5 border backdrop-blur-sm`}>
              <p className="text-[8px] font-semibold opacity-70">
                التصنيف
              </p>
              <p className="text-[11px] font-black leading-tight">
                {classification}
              </p>
            </div>

            {/* عدد الأشجار */}
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-2 py-1.5 border border-white/30">
              <p className="text-[8px] text-white/80 font-semibold">
                الأشجار
              </p>
              <p className="text-[11px] font-black text-white leading-tight">
                {totalTrees.toLocaleString('ar-SA')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
