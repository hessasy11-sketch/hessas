import { useNavigate } from 'react-router-dom';
import { useQuickActions } from '../../hooks/useQuickActions';
import {
  ArrowRight,
  TrendingDown,
  DollarSign,
  Sprout,
  Layers,
  Zap
} from 'lucide-react';

export default function QuickActionButtons() {
  const { stats, loading } = useQuickActions();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="mr-3 text-gray-600">جاري التحميل...</span>
        </div>
      </div>
    );
  }

  const actions = [
    {
      id: 'decision-queue',
      title: 'غرفة القرارات',
      subtitle: 'انتقل لمراجعة القرارات المعلقة',
      icon: Layers,
      color: 'blue',
      gradient: 'from-blue-500 to-blue-600',
      bgGradient: 'from-blue-50 to-blue-100',
      badge: stats?.pending_decisions || 0,
      badgeColor: 'bg-blue-100 text-blue-700',
      path: '/admin/operations-room/b2f',
      action: 'قرار معلق',
      description: 'مراجعة واعتماد القرارات'
    },
    {
      id: 'worst-farms',
      title: 'أسوأ المزارع أداءً',
      subtitle: 'عرض المزارع التي تحتاج تدخل فوري',
      icon: TrendingDown,
      color: 'red',
      gradient: 'from-red-500 to-red-600',
      bgGradient: 'from-red-50 to-red-100',
      badge: stats?.worst_farms || 0,
      badgeColor: 'bg-red-100 text-red-700',
      path: '/admin/operations-room/b2f',
      action: 'مزرعة',
      description: 'مزارع متعثرة أو منخفضة الأداء'
    },
    {
      id: 'high-expenses',
      title: 'أعلى المصروفات',
      subtitle: 'عرض المصروفات الكبيرة المعلقة',
      icon: DollarSign,
      color: 'orange',
      gradient: 'from-orange-500 to-orange-600',
      bgGradient: 'from-orange-50 to-orange-100',
      badge: stats?.high_expenses || 0,
      badgeColor: 'bg-orange-100 text-orange-700',
      path: '/admin/operations-room/b2f',
      action: 'مصروف',
      description: 'مصروفات تتجاوز 5,000 ر.س'
    },
    {
      id: 'farm-command',
      title: 'قيادة المزرعة',
      subtitle: 'إدارة التشغيل اليومي للمزرعة',
      icon: Sprout,
      color: 'emerald',
      gradient: 'from-emerald-500 to-emerald-600',
      bgGradient: 'from-emerald-50 to-emerald-100',
      badge: (stats?.today_tasks || 0) + (stats?.pending_expenses || 0) + (stats?.operational_alerts || 0),
      badgeColor: 'bg-emerald-100 text-emerald-700',
      path: '/admin/farm-command',
      action: 'عنصر',
      description: 'الفرق | المهام | المصروفات | السجل'
    }
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">أزرار القيادة السريعة</h3>
          <p className="text-sm text-gray-600">انتقل مباشرة للإجراءات المطلوبة</p>
        </div>
      </div>

      {/* Action Buttons Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {actions.map((action) => {
          const Icon = action.icon;
          const isActive = action.badge > 0;

          return (
            <button
              key={action.id}
              onClick={() => navigate(action.path)}
              className={`
                group relative overflow-hidden rounded-2xl border-2 transition-all duration-300
                ${isActive
                  ? `border-${action.color}-200 bg-gradient-to-br ${action.bgGradient} hover:shadow-xl hover:scale-[1.02]`
                  : 'border-gray-200 bg-gray-50 hover:bg-gray-100 hover:shadow-md'
                }
              `}
            >
              {/* Background Gradient Effect */}
              <div className={`absolute inset-0 bg-gradient-to-br ${action.gradient} opacity-0 group-hover:opacity-5 transition-opacity`}></div>

              {/* Content */}
              <div className="relative p-6">
                {/* Icon & Badge */}
                <div className="flex items-start justify-between mb-4">
                  <div className={`
                    w-14 h-14 rounded-xl flex items-center justify-center
                    ${isActive
                      ? `bg-gradient-to-br ${action.gradient} shadow-lg`
                      : 'bg-gray-200'
                    }
                  `}>
                    <Icon className={`w-7 h-7 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                  </div>

                  {/* Badge */}
                  {isActive && (
                    <div className="flex flex-col items-end">
                      <div className={`px-3 py-1.5 rounded-lg ${action.badgeColor} font-bold text-lg animate-pulse`}>
                        {action.badge}
                      </div>
                      <span className={`text-xs mt-1 text-${action.color}-600 font-medium`}>
                        {action.action}
                      </span>
                    </div>
                  )}
                </div>

                {/* Text */}
                <div className="mb-4">
                  <h4 className={`text-lg font-bold mb-1 ${isActive ? `text-${action.color}-900` : 'text-gray-700'}`}>
                    {action.title}
                  </h4>
                  <p className={`text-sm leading-relaxed ${isActive ? `text-${action.color}-700` : 'text-gray-600'}`}>
                    {action.subtitle}
                  </p>
                </div>

                {/* Description */}
                <div className={`
                  flex items-center justify-between pt-4 border-t
                  ${isActive ? `border-${action.color}-200` : 'border-gray-200'}
                `}>
                  <span className={`text-xs ${isActive ? `text-${action.color}-600` : 'text-gray-500'}`}>
                    {action.description}
                  </span>
                  <ArrowRight className={`
                    w-5 h-5 transition-transform group-hover:translate-x-1
                    ${isActive ? `text-${action.color}-600` : 'text-gray-400'}
                  `} />
                </div>

                {/* Hover Effect Line */}
                <div className={`
                  absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${action.gradient}
                  transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left
                `}></div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Info Banner */}
      {stats && (stats.pending_decisions > 0 || stats.worst_farms > 0 || stats.high_expenses > 0 || stats.today_tasks > 0 || stats.pending_expenses > 0 || stats.operational_alerts > 0) && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200 p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-indigo-900 mb-1">إجراءات معلقة تحتاج انتباهك</h4>
              <p className="text-sm text-indigo-700 leading-relaxed">
                لديك <strong className="text-indigo-900">
                  {(stats.pending_decisions || 0) + (stats.worst_farms || 0) + (stats.high_expenses || 0) + (stats.today_tasks || 0) + (stats.pending_expenses || 0) + (stats.operational_alerts || 0)}
                </strong> عنصر يحتاج مراجعة أو اتخاذ قرار. استخدم الأزرار أعلاه للانتقال مباشرة.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {stats && stats.pending_decisions === 0 && stats.worst_farms === 0 && stats.high_expenses === 0 && stats.today_tasks === 0 && stats.pending_expenses === 0 && stats.operational_alerts === 0 && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200 p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mx-auto mb-3">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h4 className="text-lg font-bold text-green-900 mb-2">جميع الأمور تحت السيطرة</h4>
          <p className="text-sm text-green-700">
            لا توجد إجراءات عاجلة تحتاج انتباهك حالياً
          </p>
        </div>
      )}
    </div>
  );
}
