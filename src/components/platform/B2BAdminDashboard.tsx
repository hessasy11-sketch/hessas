import { ArrowRight, Activity, TrendingUp, Users, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export function B2BAdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalAuctions: 0,
    activeAuctions: 0,
    pendingAuctions: 0,
    soldAuctions: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [total, active, pending, sold] = await Promise.all([
        supabase.from('auctions').select('id', { count: 'exact', head: true }),
        supabase.from('auctions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('auctions').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('auctions').select('id', { count: 'exact', head: true }).eq('status', 'sold'),
      ]);

      setStats({
        totalAuctions: total.count || 0,
        activeAuctions: active.count || 0,
        pendingAuctions: pending.count || 0,
        soldAuctions: sold.count || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                  <Activity className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white">
                    لوحة إدارة المزادات (B2B)
                  </h1>
                  <p className="text-gray-400 text-sm mt-1">
                    إدارة كاملة لجميع المزادات والعروض
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate('/hq', { replace: true })}
              className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all border border-slate-600"
            >
              <ArrowRight className="w-5 h-5" />
              <span>العودة للوحة الرئيسية</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <Activity className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="text-3xl font-bold text-white mb-2">{stats.totalAuctions}</div>
            <div className="text-gray-400 text-sm">إجمالي المزادات</div>
          </div>

          <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="text-3xl font-bold text-white mb-2">{stats.activeAuctions}</div>
            <div className="text-gray-400 text-sm">مزادات نشطة</div>
          </div>

          <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="text-3xl font-bold text-white mb-2">{stats.pendingAuctions}</div>
            <div className="text-gray-400 text-sm">قيد المراجعة</div>
          </div>

          <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="text-3xl font-bold text-white mb-2">{stats.soldAuctions}</div>
            <div className="text-gray-400 text-sm">مباعة</div>
          </div>
        </div>

        <div className="p-8 rounded-2xl bg-gradient-to-r from-blue-500/10 to-blue-600/10 border border-blue-500/20 text-center">
          <Activity className="w-16 h-16 text-blue-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">لوحة إدارة المزادات</h2>
          <p className="text-gray-400">
            إدارة شاملة لجميع المزادات والعروض في المنصة
          </p>
        </div>
      </div>
    </div>
  );
}
