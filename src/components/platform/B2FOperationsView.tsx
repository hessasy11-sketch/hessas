import { useNavigate } from 'react-router-dom';
import { ArrowRight, Leaf, Users, DollarSign, Package, TrendingUp, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface B2FStats {
  active_bookings: number;
  pending_payments: number;
  total_revenue: number;
  farms_count: number;
}

export default function B2FOperationsView() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<B2FStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const { data } = await supabase.rpc('get_executive_pulse_b2f');
      setStats({
        active_bookings: data?.bookings_today || 0,
        pending_payments: data?.pending_approvals || 0,
        total_revenue: data?.revenue_today || 0,
        farms_count: data?.active_farms || 0
      });
    } catch (error) {
      console.error('Error loading B2F stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      label: 'الحجوزات النشطة',
      value: stats?.active_bookings || 0,
      icon: Package,
      color: 'emerald',
      bgColor: 'bg-emerald-500',
      lightBg: 'bg-emerald-50',
      textColor: 'text-emerald-700'
    },
    {
      label: 'المدفوعات المعلقة',
      value: stats?.pending_payments || 0,
      icon: DollarSign,
      color: 'amber',
      bgColor: 'bg-amber-500',
      lightBg: 'bg-amber-50',
      textColor: 'text-amber-700'
    },
    {
      label: 'المزارع النشطة',
      value: stats?.farms_count || 0,
      icon: Leaf,
      color: 'green',
      bgColor: 'bg-green-500',
      lightBg: 'bg-green-50',
      textColor: 'text-green-700'
    },
    {
      label: 'الإيرادات اليوم',
      value: `${stats?.total_revenue || 0} ر.س`,
      icon: TrendingUp,
      color: 'blue',
      bgColor: 'bg-blue-500',
      lightBg: 'bg-blue-50',
      textColor: 'text-blue-700'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-green-50" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-2xl">
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
                  <Leaf className="w-8 h-8" />
                  غرفة عمليات B2F
                </h1>
                <p className="text-emerald-100 text-sm mt-1">Book to Farm - نظام الحجوزات الزراعية</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-emerald-100">آخر تحديث</div>
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
            onClick={() => navigate('/admin/b2f')}
            className="group bg-white rounded-2xl p-6 border border-slate-200 hover:border-emerald-500 hover:shadow-xl transition-all text-right"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 group-hover:bg-emerald-500 flex items-center justify-center transition-all">
                <Package className="w-6 h-6 text-emerald-600 group-hover:text-white" />
              </div>
              <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">إدارة الحجوزات</h3>
            <p className="text-sm text-slate-600">عرض ومتابعة جميع الحجوزات</p>
          </button>

          <button className="group bg-white rounded-2xl p-6 border border-slate-200 hover:border-amber-500 hover:shadow-xl transition-all text-right">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-amber-100 group-hover:bg-amber-500 flex items-center justify-center transition-all">
                <DollarSign className="w-6 h-6 text-amber-600 group-hover:text-white" />
              </div>
              <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-amber-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">المدفوعات</h3>
            <p className="text-sm text-slate-600">مراجعة واعتماد المدفوعات</p>
          </button>

          <button className="group bg-white rounded-2xl p-6 border border-slate-200 hover:border-green-500 hover:shadow-xl transition-all text-right">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-green-100 group-hover:bg-green-500 flex items-center justify-center transition-all">
                <Leaf className="w-6 h-6 text-green-600 group-hover:text-white" />
              </div>
              <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">المزارع</h3>
            <p className="text-sm text-slate-600">إدارة المزارع والفرص</p>
          </button>
        </div>

        {/* Alert */}
        {stats && stats.pending_payments > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h4 className="font-bold text-amber-900 mb-1">تنبيه: مدفوعات معلقة</h4>
              <p className="text-sm text-amber-700">
                هناك {stats.pending_payments} مدفوعات تحتاج للمراجعة والاعتماد
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
