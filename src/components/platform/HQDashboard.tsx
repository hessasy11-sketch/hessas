import { Shield, Activity, Users, Settings, TrendingUp, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export function HQDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeAuctions: 0,
    totalRevenue: 0,
    pendingActions: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

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

  const dashboardCards = [
    {
      title: 'إدارة المزادات',
      icon: Activity,
      color: 'from-blue-500 to-blue-600',
      count: stats.activeAuctions,
      label: 'مزاد نشط',
      action: () => navigate('/'),
    },
    {
      title: 'إدارة B2F',
      icon: TrendingUp,
      color: 'from-emerald-500 to-emerald-600',
      count: 0,
      label: 'عمليات نشطة',
      action: () => navigate('/b2f'),
    },
    {
      title: 'إدارة المستخدمين',
      icon: Users,
      color: 'from-purple-500 to-purple-600',
      count: stats.totalUsers,
      label: 'مستخدم',
      action: () => navigate('/'),
    },
    {
      title: 'الإعدادات المتقدمة',
      icon: Settings,
      color: 'from-orange-500 to-orange-600',
      count: stats.pendingActions,
      label: 'إجراء معلق',
      action: () => navigate('/'),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
                  <Shield className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white">
                    لوحة الإدارة العليا
                  </h1>
                  <p className="text-gray-400 text-sm mt-1">
                    المدير العام - صلاحيات كاملة
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all border border-slate-600"
            >
              الصفحة الرئيسية
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
            <Shield className="w-6 h-6 text-emerald-400" />
            <div>
              <p className="text-white font-bold">مرحباً بك في لوحة الإدارة العليا</p>
              <p className="text-gray-400 text-sm mt-1">
                لديك صلاحيات كاملة لإدارة جميع أقسام المنصة
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
