import { Bell, TrendingUp, Activity, ArrowRight } from 'lucide-react';

interface DashboardCardProps {
  title: string;
  icon: string;
  color: string;
  activeCount: number;
  totalCount: number;
  pendingAlerts: number;
  description: string;
  onClick: () => void;
}

export function DashboardCard({
  title,
  icon,
  color,
  activeCount,
  totalCount,
  pendingAlerts,
  description,
  onClick
}: DashboardCardProps) {
  return (
    <div
      onClick={onClick}
      className="group relative cursor-pointer"
      style={{
        perspective: '1000px'
      }}
    >
      <div
        className="relative bg-white rounded-2xl shadow-lg border-2 transition-all duration-500 hover:shadow-2xl overflow-hidden"
        style={{
          borderColor: color,
          transform: 'translateZ(0)',
          transition: 'transform 0.5s ease, box-shadow 0.5s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateZ(20px) rotateX(5deg) rotateY(-5deg)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateZ(0) rotateX(0) rotateY(0)';
        }}
      >
        <div
          className="absolute inset-0 opacity-10"
          style={{
            background: `linear-gradient(135deg, ${color} 0%, transparent 100%)`
          }}
        />

        <div className="relative p-6">
          <div className="flex items-start justify-between mb-4">
            <div
              className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl shadow-md transform transition-transform group-hover:scale-110 group-hover:rotate-12"
              style={{
                backgroundColor: `${color}20`,
                border: `2px solid ${color}`
              }}
            >
              {icon}
            </div>

            {pendingAlerts > 0 && (
              <div className="relative">
                <Bell
                  className="w-6 h-6 text-red-500 animate-pulse"
                  fill="currentColor"
                />
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {pendingAlerts > 9 ? '9+' : pendingAlerts}
                </span>
              </div>
            )}
          </div>

          <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:translate-x-1 transition-transform">
            {title}
          </h3>

          <p className="text-sm text-gray-600 mb-4 line-clamp-2">
            {description}
          </p>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div
              className="rounded-lg p-3"
              style={{ backgroundColor: `${color}10` }}
            >
              <div className="flex items-center gap-2 mb-1">
                <Activity className="w-4 h-4" style={{ color }} />
                <span className="text-xs font-medium text-gray-600">نشط</span>
              </div>
              <div className="text-2xl font-bold" style={{ color }}>
                {activeCount}
              </div>
            </div>

            <div
              className="rounded-lg p-3"
              style={{ backgroundColor: `${color}10` }}
            >
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4" style={{ color }} />
                <span className="text-xs font-medium text-gray-600">الإجمالي</span>
              </div>
              <div className="text-2xl font-bold" style={{ color }}>
                {totalCount}
              </div>
            </div>
          </div>

          <div
            className="flex items-center justify-between py-3 px-4 rounded-lg font-medium text-sm transition-all group-hover:translate-x-2"
            style={{
              backgroundColor: `${color}15`,
              color: color
            }}
          >
            <span>الدخول إلى لوحة التحكم</span>
            <ArrowRight className="w-5 h-5" />
          </div>
        </div>

        <div
          className="absolute bottom-0 left-0 right-0 h-1 transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500"
          style={{ backgroundColor: color }}
        />
      </div>
    </div>
  );
}
