import { LucideIcon } from 'lucide-react';

interface Props {
  icon: LucideIcon;
  label: string;
  count: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  onClick: () => void;
}

export default function DecisionIndicator({ icon: Icon, label, count, severity, onClick }: Props) {
  const severityConfig = {
    low: {
      bgColor: 'from-gray-50 to-slate-50',
      borderColor: 'border-gray-300',
      iconBg: 'bg-gray-500',
      textColor: 'text-gray-900',
      countColor: 'text-gray-700',
      badge: 'bg-gray-200 text-gray-700',
      badgeText: 'مستقر'
    },
    medium: {
      bgColor: 'from-blue-50 to-sky-50',
      borderColor: 'border-blue-300',
      iconBg: 'bg-blue-500',
      textColor: 'text-blue-900',
      countColor: 'text-blue-700',
      badge: 'bg-blue-200 text-blue-800',
      badgeText: 'متابعة'
    },
    high: {
      bgColor: 'from-amber-50 to-orange-50',
      borderColor: 'border-amber-300',
      iconBg: 'bg-amber-500',
      textColor: 'text-amber-900',
      countColor: 'text-amber-700',
      badge: 'bg-amber-200 text-amber-800',
      badgeText: 'انتباه'
    },
    critical: {
      bgColor: 'from-red-50 to-rose-50',
      borderColor: 'border-red-400',
      iconBg: 'bg-red-600',
      textColor: 'text-red-900',
      countColor: 'text-red-700',
      badge: 'bg-red-200 text-red-800',
      badgeText: 'تدخل فوري'
    }
  };

  const config = severityConfig[severity];

  return (
    <button
      onClick={onClick}
      className={`relative bg-gradient-to-br ${config.bgColor} border-2 ${config.borderColor} rounded-xl p-6 text-right hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 w-full group`}
    >
      {/* شارة الحالة */}
      {severity !== 'low' && (
        <div className={`absolute top-4 left-4 px-2 py-1 rounded-full text-xs font-bold ${config.badge}`}>
          {config.badgeText}
        </div>
      )}

      {/* الأيقونة والعدد */}
      <div className="flex items-start gap-4 mb-4">
        <div className={`w-14 h-14 ${config.iconBg} rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-200`}>
          <Icon className="w-7 h-7 text-white" />
        </div>

        <div className={`text-4xl font-bold ${config.countColor}`}>
          {count}
        </div>
      </div>

      {/* التسمية */}
      <h3 className={`text-base font-bold ${config.textColor} mb-2`}>
        {label}
      </h3>

      {/* زر العرض */}
      <div className={`text-sm font-semibold ${config.textColor} opacity-70 group-hover:opacity-100 transition-opacity`}>
        عرض القائمة ←
      </div>
    </button>
  );
}
