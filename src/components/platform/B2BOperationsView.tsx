import { useNavigate } from 'react-router-dom';
import { ArrowRight, Building2, Gavel, DollarSign, TrendingUp, AlertCircle, Users } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface B2BStats {
  active_auctions: number;
  pending_approvals: number;
  total_revenue: number;
  active_users: number;
}

export default function B2BOperationsView() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<B2BStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const { data } = await supabase.rpc('get_executive_pulse_b2b');
      setStats({
        active_auctions: data?.active_auctions || 0,
        pending_approvals: data?.pending_approvals || 0,
        total_revenue: data?.total_bids || 0,
        active_users: data?.active_bidders || 0
      });
    } catch (error) {
      console.error('Error loading B2B stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      label: 'المزادات النشطة',
      value: stats?.active_auctions || 0,
      icon: Gavel,
      color: 'blue',
      bgColor: 'bg-blue-500',
      lightBg: 'bg-blue-50',
      textColor: 'text-blue-700'
    },
    {
      label: 'الموافقات المعلقة',
      value: stats?.pending_approvals || 0,
      icon: AlertCircle,
      color: 'amber',
      bgColor: 'bg-amber-500',
      lightBg: 'bg-amber-50',
      textColor: 'text-amber-700'
    },
    {
      label: 'المستخدمون النشطون',
      value: stats?.active_users || 0,
      icon: Users,
      color: 'purple',
      bgColor: 'bg-violet-500',
      lightBg: 'bg-violet-50',
      textColor: 'text-violet-700'
    },
    {
      label: 'إجمالي العروض',
      value: stats?.total_revenue || 0,
      icon: TrendingUp,
      color: 'green',
      bgColor: 'bg-green-500',
      lightBg: 'bg-green-50',
      textColor: 'text-green-700'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-slate-700 text-white shadow-2xl">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/admin/operations-room')}
                className="w-12 h-12 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all"
              >
                <ArrowRight className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-3">
                  <Building2 className="w-8 h-8" />
                  غرفة عمليات B2B
                </h1>
                <p className="text-blue-100 text-sm mt-1">Business to Business - نظام المزادات التجارية</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-blue-100">آخر تحديث</div>
              <div className="text-lg font-semibold">{new Date().toLocaleTimeString('ar-SA')}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          {statCards.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div
                key={idx}
                className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-lg transition-all"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-14 h-14 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-slate-900 mb-1">
                  {loading ? '...' : stat.value}
                </div>
                <div className="text-sm text-slate-600">{stat.label}</div>
              </div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          <button
            onClick={() => navigate('/admin/auctions')}
            className="group bg-white rounded-2xl p-6 border border-slate-200 hover:border-blue-500 hover:shadow-xl transition-all text-right"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 group-hover:bg-blue-500 flex items-center justify-center transition-all">
                <Gavel className="w-6 h-6 text-blue-600 group-hover:text-white" />
              </div>
              <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">إدارة المزادات</h3>
            <p className="text-sm text-slate-600">عرض ومتابعة جميع المزادات</p>
          </button>

          <button className="group bg-white rounded-2xl p-6 border border-slate-200 hover:border-amber-500 hover:shadow-xl transition-all text-right">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-amber-100 group-hover:bg-amber-500 flex items-center justify-center transition-all">
                <AlertCircle className="w-6 h-6 text-amber-600 group-hover:text-white" />
              </div>
              <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-amber-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">الموافقات</h3>
            <p className="text-sm text-slate-600">مراجعة واعتماد المزادات</p>
          </button>

          <button className="group bg-white rounded-2xl p-6 border border-slate-200 hover:border-violet-500 hover:shadow-xl transition-all text-right">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-violet-100 group-hover:bg-violet-500 flex items-center justify-center transition-all">
                <Users className="w-6 h-6 text-violet-600 group-hover:text-white" />
              </div>
              <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-violet-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">المستخدمون</h3>
            <p className="text-sm text-slate-600">إدارة الحسابات والصلاحيات</p>
          </button>
        </div>

        {/* Alert */}
        {stats && stats.pending_approvals > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h4 className="font-bold text-amber-900 mb-1">تنبيه: موافقات معلقة</h4>
              <p className="text-sm text-amber-700">
                هناك {stats.pending_approvals} مزادات تحتاج للمراجعة والموافقة
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
