import { useState, useEffect } from 'react';
import {
  CheckCircle,
  AlertTriangle,
  Clock,
  DollarSign,
  XCircle,
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Calendar,
  BarChart3
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface FarmKPIsPanelProps {
  farmId: string;
}

interface FarmKPIs {
  farm_id: string;
  period: string;
  tasks: {
    completed_30d: number;
    overdue: number;
    pending: number;
    total: number;
    completion_rate: number;
  };
  performance: {
    avg_completion_hours: number;
    avg_completion_days: number;
  };
  financial: {
    total_expenses_30d: number;
    rejected_approvals: number;
  };
  last_activity: {
    date: string | null;
    description: string | null;
    type: string | null;
  };
}

interface PerformanceTrend {
  current_period: number;
  previous_period: number;
  trend_percentage: number;
  trend_direction: 'up' | 'down' | 'stable';
}

export default function FarmKPIsPanel({ farmId }: FarmKPIsPanelProps) {
  const [kpis, setKpis] = useState<FarmKPIs | null>(null);
  const [trend, setTrend] = useState<PerformanceTrend | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    loadKPIs();
  }, [farmId, refreshKey]);

  const loadKPIs = async () => {
    try {
      setLoading(true);

      const [kpisResult, trendResult] = await Promise.all([
        supabase.rpc('get_farm_kpis', { p_farm_id: farmId }),
        supabase.rpc('get_farm_performance_trend', { p_farm_id: farmId, p_days: 7 })
      ]);

      if (kpisResult.error) throw kpisResult.error;
      if (trendResult.error) throw trendResult.error;

      setKpis(kpisResult.data);
      setTrend(trendResult.data);
    } catch (error: any) {
      console.error('Error loading farm KPIs:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getTimeAgo = (dateString: string | null) => {
    if (!dateString) return 'لا يوجد نشاط';

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    return `منذ ${diffDays} يوم`;
  };

  const getTrendIcon = () => {
    if (!trend) return null;

    switch (trend.trend_direction) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-emerald-500" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-slate-400" />;
    }
  };

  const getTrendColor = () => {
    if (!trend) return 'text-slate-600';

    switch (trend.trend_direction) {
      case 'up':
        return 'text-emerald-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-slate-600';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border-2 border-slate-200 p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-blue-500"></div>
        </div>
        <p className="text-center text-slate-500 mt-4">جاري تحميل مؤشرات الأداء...</p>
      </div>
    );
  }

  if (!kpis) {
    return (
      <div className="bg-white rounded-xl border-2 border-slate-200 p-8 text-center">
        <BarChart3 className="w-12 h-12 text-slate-400 mx-auto mb-3" />
        <p className="text-slate-500">لا توجد بيانات متاحة</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-blue-600" />
            مؤشرات الأداء
          </h2>
          <p className="text-sm text-slate-500 mt-1">آخر 30 يوم</p>
        </div>
        <button
          onClick={() => setRefreshKey(prev => prev + 1)}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-bold transition-colors text-sm"
        >
          تحديث
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* KPI 1: المهام المكتملة */}
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-2 border-emerald-200 rounded-xl p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="bg-emerald-500 rounded-lg p-2">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            {trend && (
              <div className={`flex items-center gap-1 ${getTrendColor()}`}>
                {getTrendIcon()}
                <span className="text-xs font-bold">{trend.trend_percentage}%</span>
              </div>
            )}
          </div>
          <h3 className="text-3xl font-bold text-emerald-700 mb-1">
            {kpis.tasks.completed_30d}
          </h3>
          <p className="text-sm text-emerald-600 font-medium">مهام مكتملة</p>
          <p className="text-xs text-emerald-500 mt-1">
            معدل الإنجاز: {kpis.tasks.completion_rate}%
          </p>
        </div>

        {/* KPI 2: المهام المتأخرة */}
        <div className="bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-200 rounded-xl p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="bg-red-500 rounded-lg p-2">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            {kpis.tasks.overdue > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                عاجل
              </span>
            )}
          </div>
          <h3 className="text-3xl font-bold text-red-700 mb-1">
            {kpis.tasks.overdue}
          </h3>
          <p className="text-sm text-red-600 font-medium">مهام متأخرة</p>
          <p className="text-xs text-red-500 mt-1">
            تحتاج اهتمام فوري
          </p>
        </div>

        {/* KPI 3: متوسط وقت الإغلاق */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="bg-blue-500 rounded-lg p-2">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <Target className="w-5 h-5 text-blue-400" />
          </div>
          <h3 className="text-3xl font-bold text-blue-700 mb-1">
            {kpis.performance.avg_completion_days > 0
              ? `${kpis.performance.avg_completion_days}`
              : '0'}
          </h3>
          <p className="text-sm text-blue-600 font-medium">متوسط يوم للإغلاق</p>
          <p className="text-xs text-blue-500 mt-1">
            {kpis.performance.avg_completion_hours} ساعة
          </p>
        </div>

        {/* KPI 4: إجمالي المصروفات */}
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 border-2 border-amber-200 rounded-xl p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="bg-amber-500 rounded-lg p-2">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-amber-700 mb-1">
            {formatCurrency(kpis.financial.total_expenses_30d)}
          </h3>
          <p className="text-sm text-amber-600 font-medium">إجمالي المصروفات</p>
          <p className="text-xs text-amber-500 mt-1">
            ريال سعودي (آخر 30 يوم)
          </p>
        </div>

        {/* KPI 5: الاعتمادات المرفوضة */}
        <div className="bg-gradient-to-br from-rose-50 to-rose-100 border-2 border-rose-200 rounded-xl p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="bg-rose-500 rounded-lg p-2">
              <XCircle className="w-6 h-6 text-white" />
            </div>
            {kpis.financial.rejected_approvals > 3 && (
              <span className="bg-rose-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                عالي
              </span>
            )}
          </div>
          <h3 className="text-3xl font-bold text-rose-700 mb-1">
            {kpis.financial.rejected_approvals}
          </h3>
          <p className="text-sm text-rose-600 font-medium">اعتمادات مرفوضة</p>
          <p className="text-xs text-rose-500 mt-1">
            آخر 90 يوم
          </p>
        </div>

        {/* KPI 6: آخر نشاط */}
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-slate-200 rounded-xl p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="bg-slate-500 rounded-lg p-2">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <Calendar className="w-5 h-5 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-700 mb-1 truncate">
            {kpis.last_activity.description || 'لا يوجد نشاط'}
          </h3>
          <p className="text-sm text-slate-600 font-medium">آخر نشاط تشغيل</p>
          <p className="text-xs text-slate-500 mt-1">
            {getTimeAgo(kpis.last_activity.date)}
          </p>
        </div>
      </div>

      {/* ملخص إضافي */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-5">
        <div className="flex items-center gap-3 mb-3">
          <Target className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-bold text-slate-900">ملخص الأداء</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-700">{kpis.tasks.total}</p>
            <p className="text-xs text-slate-600 mt-1">إجمالي المهام</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-amber-700">{kpis.tasks.pending}</p>
            <p className="text-xs text-slate-600 mt-1">معلقة</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-emerald-700">{kpis.tasks.completion_rate}%</p>
            <p className="text-xs text-slate-600 mt-1">معدل الإنجاز</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-700">
              {trend ? trend.current_period : 0}
            </p>
            <p className="text-xs text-slate-600 mt-1">آخر 7 أيام</p>
          </div>
        </div>
      </div>
    </div>
  );
}
