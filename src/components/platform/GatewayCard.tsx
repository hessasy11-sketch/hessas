import { LucideIcon, CheckCircle, AlertTriangle, AlertCircle, ArrowRight } from 'lucide-react';

interface Props {
  title: string;
  icon: LucideIcon;
  status: 'stable' | 'warning' | 'critical' | 'loading';
  message: string;
  onClick: () => void;
}

export default function GatewayCard({ title, icon: Icon, status, message, onClick }: Props) {
  const statusConfig = {
    stable: {
      gradient: 'from-emerald-500 to-teal-600',
      bgGradient: 'from-emerald-50 to-teal-50',
      borderColor: 'border-emerald-300',
      icon: CheckCircle,
      iconColor: 'text-emerald-600',
      badgeBg: 'bg-emerald-100',
      badgeText: 'text-emerald-800',
      pulse: false
    },
    warning: {
      gradient: 'from-amber-500 to-orange-600',
      bgGradient: 'from-amber-50 to-orange-50',
      borderColor: 'border-amber-300',
      icon: AlertTriangle,
      iconColor: 'text-amber-600',
      badgeBg: 'bg-amber-100',
      badgeText: 'text-amber-800',
      pulse: true
    },
    critical: {
      gradient: 'from-red-500 to-rose-600',
      bgGradient: 'from-red-50 to-rose-50',
      borderColor: 'border-red-400',
      icon: AlertCircle,
      iconColor: 'text-red-600',
      badgeBg: 'bg-red-100',
      badgeText: 'text-red-800',
      pulse: true
    },
    loading: {
      gradient: 'from-gray-400 to-slate-500',
      bgGradient: 'from-gray-50 to-slate-50',
      borderColor: 'border-gray-300',
      icon: CheckCircle,
      iconColor: 'text-gray-400',
      badgeBg: 'bg-gray-100',
      badgeText: 'text-gray-600',
      pulse: false
    }
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  return (
    <button
      onClick={onClick}
      disabled={status === 'loading'}
      className={`group relative bg-gradient-to-br ${config.bgGradient} rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 border-2 ${config.borderColor} overflow-hidden hover:scale-[1.02] active:scale-[0.98] text-right w-full`}
    >
      {/* خلفية متحركة عند التحذير */}
      {config.pulse && (
        <div className={`absolute inset-0 bg-gradient-to-br ${config.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300 animate-pulse`}></div>
      )}

      <div className="relative">
        {/* الأيقونة الرئيسية */}
        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${config.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 mb-5`}>
          <Icon className="w-8 h-8 text-white" />
        </div>

        {/* العنوان */}
        <h3 className="text-xl font-bold text-gray-900 mb-3">
          {title}
        </h3>

        {/* شارة الحالة */}
        <div className={`inline-flex items-center gap-2 ${config.badgeBg} ${config.badgeText} px-4 py-2 rounded-full mb-4`}>
          <StatusIcon className={`w-4 h-4 ${config.iconColor}`} />
          <span className="font-bold text-sm">{message}</span>
        </div>

        {/* زر الدخول */}
        <div className="flex items-center justify-between pt-4 border-t-2 border-gray-200/50">
          <span className="font-bold text-gray-700 group-hover:text-gray-900 transition-colors">
            الدخول التنفيذي
          </span>
          <ArrowRight className="w-5 h-5 text-gray-600 group-hover:text-gray-900 group-hover:translate-x-1 transition-all" />
        </div>
      </div>
    </button>
  );
}
