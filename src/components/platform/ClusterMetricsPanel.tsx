import { useFarmClusters } from '../../hooks/useFarmClusters';
import { useNavigate } from 'react-router-dom';
import {
  Layers,
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertCircle,
  Users,
  MapPin,
  ArrowRight,
  Activity,
  CheckCircle
} from 'lucide-react';

export default function ClusterMetricsPanel() {
  const { clusters, loading } = useFarmClusters();
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

  if (!clusters || clusters.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
        <Layers className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-gray-900 mb-2">لا توجد مجموعات مزارع</h3>
        <p className="text-sm text-gray-600">سيتم عرض المجموعات هنا بمجرد إنشائها</p>
      </div>
    );
  }

  const getHealthColor = (performance: number) => {
    if (performance >= 40) return 'green';
    if (performance >= 25) return 'yellow';
    if (performance >= 10) return 'orange';
    return 'red';
  };

  const getHealthLabel = (performance: number) => {
    if (performance >= 40) return 'ممتاز';
    if (performance >= 25) return 'جيد';
    if (performance >= 10) return 'تحذير';
    return 'حرج';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'red';
      case 'high': return 'orange';
      case 'normal': return 'blue';
      case 'low': return 'gray';
      default: return 'gray';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'critical': return 'حرج';
      case 'high': return 'عالي';
      case 'normal': return 'عادي';
      case 'low': return 'منخفض';
      default: return priority;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
          <Layers className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">مؤشرات مجموعات المزارع</h3>
          <p className="text-sm text-gray-600">نظرة شاملة على أداء كل منطقة</p>
        </div>
      </div>

      {/* Clusters Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {clusters.map((cluster) => {
          const healthColor = getHealthColor(cluster.avg_performance);
          const priorityColor = getPriorityColor(cluster.priority);
          const hasIssues = cluster.struggling_farms > 0 || cluster.pending_decisions > 0;

          return (
            <div
              key={cluster.id}
              className={`
                group bg-white rounded-2xl border-2 transition-all duration-300 hover:shadow-xl
                ${hasIssues ? `border-${healthColor}-200` : 'border-gray-200'}
              `}
            >
              {/* Header */}
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-lg font-bold text-gray-900">{cluster.name}</h4>
                      {cluster.name_en && (
                        <span className="text-xs text-gray-500">({cluster.name_en})</span>
                      )}
                    </div>

                    {/* Region & Supervisor */}
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      {cluster.region_name && (
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <MapPin className="w-4 h-4" />
                          <span>{cluster.region_name}</span>
                        </div>
                      )}
                      {cluster.supervisor_name && (
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <Users className="w-4 h-4" />
                          <span>{cluster.supervisor_name}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Priority Badge */}
                  <div className={`px-3 py-1.5 rounded-lg bg-${priorityColor}-100 text-${priorityColor}-700 text-xs font-bold`}>
                    {getPriorityLabel(cluster.priority)}
                  </div>
                </div>

                {/* Performance Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">متوسط الأداء</span>
                    <span className={`font-bold text-${healthColor}-600`}>
                      {getHealthLabel(cluster.avg_performance)}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r from-${healthColor}-400 to-${healthColor}-600 transition-all duration-500`}
                      style={{ width: `${Math.min(100, (cluster.avg_performance / 50) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="p-6 grid grid-cols-2 gap-4">
                {/* عدد المزارع */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-gray-400" />
                    <span className="text-xs text-gray-600">عدد المزارع</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{cluster.farms_count}</div>
                </div>

                {/* المزارع النشطة */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    <span className="text-xs text-gray-600">النشطة</span>
                  </div>
                  <div className="text-2xl font-bold text-green-600">{cluster.active_farms}</div>
                </div>

                {/* المزارع المتعثرة */}
                {cluster.struggling_farms > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="w-4 h-4 text-red-500" />
                      <span className="text-xs text-gray-600">المتعثرة</span>
                    </div>
                    <div className="text-2xl font-bold text-red-600">{cluster.struggling_farms}</div>
                  </div>
                )}

                {/* إجمالي المصروفات */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-purple-500" />
                    <span className="text-xs text-gray-600">المصروفات (30 يوم)</span>
                  </div>
                  <div className="text-lg font-bold text-purple-600">
                    {cluster.total_expenses_30d.toLocaleString()} ر.س
                  </div>
                </div>

                {/* القرارات المعلقة */}
                {cluster.pending_decisions > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-orange-500" />
                      <span className="text-xs text-gray-600">قرارات معلقة</span>
                    </div>
                    <div className="text-2xl font-bold text-orange-600">{cluster.pending_decisions}</div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 bg-gray-50 rounded-b-2xl border-t border-gray-100">
                <button
                  onClick={() => navigate(`/admin/b2f/clusters/${cluster.id}`)}
                  className="w-full flex items-center justify-between px-4 py-2 rounded-lg bg-white border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-all group/btn"
                >
                  <span className="text-sm font-medium text-gray-700 group-hover/btn:text-purple-700">
                    عرض التفاصيل الكاملة
                  </span>
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover/btn:text-purple-600 transition-transform group-hover/btn:translate-x-1" />
                </button>
              </div>

              {/* Health Indicator Badge */}
              {hasIssues && (
                <div className={`absolute top-4 left-4 px-2 py-1 rounded-full bg-${healthColor}-100 border border-${healthColor}-200`}>
                  <Activity className={`w-3 h-3 text-${healthColor}-600`} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary Footer */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-200 p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-purple-900 mb-1">إدارة منظمة</h4>
            <p className="text-sm text-purple-700 leading-relaxed">
              {clusters.length} مجموعة مزارع ·
              {' '}{clusters.reduce((sum, c) => sum + c.farms_count, 0)} مزرعة إجمالي ·
              {' '}{clusters.reduce((sum, c) => sum + c.active_farms, 0)} نشطة ·
              {' '}{clusters.reduce((sum, c) => sum + c.struggling_farms, 0)} متعثرة
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
