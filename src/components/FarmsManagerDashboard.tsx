import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  TreePine,
  Users,
  DollarSign,
  TrendingUp,
  Activity,
  Plus,
  Settings,
  LogOut,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Leaf,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DashboardStats {
  totalFarms: number;
  activeFarms: number;
  totalInvestors: number;
  totalRevenue: number;
  pendingRequests: number;
  activeContracts: number;
  totalTrees: number;
}

export default function FarmsManagerDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [managerName, setManagerName] = useState('مدير المزارع');

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);

      const session = localStorage.getItem('simplified_session');
      if (!session) {
        navigate('/login');
        return;
      }

      const sessionData = JSON.parse(session);
      if (sessionData.role !== 'farms_manager') {
        navigate('/login');
        return;
      }

      setManagerName(sessionData.staffName || 'مدير المزارع');

      // Get all stats
      const { data: farmsData } = await supabase
        .from('b2f_farms')
        .select('id, operational_status');

      const { data: investorsData } = await supabase
        .from('b2f_investor_accounts')
        .select('id');

      const { data: requestsData } = await supabase
        .from('b2f_sales_requests')
        .select('id, status');

      const { data: contractsData } = await supabase
        .from('b2f_contracts')
        .select('id, operation_status');

      const { data: operationsData } = await supabase
        .from('farm_operations')
        .select('trees_count');

      const totalFarms = farmsData?.length || 0;
      const activeFarms = farmsData?.filter(f => f.operational_status === 'operational').length || 0;
      const totalInvestors = investorsData?.length || 0;
      const pendingRequests = requestsData?.filter(r => r.status === 'pending').length || 0;
      const activeContracts = contractsData?.filter(c => c.operation_status === 'operational').length || 0;
      const totalTrees = operationsData?.reduce((sum, op) => sum + (op.trees_count || 0), 0) || 0;

      setStats({
        totalFarms,
        activeFarms,
        totalInvestors,
        totalRevenue: 0, // يمكن حسابها من الطلبات المكتملة
        pendingRequests,
        activeContracts,
        totalTrees,
      });

    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('simplified_session');
    navigate('/login');
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

  const statCards = [
    {
      title: 'إجمالي المزارع',
      value: stats?.totalFarms || 0,
      subValue: `${stats?.activeFarms || 0} تشغيلية`,
      icon: TreePine,
      color: 'from-green-500 to-emerald-600',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
    },
    {
      title: 'المستثمرين',
      value: stats?.totalInvestors || 0,
      subValue: 'مستثمر نشط',
      icon: Users,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
    },
    {
      title: 'العقود النشطة',
      value: stats?.activeContracts || 0,
      subValue: 'عقد قيد التنفيذ',
      icon: CheckCircle,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
    },
    {
      title: 'طلبات معلقة',
      value: stats?.pendingRequests || 0,
      subValue: 'تحتاج مراجعة',
      icon: Clock,
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600',
    },
    {
      title: 'إجمالي الأشجار',
      value: stats?.totalTrees || 0,
      subValue: 'شجرة',
      icon: Leaf,
      color: 'from-teal-500 to-teal-600',
      bgColor: 'bg-teal-50',
      textColor: 'text-teal-600',
    },
    {
      title: 'الإيرادات',
      value: '0',
      subValue: 'ريال',
      icon: DollarSign,
      color: 'from-indigo-500 to-indigo-600',
      bgColor: 'bg-indigo-50',
      textColor: 'text-indigo-600',
    },
  ];

  const quickActions = [
    {
      title: 'إدارة المزارع',
      description: 'عرض وإدارة جميع المزارع',
      icon: TreePine,
      color: 'from-green-500 to-green-600',
      route: '/admin/b2f',
    },
    {
      title: 'طلبات الاستثمار',
      description: 'مراجعة واعتماد الطلبات',
      icon: TrendingUp,
      color: 'from-blue-500 to-blue-600',
      route: '/admin/b2f?tab=sales',
    },
    {
      title: 'المستثمرين',
      description: 'إدارة حسابات المستثمرين',
      icon: Users,
      color: 'from-purple-500 to-purple-600',
      route: '/admin/b2f?tab=investors',
    },
    {
      title: 'العقود',
      description: 'متابعة العقود والاتفاقيات',
      icon: CheckCircle,
      color: 'from-orange-500 to-orange-600',
      route: '/admin/b2f?tab=contracts',
    },
    {
      title: 'التقارير المالية',
      description: 'التقارير والإحصائيات المالية',
      icon: DollarSign,
      color: 'from-indigo-500 to-indigo-600',
      route: '/admin/b2f?tab=finance2',
    },
    {
      title: 'الإعدادات',
      description: 'إعدادات النظام العامة',
      icon: Settings,
      color: 'from-gray-500 to-gray-600',
      route: '/admin/b2f?tab=settings',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 via-green-700 to-emerald-800 text-white">
        <div className="max-w-[1600px] mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border-2 border-white/20">
                <LayoutDashboard className="w-10 h-10 text-green-200" />
              </div>
              <div>
                <h1 className="text-4xl font-bold mb-2">لوحة تحكم مدير المزارع</h1>
                <p className="text-green-100 text-lg">مرحباً {managerName}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={loadDashboard}
                className="flex items-center gap-2 px-5 py-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all backdrop-blur-sm"
              >
                <RefreshCw className="w-5 h-5" />
                <span className="font-medium">تحديث</span>
              </button>

              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-5 py-3 bg-red-500/20 hover:bg-red-500/30 rounded-xl transition-all backdrop-blur-sm border border-red-300/30"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">تسجيل الخروج</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {statCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <div
                key={index}
                className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-14 h-14 ${card.bgColor} rounded-xl flex items-center justify-center`}>
                    <Icon className={`w-7 h-7 ${card.textColor}`} />
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-600 mb-1">{card.title}</p>
                    <p className="text-3xl font-bold text-gray-900">{card.value}</p>
                    <p className="text-xs text-gray-500 mt-1">{card.subValue}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Alerts */}
        {stats && stats.pendingRequests > 0 && (
          <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-6 mb-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-orange-900 mb-2">تنبيه: طلبات معلقة</h3>
                <p className="text-orange-800 mb-4">
                  لديك {stats.pendingRequests} طلب استثمار معلق يحتاج إلى مراجعة واعتماد
                </p>
                <button
                  onClick={() => navigate('/admin/b2f?tab=sales')}
                  className="px-6 py-2 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-all"
                >
                  مراجعة الطلبات
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Activity className="w-6 h-6 text-green-600" />
            الإجراءات السريعة
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <button
                  key={index}
                  onClick={() => navigate(action.route)}
                  className={`bg-gradient-to-br ${action.color} text-white rounded-xl p-6 hover:shadow-lg transition-all text-right group`}
                >
                  <Icon className="w-8 h-8 mb-3 opacity-90" />
                  <h3 className="font-bold text-lg mb-1">{action.title}</h3>
                  <p className="text-sm opacity-90">{action.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Info */}
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-8 text-white text-center">
          <LayoutDashboard className="w-16 h-16 mx-auto mb-4 opacity-90" />
          <h3 className="text-2xl font-bold mb-2">لوحة التحكم الرئيسية</h3>
          <p className="text-green-100 text-lg">
            أنت تدير جميع المزارع والعمليات في المنصة
          </p>
        </div>
      </div>
    </div>
  );
}
