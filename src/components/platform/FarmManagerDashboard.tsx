import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  Calendar,
  Bell,
  Settings,
  ChevronRight,
  Activity,
  Leaf,
  Package,
  Wrench,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Target,
  Award,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import BackToGatewayButton from './BackToGatewayButton';

interface FarmManagerStats {
  farmId: string;
  farmName: string;
  farmCode: string;
  operationalStatus: string;
  investmentType: string;

  // Team Stats
  teamSize: number;
  activeMembers: number;

  // Task Stats
  totalTasks: number;
  openTasks: number;
  completedToday: number;
  urgentTasks: number;
  overdueTasks: number;

  // Financial Stats
  monthlyBudget: number;
  spentThisMonth: number;
  pendingExpenses: number;
  approvalsPending: number;

  // Production Stats
  treesCount: number;
  healthyTrees: number;
  maintenanceNeeded: number;

  // Alerts
  criticalAlerts: number;
  warnings: number;
}

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: any;
  color: string;
  route: string;
  badge?: number;
}

interface RecentActivity {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  user?: string;
  status?: string;
}

export default function FarmManagerDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<FarmManagerStats | null>(null);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [managerName, setManagerName] = useState('مدير المزرعة');

  useEffect(() => {
    loadDashboard();
    loadActivities();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);

      const savedSession = localStorage.getItem('staff_session');
      if (!savedSession) {
        throw new Error('لا توجد جلسة نشطة');
      }

      const session = JSON.parse(savedSession);
      setManagerName(session.staffName || 'مدير المزرعة');

      const staffId = session.staffId;

      // Get farm manager's farm using farm_team table
      const { data: farmData, error: farmError } = await supabase
        .from('farm_team')
        .select(`
          farm_id,
          b2f_farms!inner (
            id,
            name,
            code,
            operational_status,
            investment_type
          )
        `)
        .eq('user_id', staffId)
        .eq('role', 'farm_manager')
        .eq('is_active', true)
        .single();

      if (farmError) throw farmError;

      const farmId = farmData.farm_id;
      const farm = farmData.b2f_farms;

      // Get team stats
      const { data: teamData } = await supabase
        .from('farm_team_members')
        .select('id, is_active')
        .eq('farm_id', farmId);

      // Get task stats
      const { data: tasksData } = await supabase
        .from('farm_tasks')
        .select('id, status, priority, due_date')
        .eq('farm_id', farmId);

      // Get financial stats
      const { data: expensesData } = await supabase
        .from('farm_expenses')
        .select('amount, approval_status, created_at')
        .eq('farm_id', farmId);

      // Get farm operations for tree stats
      const { data: operationsData } = await supabase
        .from('farm_operations')
        .select('trees_count')
        .eq('farm_id', farmId);

      // Get critical alerts
      const { data: alertsData } = await supabase
        .from('critical_alerts')
        .select('id, severity')
        .eq('section', 'B2F')
        .eq('is_resolved', false);

      // Calculate stats
      const teamSize = teamData?.length || 0;
      const activeMembers = teamData?.filter(m => m.is_active).length || 0;

      const totalTasks = tasksData?.length || 0;
      const openTasks = tasksData?.filter(t => t.status === 'pending' || t.status === 'in_progress').length || 0;
      const today = new Date().toISOString().split('T')[0];
      const completedToday = tasksData?.filter(t =>
        t.status === 'completed' &&
        t.due_date?.startsWith(today)
      ).length || 0;
      const urgentTasks = tasksData?.filter(t => t.priority === 'high' && t.status !== 'completed').length || 0;
      const overdueTasks = tasksData?.filter(t =>
        t.due_date &&
        new Date(t.due_date) < new Date() &&
        t.status !== 'completed'
      ).length || 0;

      const thisMonth = new Date().toISOString().slice(0, 7);
      const monthlyExpenses = expensesData?.filter(e =>
        e.created_at?.startsWith(thisMonth)
      ) || [];
      const spentThisMonth = monthlyExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      const pendingExpenses = expensesData?.filter(e => e.approval_status === 'pending').length || 0;

      const treesCount = operationsData?.reduce((sum, op) => sum + (op.trees_count || 0), 0) || 0;

      const criticalAlerts = alertsData?.filter(a => a.severity === 'critical').length || 0;
      const warnings = alertsData?.filter(a => a.severity === 'warning').length || 0;

      setStats({
        farmId,
        farmName: farm.name,
        farmCode: farm.code,
        operationalStatus: farm.operational_status,
        investmentType: farm.investment_type,
        teamSize,
        activeMembers,
        totalTasks,
        openTasks,
        completedToday,
        urgentTasks,
        overdueTasks,
        monthlyBudget: 50000,
        spentThisMonth,
        pendingExpenses,
        approvalsPending: pendingExpenses,
        treesCount,
        healthyTrees: Math.floor(treesCount * 0.95),
        maintenanceNeeded: Math.floor(treesCount * 0.05),
        criticalAlerts,
        warnings,
      });

    } catch (err: any) {
      console.error('Error loading dashboard:', err);
      setError(err.message || 'فشل تحميل لوحة التحكم');
    } finally {
      setLoading(false);
    }
  };

  const loadActivities = async () => {
    try {
      const savedSession = localStorage.getItem('staff_session');
      if (!savedSession) return;

      const session = JSON.parse(savedSession);
      const staffId = session.staffId;

      const { data: farmData } = await supabase
        .from('farm_team_members')
        .select('farm_id')
        .eq('staff_id', staffId)
        .eq('role', 'farm_manager')
        .single();

      if (!farmData) return;

      // Get recent tasks
      const { data: recentTasks } = await supabase
        .from('farm_tasks')
        .select('id, title, status, created_at, assigned_to_name')
        .eq('farm_id', farmData.farm_id)
        .order('created_at', { ascending: false })
        .limit(5);

      const mappedActivities: RecentActivity[] = (recentTasks || []).map(task => ({
        id: task.id,
        type: 'task',
        title: task.title,
        description: `تم تعيين المهمة إلى ${task.assigned_to_name}`,
        timestamp: task.created_at,
        status: task.status,
      }));

      setActivities(mappedActivities);
    } catch (err) {
      console.error('Error loading activities:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">جاري تحميل لوحة التحكم...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border-2 border-red-200 p-8 max-w-md text-center">
          <AlertTriangle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">حدث خطأ</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={loadDashboard}
            className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl font-bold hover:shadow-lg transition-all"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const budgetPercentage = (stats.spentThisMonth / stats.monthlyBudget) * 100;
  const tasksCompletionRate = stats.totalTasks > 0 ? (stats.completedToday / stats.totalTasks) * 100 : 0;

  const quickActions: QuickAction[] = [
    {
      id: 'tasks',
      title: 'إدارة المهام',
      description: 'عرض وإدارة المهام اليومية',
      icon: CheckSquare,
      color: 'blue',
      route: `/admin/farm/${stats.farmId}/tasks`,
      badge: stats.openTasks,
    },
    {
      id: 'team',
      title: 'إدارة الفريق',
      description: 'إدارة أعضاء الفريق والصلاحيات',
      icon: Users,
      color: 'purple',
      route: `/admin/farm/${stats.farmId}/team`,
      badge: stats.teamSize,
    },
    {
      id: 'expenses',
      title: 'الموافقات المالية',
      description: 'مراجعة المصروفات المعلقة',
      icon: DollarSign,
      color: 'green',
      route: `/admin/farm/${stats.farmId}/expenses`,
      badge: stats.pendingExpenses,
    },
    {
      id: 'maintenance',
      title: 'الصيانة',
      description: 'متابعة أعمال الصيانة',
      icon: Wrench,
      color: 'orange',
      route: `/admin/farm/${stats.farmId}/maintenance`,
      badge: stats.maintenanceNeeded,
    },
    {
      id: 'reports',
      title: 'التقارير',
      description: 'عرض التقارير والإحصائيات',
      icon: FileText,
      color: 'indigo',
      route: `/admin/farm/${stats.farmId}/reports`,
    },
    {
      id: 'settings',
      title: 'إعدادات المزرعة',
      description: 'تحديث معلومات المزرعة',
      icon: Settings,
      color: 'gray',
      route: `/admin/farm/${stats.farmId}/settings`,
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
        return 'bg-green-100 text-green-800';
      case 'preparation':
        return 'bg-yellow-100 text-yellow-800';
      case 'maintenance':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'operational':
        return 'تشغيلية';
      case 'preparation':
        return 'قيد التجهيز';
      case 'maintenance':
        return 'صيانة';
      default:
        return status;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `منذ ${days} يوم`;
    if (hours > 0) return `منذ ${hours} ساعة`;
    if (minutes > 0) return `منذ ${minutes} دقيقة`;
    return 'الآن';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-slate-50">
      <BackToGatewayButton />

      <div className="bg-gradient-to-r from-green-600 via-green-700 to-green-800 text-white">
        <div className="max-w-[1600px] mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border-2 border-white/20">
                <LayoutDashboard className="w-10 h-10 text-green-200" />
              </div>
              <div>
                <h1 className="text-4xl font-bold mb-2">لوحة تحكم مدير المزرعة</h1>
                <p className="text-green-100 text-lg">مرحباً {managerName}</p>
              </div>
            </div>

            <button
              onClick={loadDashboard}
              className="flex items-center gap-2 px-5 py-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all backdrop-blur-sm"
            >
              <RefreshCw className="w-5 h-5" />
              <span className="font-medium">تحديث</span>
            </button>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold mb-1">{stats.farmName}</h2>
                <p className="text-green-100">الرمز: {stats.farmCode}</p>
              </div>
              <span className={`px-4 py-2 rounded-xl text-sm font-bold ${getStatusColor(stats.operationalStatus)} bg-white`}>
                {getStatusText(stats.operationalStatus)}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <CheckSquare className="w-6 h-6 text-blue-200" />
                  </div>
                  <div>
                    <p className="text-green-100 text-sm">المهام المفتوحة</p>
                    <p className="text-3xl font-bold">{stats.openTasks}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-purple-200" />
                  </div>
                  <div>
                    <p className="text-green-100 text-sm">أعضاء الفريق</p>
                    <p className="text-3xl font-bold">{stats.activeMembers}/{stats.teamSize}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-orange-200" />
                  </div>
                  <div>
                    <p className="text-green-100 text-sm">تنبيهات عاجلة</p>
                    <p className="text-3xl font-bold">{stats.criticalAlerts + stats.urgentTasks}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <Leaf className="w-6 h-6 text-green-200" />
                  </div>
                  <div>
                    <p className="text-green-100 text-sm">إجمالي الأشجار</p>
                    <p className="text-3xl font-bold">{stats.treesCount}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Activity className="w-6 h-6 text-green-600" />
                نظرة سريعة على الأداء
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600">المهام المنجزة اليوم</span>
                      <span className="text-sm font-bold text-green-600">{stats.completedToday} من {stats.totalTasks}</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all"
                        style={{ width: `${tasksCompletionRate}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600">الميزانية الشهرية</span>
                      <span className="text-sm font-bold text-blue-600">
                        {stats.spentThisMonth.toLocaleString()} من {stats.monthlyBudget.toLocaleString()} ريال
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          budgetPercentage > 90
                            ? 'bg-gradient-to-r from-red-500 to-red-600'
                            : budgetPercentage > 70
                            ? 'bg-gradient-to-r from-yellow-500 to-yellow-600'
                            : 'bg-gradient-to-r from-blue-500 to-blue-600'
                        }`}
                        style={{ width: `${Math.min(budgetPercentage, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600">صحة الأشجار</span>
                      <span className="text-sm font-bold text-green-600">
                        {stats.healthyTrees} من {stats.treesCount}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all"
                        style={{ width: `${(stats.healthyTrees / stats.treesCount) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <Clock className="w-5 h-5 text-red-600" />
                      <span className="text-sm font-medium text-red-900">مهام متأخرة</span>
                    </div>
                    <p className="text-3xl font-bold text-red-600">{stats.overdueTasks}</p>
                    {stats.overdueTasks > 0 && (
                      <button
                        onClick={() => navigate(`/admin/farm/${stats.farmId}/tasks`)}
                        className="text-xs text-red-600 hover:text-red-800 font-medium mt-2"
                      >
                        راجع الآن →
                      </button>
                    )}
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <Target className="w-5 h-5 text-yellow-600" />
                      <span className="text-sm font-medium text-yellow-900">مهام عاجلة</span>
                    </div>
                    <p className="text-3xl font-bold text-yellow-600">{stats.urgentTasks}</p>
                    {stats.urgentTasks > 0 && (
                      <button
                        onClick={() => navigate(`/admin/farm/${stats.farmId}/tasks`)}
                        className="text-xs text-yellow-600 hover:text-yellow-800 font-medium mt-2"
                      >
                        راجع الآن →
                      </button>
                    )}
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <DollarSign className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">موافقات معلقة</span>
                    </div>
                    <p className="text-3xl font-bold text-blue-600">{stats.approvalsPending}</p>
                    {stats.approvalsPending > 0 && (
                      <button
                        onClick={() => navigate(`/admin/farm/${stats.farmId}/expenses`)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium mt-2"
                      >
                        راجع الآن →
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Target className="w-6 h-6 text-green-600" />
                الإجراءات السريعة
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  const colorClasses = {
                    blue: 'from-blue-500 to-blue-600 hover:shadow-blue-200',
                    purple: 'from-purple-500 to-purple-600 hover:shadow-purple-200',
                    green: 'from-green-500 to-green-600 hover:shadow-green-200',
                    orange: 'from-orange-500 to-orange-600 hover:shadow-orange-200',
                    indigo: 'from-indigo-500 to-indigo-600 hover:shadow-indigo-200',
                    gray: 'from-gray-500 to-gray-600 hover:shadow-gray-200',
                  }[action.color];

                  return (
                    <button
                      key={action.id}
                      onClick={() => navigate(action.route)}
                      className={`relative bg-gradient-to-br ${colorClasses} text-white rounded-xl p-5 hover:shadow-lg transition-all group text-right`}
                    >
                      {action.badge !== undefined && action.badge > 0 && (
                        <span className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-sm font-bold shadow-lg">
                          {action.badge}
                        </span>
                      )}

                      <Icon className="w-8 h-8 mb-3 opacity-90" />
                      <h4 className="font-bold text-lg mb-1">{action.title}</h4>
                      <p className="text-sm opacity-90 mb-3">{action.description}</p>

                      <div className="flex items-center gap-1 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        <span>افتح</span>
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {(stats.criticalAlerts > 0 || stats.warnings > 0) && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <Bell className="w-6 h-6 text-red-600" />
                  التنبيهات
                </h3>

                <div className="space-y-3">
                  {stats.criticalAlerts > 0 && (
                    <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center flex-shrink-0">
                          <AlertTriangle className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-red-900 mb-1">تنبيهات حرجة</h4>
                          <p className="text-sm text-red-700 mb-3">
                            {stats.criticalAlerts} تنبيه يتطلب اهتماماً فورياً
                          </p>
                          <button className="text-xs text-red-600 hover:text-red-800 font-bold">
                            عرض التفاصيل →
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {stats.warnings > 0 && (
                    <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-yellow-500 rounded-lg flex items-center justify-center flex-shrink-0">
                          <AlertTriangle className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-yellow-900 mb-1">تحذيرات</h4>
                          <p className="text-sm text-yellow-700 mb-3">
                            {stats.warnings} تحذير يتطلب المتابعة
                          </p>
                          <button className="text-xs text-yellow-600 hover:text-yellow-800 font-bold">
                            عرض التفاصيل →
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Clock className="w-6 h-6 text-blue-600" />
                النشاط الأخير
              </h3>

              <div className="space-y-4">
                {activities.length === 0 ? (
                  <div className="text-center py-8">
                    <Activity className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">لا توجد أنشطة حديثة</p>
                  </div>
                ) : (
                  activities.map((activity) => (
                    <div key={activity.id} className="border-r-4 border-green-500 bg-gray-50 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-bold text-gray-900">{activity.title}</h4>
                        <span className="text-xs text-gray-500">{formatTime(activity.timestamp)}</span>
                      </div>
                      <p className="text-sm text-gray-600">{activity.description}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white">
              <Award className="w-12 h-12 mb-4 opacity-90" />
              <h3 className="text-xl font-bold mb-2">أداء ممتاز!</h3>
              <p className="text-green-100 mb-4">
                المزرعة تحت إدارتك تعمل بكفاءة عالية
              </p>
              <button
                onClick={() => navigate(`/admin/farm/${stats.farmId}/reports`)}
                className="px-4 py-2 bg-white text-green-600 rounded-lg font-bold hover:shadow-lg transition-all"
              >
                عرض التقرير الشامل
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
