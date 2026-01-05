import { Map, TrendingUp, Clock, AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

interface Stats {
  total_farms: number;
  active_farms: number;
  suspended_farms: number;
  pending_approvals: number;
  critical_alerts: number;
}

export default function HQFarmCommandCard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const { data, error } = await supabase.rpc('get_farm_command_stats');

      if (error) throw error;
      setStats(data);
    } catch (error) {
      console.error('Error loading farm command stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-8">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-xl p-8 text-white">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
          <Map className="w-7 h-7" />
        </div>
        <div>
          <h3 className="text-2xl font-black mb-1">قيادة المزارع</h3>
          <p className="text-emerald-100 text-sm">المركز التنفيذي الوطني</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <Map className="w-5 h-5 opacity-80" />
            <span className="text-3xl font-bold">{stats?.total_farms || 0}</span>
          </div>
          <p className="text-sm opacity-90">إجمالي المزارع</p>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-5 h-5 opacity-80" />
            <span className="text-3xl font-bold">{stats?.active_farms || 0}</span>
          </div>
          <p className="text-sm opacity-90">نشطة</p>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-5 h-5 opacity-80" />
            <span className="text-3xl font-bold">{stats?.pending_approvals || 0}</span>
          </div>
          <p className="text-sm opacity-90">موافقات معلقة</p>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <AlertCircle className="w-5 h-5 opacity-80" />
            <span className="text-3xl font-bold">{stats?.critical_alerts || 0}</span>
          </div>
          <p className="text-sm opacity-90">تنبيهات حرجة</p>
        </div>
      </div>

      {/* Action Button */}
      <button
        onClick={() => navigate('/admin/b2f/farm-command')}
        className="w-full bg-white text-emerald-600 px-6 py-4 rounded-xl font-bold hover:bg-emerald-50 transition-all flex items-center justify-between group"
      >
        <span className="text-lg">فتح قيادة المزارع</span>
        <ArrowLeft className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
      </button>

      {/* Alert */}
      {stats && stats.pending_approvals > 0 && (
        <div className="mt-4 flex items-center gap-2 px-4 py-3 bg-yellow-500/20 backdrop-blur-sm rounded-lg border border-yellow-300/30">
          <Clock className="w-4 h-4" />
          <span className="text-sm">
            يوجد {stats.pending_approvals} طلب موافقة بحاجة للمراجعة
          </span>
        </div>
      )}
    </div>
  );
}
