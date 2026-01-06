import { ArrowLeft, LucideIcon } from 'lucide-react';

interface KPI {
  label: string;
  value: number | string;
  loading?: boolean;
}

interface GatewayCardProps {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  iconGradient: string;
  borderColor: string;
  kpis: KPI[];
  onEnter: () => void;
  loading?: boolean;
}

export default function GatewayCard({
  title,
  subtitle,
  icon: Icon,
  iconGradient,
  borderColor,
  kpis,
  onEnter,
  loading = false
}: GatewayCardProps) {
  return (
    <div className="group relative">
      <div className={`absolute inset-0 bg-gradient-to-br ${iconGradient} rounded-3xl blur-3xl opacity-10 group-hover:opacity-20 transition-opacity duration-500`} />

      <div className={`relative bg-white rounded-3xl border-2 ${borderColor} shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden`}>
        <div className="p-8">
          {/* Header */}
          <div className="flex items-start gap-5 mb-8">
            <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${iconGradient} flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform duration-300`}>
              <Icon className="w-10 h-10 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-slate-900 mb-1 group-hover:text-slate-700 transition-colors">
                {title}
              </h3>
              <p className="text-slate-500 text-sm">{subtitle}</p>
            </div>
          </div>

          {/* KPIs - 3 Indicators */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            {kpis.slice(0, 3).map((kpi, index) => (
              <div
                key={index}
                className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl p-5 border border-slate-200 hover:border-slate-300 transition-all"
              >
                <div className="text-xs text-slate-600 font-medium mb-2">
                  {kpi.label}
                </div>
                <div className="text-3xl font-bold text-slate-900">
                  {kpi.loading ? (
                    <div className="animate-pulse">...</div>
                  ) : (
                    <span>{typeof kpi.value === 'number' ? kpi.value.toLocaleString() : kpi.value}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Enter Button */}
          <button
            onClick={onEnter}
            disabled={loading}
            className={`w-full flex items-center justify-center gap-3 px-8 py-5 bg-gradient-to-r ${iconGradient} text-white rounded-2xl font-bold text-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed group-hover:shadow-2xl`}
          >
            <span>دخول الغرفة</span>
            <ArrowLeft className="w-6 h-6 group-hover:translate-x-[-4px] transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}
