import { ArrowRight, Users, UserCheck, UserX, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export function UsersManagementDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    blockedUsers: 0,
    adminUsers: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [total, blocked, admins] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_blocked', true),
        supabase.from('platform_staff').select('id', { count: 'exact', head: true }),
      ]);

      setStats({
        totalUsers: total.count || 0,
        activeUsers: (total.count || 0) - (blocked.count || 0),
        blockedUsers: blocked.count || 0,
        adminUsers: admins.count || 0,
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
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg">
                  <Users className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white">
                    إدارة المستخدمين
                  </h1>
                  <p className="text-gray-400 text-sm mt-1">
                    إدارة حسابات المستخدمين والصلاحيات
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
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="text-3xl font-bold text-white mb-2">{stats.totalUsers}</div>
            <div className="text-gray-400 text-sm">إجمالي المستخدمين</div>
          </div>

          <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                <UserCheck className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="text-3xl font-bold text-white mb-2">{stats.activeUsers}</div>
            <div className="text-gray-400 text-sm">مستخدمين نشطين</div>
          </div>

          <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                <UserX className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="text-3xl font-bold text-white mb-2">{stats.blockedUsers}</div>
            <div className="text-gray-400 text-sm">محظورين</div>
          </div>

          <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="text-3xl font-bold text-white mb-2">{stats.adminUsers}</div>
            <div className="text-gray-400 text-sm">مديرين</div>
          </div>
        </div>

        <div className="p-8 rounded-2xl bg-gradient-to-r from-purple-500/10 to-purple-600/10 border border-purple-500/20 text-center">
          <Users className="w-16 h-16 text-purple-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">لوحة إدارة المستخدمين</h2>
          <p className="text-gray-400">
            إدارة شاملة لحسابات المستخدمين والصلاحيات
          </p>
        </div>
      </div>
    </div>
  );
}
