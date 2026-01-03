import { useState, useEffect } from 'react';
import {
  ArrowRight,
  Home,
  Package,
  PlayCircle,
  FileText,
  Loader2,
  LogOut
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface InvestorDashboardViewProps {
  userId: string;
  userName: string;
  onNavigate: (view: string) => void;
  onLogout?: () => void;
  loggingOut?: boolean;
}

interface DashboardStats {
  currentReservations: number;
  activeContracts: number;
}

export function InvestorDashboardView({ userId, userName, onNavigate, onLogout, loggingOut }: InvestorDashboardViewProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardStats();
  }, [userId]);

  const loadDashboardStats = async () => {
    try {
      setLoading(true);

      // عدد حجوزات الأشجار الحالية (جميع الحالات ماعدا المرفوضة والتشغيلية)
      const { count: currentReservations } = await supabase
        .from('b2f_investment_requests')
        .select('*', { count: 'exact', head: true })
        .eq('investor_phone', userId)
        .not('status', 'in', '(rejected,operational)');

      // عدد العقود النشطة
      const { count: activeContracts } = await supabase
        .from('b2f_contracts')
        .select('*', { count: 'exact', head: true })
        .eq('investor_id', userId)
        .eq('status', 'active');

      setStats({
        currentReservations: currentReservations || 0,
        activeContracts: activeContracts || 0
      });
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="bg-gradient-to-r from-emerald-500 to-green-600 p-4">
        <div className="flex items-center gap-2">
          <Home className="w-5 h-5 text-white" />
          <h2 className="text-lg font-black text-white">لوحة المستثمر</h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* رسالة الترحيب */}
        <div className="mb-8">
          <h3 className="text-3xl font-black text-gray-900 mb-2">
            مرحبًا يا {userName} 👋
          </h3>
          <p className="text-sm text-gray-600">نظرة سريعة على وضعك في المنصة</p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mb-3" />
            <p className="text-gray-600 text-sm">جاري تحميل البيانات...</p>
          </div>
        ) : stats ? (
          <div className="space-y-6">
            {/* ملخص بسيط */}
            <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-6 border-2 border-emerald-200">
              <h4 className="text-lg font-black text-gray-900 mb-4">الملخص</h4>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-emerald-100 rounded-full p-2">
                      <Package className="w-6 h-6 text-emerald-600" />
                    </div>
                    <span className="text-gray-700 font-bold">حجوزات الأشجار الحالية</span>
                  </div>
                  <span className="text-2xl font-black text-emerald-600">{stats.currentReservations}</span>
                </div>

                <div className="h-px bg-emerald-200"></div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-100 rounded-full p-2">
                      <FileText className="w-6 h-6 text-blue-600" />
                    </div>
                    <span className="text-gray-700 font-bold">العقود النشطة</span>
                  </div>
                  <span className="text-2xl font-black text-blue-600">{stats.activeContracts}</span>
                </div>
              </div>
            </div>

            {/* أزرار سريعة */}
            <div className="space-y-3 pb-16">
              <h4 className="text-lg font-black text-gray-900 mb-3">الانتقال السريع</h4>

              <button
                onClick={() => onNavigate('reservations')}
                className="w-full flex items-center justify-between p-4 bg-white border-2 border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50 rounded-xl transition-all shadow-sm hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-100 rounded-full p-2">
                    <Package className="w-5 h-5 text-emerald-600" />
                  </div>
                  <span className="font-black text-gray-900">حجوزاتي</span>
                </div>
                <ArrowRight className="w-5 h-5 text-emerald-600" />
              </button>

              <button
                onClick={() => onNavigate('operations')}
                className="w-full flex items-center justify-between p-4 bg-white border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-50 rounded-xl transition-all shadow-sm hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 rounded-full p-2">
                    <PlayCircle className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="font-black text-gray-900">التشغيل والمتابعة</span>
                </div>
                <ArrowRight className="w-5 h-5 text-blue-600" />
              </button>

              {onLogout && (
                <button
                  onClick={onLogout}
                  disabled={loggingOut}
                  className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold py-3.5 px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl mt-6 mb-8"
                >
                  {loggingOut ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>جاري تسجيل الخروج...</span>
                    </>
                  ) : (
                    <>
                      <LogOut className="w-5 h-5" />
                      <span>تسجيل الخروج</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
