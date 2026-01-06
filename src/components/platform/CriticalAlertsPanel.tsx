import {
  UserX,
  Users,
  Clock,
  TrendingUp,
  Lock,
  Eye,
  AlertTriangle
} from 'lucide-react';
import { useCriticalAlerts } from '../../hooks/useCriticalAlerts';

interface CriticalAlertsPanelProps {
  onFilterChange: (farmIds: string[] | null) => void;
  activeFilter: string[] | null;
}

export default function CriticalAlertsPanel({ onFilterChange, activeFilter }: CriticalAlertsPanelProps) {
  const { alerts, loading } = useCriticalAlerts();

  if (loading) {
    return (
      <div className="bg-white rounded-xl border-2 border-slate-200 p-6 mb-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
          <span className="mr-3 text-slate-600">جاري تحميل التنبيهات...</span>
        </div>
      </div>
    );
  }

  if (!alerts) {
    return null;
  }

  const alertsConfig = [
    {
      key: 'farms_no_manager',
      label: 'مزارع بدون مدير',
      icon: UserX,
      color: 'red',
      count: alerts.farms_no_manager.count,
      farmIds: alerts.farms_no_manager.farm_ids
    },
    {
      key: 'farms_no_team',
      label: 'مزارع بدون فريق',
      icon: Users,
      color: 'orange',
      count: alerts.farms_no_team.count,
      farmIds: alerts.farms_no_team.farm_ids
    },
    {
      key: 'farms_overdue_tasks',
      label: 'مهام متأخرة +7 أيام',
      icon: Clock,
      color: 'red',
      count: alerts.farms_overdue_tasks.count,
      farmIds: alerts.farms_overdue_tasks.farm_ids
    },
    {
      key: 'farms_high_expenses',
      label: 'مصروفات مرتفعة',
      icon: TrendingUp,
      color: 'amber',
      count: alerts.farms_high_expenses.count,
      farmIds: alerts.farms_high_expenses.farm_ids
    },
    {
      key: 'farms_closed_with_requests',
      label: 'حجوزات مغلقة مع طلبات',
      icon: Lock,
      color: 'blue',
      count: alerts.farms_closed_with_requests.count,
      farmIds: alerts.farms_closed_with_requests.farm_ids
    }
  ];

  const totalAlerts = alertsConfig.reduce((sum, alert) => sum + alert.count, 0);

  const getColorClasses = (color: string, isActive: boolean) => {
    const colors = {
      red: {
        bg: isActive ? 'bg-red-100 border-red-500' : 'bg-red-50 border-red-200',
        text: 'text-red-700',
        icon: 'text-red-500',
        badge: 'bg-red-500',
        button: isActive ? 'bg-red-600 hover:bg-red-700' : 'bg-red-500 hover:bg-red-600'
      },
      orange: {
        bg: isActive ? 'bg-orange-100 border-orange-500' : 'bg-orange-50 border-orange-200',
        text: 'text-orange-700',
        icon: 'text-orange-500',
        badge: 'bg-orange-500',
        button: isActive ? 'bg-orange-600 hover:bg-orange-700' : 'bg-orange-500 hover:bg-orange-600'
      },
      amber: {
        bg: isActive ? 'bg-amber-100 border-amber-500' : 'bg-amber-50 border-amber-200',
        text: 'text-amber-700',
        icon: 'text-amber-500',
        badge: 'bg-amber-500',
        button: isActive ? 'bg-amber-600 hover:bg-amber-700' : 'bg-amber-500 hover:bg-amber-600'
      },
      blue: {
        bg: isActive ? 'bg-blue-100 border-blue-500' : 'bg-blue-50 border-blue-200',
        text: 'text-blue-700',
        icon: 'text-blue-500',
        badge: 'bg-blue-500',
        button: isActive ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'
      }
    };
    return colors[color as keyof typeof colors] || colors.red;
  };

  const handleFilterClick = (farmIds: string[]) => {
    if (activeFilter && JSON.stringify(activeFilter) === JSON.stringify(farmIds)) {
      onFilterChange(null);
    } else {
      onFilterChange(farmIds);
    }
  };

  const handleClearFilter = () => {
    onFilterChange(null);
  };

  return (
    <div className="mb-6">
      <div className="bg-gradient-to-r from-red-500 to-orange-500 rounded-xl p-1">
        <div className="bg-white rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">تنبيهات حرجة</h2>
                <p className="text-sm text-slate-500">
                  {totalAlerts > 0 ? `${totalAlerts} تنبيه يحتاج متابعة` : 'لا توجد تنبيهات'}
                </p>
              </div>
            </div>
            {activeFilter && (
              <button
                onClick={handleClearFilter}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-sm font-medium transition-colors duration-200"
              >
                إلغاء الفلتر
              </button>
            )}
          </div>

          {totalAlerts === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                <AlertTriangle className="w-8 h-8 text-emerald-600" />
              </div>
              <p className="text-slate-600 font-medium">رائع! لا توجد تنبيهات حرجة</p>
              <p className="text-sm text-slate-500 mt-1">جميع المزارع تعمل بشكل طبيعي</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
              {alertsConfig.map((alert) => {
                if (alert.count === 0) return null;

                const isActive = activeFilter && JSON.stringify(activeFilter) === JSON.stringify(alert.farmIds);
                const colors = getColorClasses(alert.color, isActive);
                const Icon = alert.icon;

                return (
                  <div
                    key={alert.key}
                    className={`${colors.bg} border-2 rounded-xl p-4 transition-all duration-200`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className={`w-10 h-10 rounded-lg bg-white flex items-center justify-center`}>
                        <Icon className={`w-5 h-5 ${colors.icon}`} />
                      </div>
                      <div className={`${colors.badge} text-white text-xs font-bold px-2 py-1 rounded-full`}>
                        {alert.count}
                      </div>
                    </div>
                    <h3 className={`${colors.text} font-bold text-sm mb-3`}>
                      {alert.label}
                    </h3>
                    <button
                      onClick={() => handleFilterClick(alert.farmIds)}
                      className={`w-full flex items-center justify-center gap-2 px-3 py-2 ${colors.button} text-white rounded-lg text-sm font-medium transition-all duration-200 shadow-md hover:shadow-lg`}
                    >
                      <Eye className="w-4 h-4" />
                      <span>{isActive ? 'إلغاء العرض' : 'عرض'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
