import { Shield, Activity, TrendingUp, AlertTriangle, LogOut, FileText, Crown, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import SmartDashboardView from './SmartDashboardView';
import TeamManagementView from './TeamManagementView';
import CriticalAlertsView from './CriticalAlertsView';
import ReportsView from './ReportsView';
import { SessionTracker } from './SessionTracker';
import { adminSessionManager } from '../../utils/adminSessionManager';
import { PageGuard } from './PermissionGuard';

const ADMIN_GATES = {
  auctions: '/admin/auctions',
  b2f: '/admin/b2f',
  settings: '/admin/settings',
} as const;

type TabType = 'overview' | 'dashboard' | 'team' | 'alerts' | 'reports';

export function HQDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [platformRole, setPlatformRole] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeAuctions: 0,
    totalRevenue: 0,
    pendingActions: 0,
  });

  useEffect(() => {
    checkAccess();
    loadStats();
  }, []);

  const checkAccess = () => {
    const session = adminSessionManager.getSession();
    if (!session) {
      navigate('/admin/access', { replace: true });
      return;
    }
    setPlatformRole(session.role);
  };

  const loadStats = async () => {
    try {
      const [usersResult, auctionsResult] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('auctions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      ]);

      setStats({
        totalUsers: usersResult.count || 0,
        activeAuctions: auctionsResult.count || 0,
        totalRevenue: 0,
        pendingActions: 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const goToGate = (key: keyof typeof ADMIN_GATES) => {
    const path = ADMIN_GATES[key];
    if (!path) {
      navigate('/hq', { replace: true });
      return;
    }
    navigate(path, { replace: true });
  };

  const handleLogout = () => {
    if (confirm('هل أنت متأكد من تسجيل الخروج؟')) {
      adminSessionManager.destroySession();
      navigate('/admin/access', { replace: true });
    }
  };

  const dashboardCards = [
    {
      title: 'إدارة المزادات (B2B)',
      icon: Activity,
      color: 'from-blue-500 to-blue-600',
      count: stats.activeAuctions,
      label: 'مزاد نشط',
      action: () => goToGate('auctions'),
    },
    {
      title: 'إدارة استثمار المزارع (B2F)',
      icon: TrendingUp,
      color: 'from-emerald-500 to-emerald-600',
      count: 0,
      label: 'عمليات نشطة',
      action: () => goToGate('b2f'),
    },
  ];

  return (
    <PageGuard platformRole={platformRole} pageKey="hq">
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" dir="rtl">
        <SessionTracker />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
                  <Crown className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white">
                    لوحة الإدارة العليا
                  </h1>
                  <p className="text-gray-400 text-sm mt-1">
                    {platformRole === 'platform_owner' ? 'مالك المنصة' : platformRole === 'super_admin' ? 'مدير عام' : 'إدارة عليا'} - صلاحيات كاملة
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => navigate('/')}
                className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all border border-slate-600"
              >
                الصفحة الرئيسية
              </button>
              <button
                onClick={handleLogout}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all flex items-center gap-2"
              >
                <LogOut className="w-5 h-5" />
                خروج
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 mb-8 overflow-hidden">
          <div className="flex gap-2 overflow-x-auto p-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex-1 min-w-[150px] px-6 py-4 font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
                activeTab === 'overview'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg'
                  : 'text-gray-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Shield className="w-5 h-5" />
              نظرة عامة
            </button>
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex-1 min-w-[150px] px-6 py-4 font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
                activeTab === 'dashboard'
                  ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg'
                  : 'text-gray-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Activity className="w-5 h-5" />
              لوحة القيادة
            </button>
            <button
              onClick={() => setActiveTab('team')}
              className={`flex-1 min-w-[150px] px-6 py-4 font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
                activeTab === 'team'
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg'
                  : 'text-gray-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Users className="w-5 h-5" />
              إدارة الفريق والصلاحيات
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`flex-1 min-w-[150px] px-6 py-4 font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
                activeTab === 'reports'
                  ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-lg'
                  : 'text-gray-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <FileText className="w-5 h-5" />
              تقارير التوثيق
            </button>
            <button
              onClick={() => setActiveTab('alerts')}
              className={`flex-1 min-w-[150px] px-6 py-4 font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
                activeTab === 'alerts'
                  ? 'bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-lg'
                  : 'text-gray-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
              التنبيهات
            </button>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'overview' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {dashboardCards.map((card, index) => (
                <button
                  key={index}
                  onClick={card.action}
                  className="group relative overflow-hidden rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-6 hover:bg-white/10 transition-all duration-300 hover:scale-105"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${card.color} opacity-0 group-hover:opacity-10 transition-opacity`}></div>

                  <div className="relative">
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center mb-4 shadow-lg`}>
                      <card.icon className="w-7 h-7 text-white" />
                    </div>

                    <h3 className="text-white font-bold text-lg mb-2">{card.title}</h3>

                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-white">{card.count}</span>
                      <span className="text-gray-400 text-sm">{card.label}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Activity className="w-6 h-6 text-emerald-400" />
                  <h2 className="text-xl font-bold text-white">نشاط النظام</h2>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                      <span className="text-white">النظام يعمل بكفاءة عالية</span>
                    </div>
                    <span className="text-emerald-400 text-sm font-bold">100%</span>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                      <span className="text-white">قاعدة البيانات</span>
                    </div>
                    <span className="text-blue-400 text-sm font-bold">متصلة</span>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                      <span className="text-white">النسخ الاحتياطي</span>
                    </div>
                    <span className="text-purple-400 text-sm font-bold">نشط</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <AlertTriangle className="w-6 h-6 text-orange-400" />
                  <h2 className="text-xl font-bold text-white">تنبيهات النظام</h2>
                </div>

                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                    <Shield className="w-8 h-8 text-emerald-400" />
                  </div>
                  <p className="text-gray-400">لا توجد تنبيهات في الوقت الحالي</p>
                  <p className="text-gray-500 text-sm mt-2">جميع الأنظمة تعمل بشكل طبيعي</p>
                </div>
              </div>
            </div>

            <div className="mt-8 p-6 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-teal-600/10 border border-emerald-500/20">
              <div className="flex items-center gap-3">
                <Crown className="w-6 h-6 text-emerald-400" />
                <div>
                  <p className="text-white font-bold">مرحباً بك في لوحة الإدارة العليا</p>
                  <p className="text-gray-400 text-sm mt-1">
                    لديك صلاحيات كاملة لإدارة جميع أقسام المنصة
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'dashboard' && (
          <SmartDashboardView
            onNavigateToB2F={() => navigate('/admin/b2f')}
            onNavigateToAuctions={() => navigate('/admin/auctions')}
          />
        )}

        {activeTab === 'team' && <TeamManagementView />}

        {activeTab === 'reports' && <ReportsView />}

        {activeTab === 'alerts' && <CriticalAlertsView />}
      </div>
    </div>
    </PageGuard>
  );
}
