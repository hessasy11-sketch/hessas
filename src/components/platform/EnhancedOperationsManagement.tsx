import { useState, useEffect } from 'react';
import {
  Activity,
  Users,
  TrendingUp,
  Target,
  Clock,
  DollarSign,
  CheckCircle,
  AlertCircle,
  BarChart3,
  FileText,
  UserCog,
  TreePine,
  Award,
  Zap,
  Settings
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface OperationStats {
  total_operations: number;
  active_operations: number;
  completed_operations: number;
  total_contracts: number;
  total_investors: number;
  total_trees: number;
  total_staff_assigned: number;
  pending_tasks: number;
  in_progress_tasks: number;
  completed_tasks: number;
  delayed_tasks: number;
  avg_performance_score: number;
  avg_quality_rating: number;
  total_budget_allocated: number;
  total_budget_spent: number;
  budget_utilization: number;
}

interface FarmWithDetails {
  id: string;
  name: string;
  location: string;
  city: string;
  director_name: string;
  manager_name: string;
  active_operations: number;
  total_contracts: number;
  total_staff: number;
  performance_score: number;
  budget_utilization: number;
}

type ViewMode = 'overview' | 'farms' | 'staff' | 'tasks' | 'performance' | 'budget';

export default function EnhancedOperationsManagement() {
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [stats, setStats] = useState<OperationStats | null>(null);
  const [farms, setFarms] = useState<FarmWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // جلب الإحصائيات الشاملة
      const { data: statsData, error: statsError } = await supabase
        .rpc('get_comprehensive_operation_stats');

      if (statsError) throw statsError;
      setStats(statsData);

      // جلب المزارع مع التفاصيل
      await loadFarmsWithDetails();
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFarmsWithDetails = async () => {
    try {
      const { data: farmsData, error } = await supabase
        .from('b2f_farms')
        .select(`
          id,
          name,
          location,
          city,
          farm_director_id,
          farm_manager_id
        `)
        .eq('is_active', true);

      if (error) throw error;

      const farmsWithDetails = await Promise.all(
        (farmsData || []).map(async (farm) => {
          // جلب اسم المدير
          const { data: directorData } = await supabase
            .from('farm_directors')
            .select('name_ar')
            .eq('id', farm.farm_director_id)
            .maybeSingle();

          // جلب اسم مدير المزرعة
          const { data: managerData } = await supabase
            .from('farm_staff_hierarchy')
            .select('name_ar')
            .eq('id', farm.farm_manager_id)
            .maybeSingle();

          // جلب تفاصيل العمليات
          const { data: operationStats } = await supabase
            .rpc('get_farm_operation_details', { p_farm_id: farm.id });

          return {
            id: farm.id,
            name: farm.name,
            location: farm.location,
            city: farm.city,
            director_name: directorData?.name_ar || 'غير محدد',
            manager_name: managerData?.name_ar || 'غير محدد',
            active_operations: operationStats?.operations?.active || 0,
            total_contracts: operationStats?.contracts?.active || 0,
            total_staff: operationStats?.staff?.total || 0,
            performance_score: operationStats?.operations?.avg_performance || 0,
            budget_utilization: operationStats?.budget?.utilization || 0
          };
        })
      );

      setFarms(farmsWithDetails);
    } catch (error) {
      console.error('Error loading farms:', error);
    }
  };

  const views = [
    { id: 'overview', label: 'نظرة عامة', icon: Activity, color: 'from-blue-500 to-indigo-600' },
    { id: 'farms', label: 'المزارع', icon: TreePine, color: 'from-emerald-500 to-green-600' },
    { id: 'staff', label: 'الموظفين', icon: Users, color: 'from-purple-500 to-pink-600' },
    { id: 'tasks', label: 'المهام', icon: CheckCircle, color: 'from-orange-500 to-red-600' },
    { id: 'performance', label: 'الأداء', icon: TrendingUp, color: 'from-teal-500 to-cyan-600' },
    { id: 'budget', label: 'الميزانية', icon: DollarSign, color: 'from-amber-500 to-orange-600' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <Activity className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-white">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* View Selector */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-2">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {views.map((view) => (
            <button
              key={view.id}
              onClick={() => setViewMode(view.id as ViewMode)}
              className={`px-4 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                viewMode === view.id
                  ? `bg-gradient-to-r ${view.color} text-white shadow-lg`
                  : 'text-gray-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <view.icon className="w-5 h-5" />
              <span className="hidden sm:inline">{view.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {viewMode === 'overview' && stats && (
        <OverviewView stats={stats} farms={farms} />
      )}

      {viewMode === 'farms' && (
        <FarmsView farms={farms} onRefresh={loadData} />
      )}

      {viewMode === 'staff' && (
        <StaffView />
      )}

      {viewMode === 'tasks' && (
        <TasksView />
      )}

      {viewMode === 'performance' && stats && (
        <PerformanceView stats={stats} />
      )}

      {viewMode === 'budget' && stats && (
        <BudgetView stats={stats} />
      )}
    </div>
  );
}

function OverviewView({ stats, farms }: { stats: OperationStats; farms: FarmWithDetails[] }) {
  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="العمليات النشطة"
          value={stats.active_operations}
          total={stats.total_operations}
          icon={Activity}
          color="from-blue-500 to-indigo-600"
        />
        <MetricCard
          title="المهام قيد التنفيذ"
          value={stats.in_progress_tasks}
          total={stats.pending_tasks + stats.in_progress_tasks}
          icon={CheckCircle}
          color="from-emerald-500 to-green-600"
        />
        <MetricCard
          title="المستثمرون"
          value={stats.total_investors}
          total={stats.total_contracts}
          icon={Users}
          color="from-purple-500 to-pink-600"
          subtitle="عقد"
        />
        <MetricCard
          title="استغلال الميزانية"
          value={Math.round(stats.budget_utilization)}
          total={100}
          icon={DollarSign}
          color="from-amber-500 to-orange-600"
          suffix="%"
        />
      </div>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-lg">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">مؤشرات الأداء</h3>
              <p className="text-gray-400 text-sm">معدلات الأداء الحالية</p>
            </div>
          </div>

          <div className="space-y-4">
            <ProgressBar
              label="معدل الأداء"
              value={stats.avg_performance_score || 0}
              max={100}
              color="bg-teal-500"
            />
            <ProgressBar
              label="تقييم الجودة"
              value={(stats.avg_quality_rating || 0) * 100}
              max={100}
              color="bg-blue-500"
            />
            <ProgressBar
              label="إنجاز المهام"
              value={(stats.completed_tasks / (stats.completed_tasks + stats.pending_tasks + stats.in_progress_tasks)) * 100}
              max={100}
              color="bg-emerald-500"
            />
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">حالة المهام</h3>
              <p className="text-gray-400 text-sm">توزيع المهام حسب الحالة</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <TaskStatusCard
              label="معلقة"
              count={stats.pending_tasks}
              color="bg-gray-500"
            />
            <TaskStatusCard
              label="قيد التنفيذ"
              count={stats.in_progress_tasks}
              color="bg-blue-500"
            />
            <TaskStatusCard
              label="مكتملة"
              count={stats.completed_tasks}
              color="bg-emerald-500"
            />
            <TaskStatusCard
              label="متأخرة"
              count={stats.delayed_tasks}
              color="bg-red-500"
            />
          </div>
        </div>
      </div>

      {/* Top Performing Farms */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg">
            <Award className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">المزارع الأعلى أداءً</h3>
            <p className="text-gray-400 text-sm">أفضل 5 مزارع حسب مؤشر الأداء</p>
          </div>
        </div>

        <div className="space-y-3">
          {farms
            .sort((a, b) => b.performance_score - a.performance_score)
            .slice(0, 5)
            .map((farm, index) => (
              <div
                key={farm.id}
                className="flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all"
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white ${
                  index === 0 ? 'bg-gradient-to-br from-yellow-400 to-orange-500' :
                  index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400' :
                  index === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-700' :
                  'bg-gradient-to-br from-gray-500 to-gray-600'
                }`}>
                  {index + 1}
                </div>
                <div className="flex-1">
                  <h4 className="text-white font-bold">{farm.name}</h4>
                  <p className="text-gray-400 text-sm">مدير: {farm.manager_name}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-emerald-400">{farm.performance_score.toFixed(1)}</p>
                  <p className="text-gray-400 text-xs">نقطة</p>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

function FarmsView({ farms, onRefresh }: { farms: FarmWithDetails[]; onRefresh: () => void }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-white">المزارع التشغيلية</h3>
          <p className="text-gray-400 mt-1">جميع المزارع مع تفاصيل العمليات والأداء</p>
        </div>
        <button
          onClick={onRefresh}
          className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-bold hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg flex items-center gap-2"
        >
          <Activity className="w-5 h-5" />
          تحديث
        </button>
      </div>

      {farms.length === 0 ? (
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-12 text-center">
          <TreePine className="w-16 h-16 text-gray-500 mx-auto mb-4" />
          <p className="text-white text-lg font-bold mb-2">لا توجد مزارع نشطة</p>
          <p className="text-gray-400">قم بإضافة مزارع لبدء العمليات</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {farms.map((farm) => (
            <FarmCard key={farm.id} farm={farm} />
          ))}
        </div>
      )}
    </div>
  );
}

function FarmCard({ farm }: { farm: FarmWithDetails }) {
  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 hover:bg-white/10 transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg">
            <TreePine className="w-6 h-6 text-white" />
          </div>
          <div>
            <h4 className="text-white font-bold text-lg">{farm.name}</h4>
            <p className="text-gray-400 text-sm">{farm.location} - {farm.city}</p>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-bold ${
          farm.performance_score >= 80 ? 'bg-emerald-500/20 text-emerald-400' :
          farm.performance_score >= 60 ? 'bg-blue-500/20 text-blue-400' :
          farm.performance_score >= 40 ? 'bg-amber-500/20 text-amber-400' :
          'bg-red-500/20 text-red-400'
        }`}>
          {farm.performance_score.toFixed(1)}
        </div>
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">مدير المزارع:</span>
          <span className="text-white font-bold">{farm.director_name}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">مدير التشغيل:</span>
          <span className="text-white font-bold">{farm.manager_name}</span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white/5 rounded-lg p-3 text-center">
          <Activity className="w-5 h-5 text-blue-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-white">{farm.active_operations}</p>
          <p className="text-xs text-gray-400">عملية</p>
        </div>
        <div className="bg-white/5 rounded-lg p-3 text-center">
          <FileText className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-white">{farm.total_contracts}</p>
          <p className="text-xs text-gray-400">عقد</p>
        </div>
        <div className="bg-white/5 rounded-lg p-3 text-center">
          <Users className="w-5 h-5 text-purple-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-white">{farm.total_staff}</p>
          <p className="text-xs text-gray-400">موظف</p>
        </div>
        <div className="bg-white/5 rounded-lg p-3 text-center">
          <DollarSign className="w-5 h-5 text-amber-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-white">{farm.budget_utilization.toFixed(0)}%</p>
          <p className="text-xs text-gray-400">ميزانية</p>
        </div>
      </div>
    </div>
  );
}

function StaffView() {
  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-12 text-center">
      <Users className="w-16 h-16 text-gray-500 mx-auto mb-4" />
      <p className="text-white text-lg font-bold mb-2">إدارة الموظفين</p>
      <p className="text-gray-400">عرض وإدارة أداء الموظفين - قريباً</p>
    </div>
  );
}

function TasksView() {
  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-12 text-center">
      <CheckCircle className="w-16 h-16 text-gray-500 mx-auto mb-4" />
      <p className="text-white text-lg font-bold mb-2">إدارة المهام</p>
      <p className="text-gray-400">تعيين ومتابعة المهام - قريباً</p>
    </div>
  );
}

function PerformanceView({ stats }: { stats: OperationStats }) {
  return (
    <div className="space-y-6">
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-lg">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white">تقارير الأداء</h3>
            <p className="text-gray-400 text-sm">تحليل شامل لمؤشرات الأداء</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/5 rounded-xl p-6 text-center">
            <Target className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
            <p className="text-3xl font-bold text-white mb-1">{stats.avg_performance_score?.toFixed(1) || 0}</p>
            <p className="text-gray-400">معدل الأداء</p>
          </div>
          <div className="bg-white/5 rounded-xl p-6 text-center">
            <Award className="w-8 h-8 text-blue-400 mx-auto mb-3" />
            <p className="text-3xl font-bold text-white mb-1">{((stats.avg_quality_rating || 0) * 100).toFixed(1)}</p>
            <p className="text-gray-400">تقييم الجودة</p>
          </div>
          <div className="bg-white/5 rounded-xl p-6 text-center">
            <Zap className="w-8 h-8 text-amber-400 mx-auto mb-3" />
            <p className="text-3xl font-bold text-white mb-1">
              {((stats.completed_tasks / (stats.completed_tasks + stats.pending_tasks + stats.in_progress_tasks)) * 100).toFixed(0)}%
            </p>
            <p className="text-gray-400">نسبة الإنجاز</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function BudgetView({ stats }: { stats: OperationStats }) {
  const budgetRemaining = stats.total_budget_allocated - stats.total_budget_spent;

  return (
    <div className="space-y-6">
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
            <DollarSign className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white">إدارة الميزانية</h3>
            <p className="text-gray-400 text-sm">تفاصيل الميزانية والإنفاق</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-gradient-to-br from-blue-500/20 to-indigo-600/20 border border-blue-500/30 rounded-xl p-6">
            <p className="text-blue-400 text-sm mb-2">الميزانية المخصصة</p>
            <p className="text-3xl font-bold text-white">{stats.total_budget_allocated.toLocaleString()}</p>
            <p className="text-gray-400 text-sm mt-1">ريال</p>
          </div>
          <div className="bg-gradient-to-br from-emerald-500/20 to-green-600/20 border border-emerald-500/30 rounded-xl p-6">
            <p className="text-emerald-400 text-sm mb-2">المبلغ المنفق</p>
            <p className="text-3xl font-bold text-white">{stats.total_budget_spent.toLocaleString()}</p>
            <p className="text-gray-400 text-sm mt-1">ريال</p>
          </div>
          <div className="bg-gradient-to-br from-purple-500/20 to-pink-600/20 border border-purple-500/30 rounded-xl p-6">
            <p className="text-purple-400 text-sm mb-2">المتبقي</p>
            <p className="text-3xl font-bold text-white">{budgetRemaining.toLocaleString()}</p>
            <p className="text-gray-400 text-sm mt-1">ريال</p>
          </div>
        </div>

        <div className="bg-white/5 rounded-xl p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-white font-bold">نسبة الاستهلاك</span>
            <span className="text-2xl font-bold text-amber-400">{stats.budget_utilization.toFixed(1)}%</span>
          </div>
          <div className="h-4 bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                stats.budget_utilization > 90 ? 'bg-gradient-to-r from-red-500 to-pink-600' :
                stats.budget_utilization > 75 ? 'bg-gradient-to-r from-amber-500 to-orange-600' :
                'bg-gradient-to-r from-emerald-500 to-green-600'
              }`}
              style={{ width: `${Math.min(stats.budget_utilization, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  total,
  icon: Icon,
  color,
  suffix = '',
  subtitle = ''
}: {
  title: string;
  value: number;
  total: number;
  icon: any;
  color: string;
  suffix?: string;
  subtitle?: string;
}) {
  const percentage = total > 0 ? (value / total) * 100 : 0;

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 hover:bg-white/10 transition-all">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-gray-400 text-sm">{title}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-white">{value}{suffix}</p>
            {subtitle && <p className="text-gray-400 text-sm">/ {total} {subtitle}</p>}
          </div>
        </div>
      </div>
      {!suffix && (
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${color} transition-all`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}

function ProgressBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const percentage = (value / max) * 100;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-white text-sm">{label}</span>
        <span className="text-gray-400 text-sm">{value.toFixed(1)}%</span>
      </div>
      <div className="h-3 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} transition-all`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}

function TaskStatusCard({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="bg-white/5 rounded-xl p-4 text-center">
      <div className={`w-8 h-8 ${color} rounded-lg mx-auto mb-2`} />
      <p className="text-2xl font-bold text-white mb-1">{count}</p>
      <p className="text-gray-400 text-xs">{label}</p>
    </div>
  );
}
