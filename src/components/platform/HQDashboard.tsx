import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Leaf,
  Users,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  BarChart3,
  Target,
  Crown,
  Shield,
  Layers,
  Activity,
  ArrowRight,
  Calculator,
  TrendingUp
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface SystemPulse {
  b2f_active: number;
  b2b_active: number;
  finance_pending: number;
  marketing_visits: number;
  critical_alerts: number;
}

export default function HQDashboard() {
  const navigate = useNavigate();
  const [pulse, setPulse] = useState<SystemPulse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSystemPulse();
    const interval = setInterval(loadSystemPulse, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadSystemPulse = async () => {
    try {
      const [b2fRes, b2bRes, financeRes, marketingRes] = await Promise.all([
        supabase.rpc('get_executive_pulse_b2f'),
        supabase.rpc('get_executive_pulse_b2b'),
        supabase.rpc('get_executive_pulse_finance'),
        supabase.rpc('get_executive_pulse_marketing')
      ]);

      setPulse({
        b2f_active: b2fRes.data?.bookings_today || 0,
        b2b_active: b2bRes.data?.active_auctions || 0,
        finance_pending: financeRes.data?.pending_reviews || 0,
        marketing_visits: marketingRes.data?.platform_total || 0,
        critical_alerts: (b2fRes.data?.critical_alerts || 0) + (b2bRes.data?.no_bids || 0)
      });
    } catch (error) {
      console.error('Error loading system pulse:', error);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50" dir="rtl">
      {/* Command Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700 shadow-2xl">
        <div className="max-w-[1800px] mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/50">
                  <Crown className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                    مركز القيادة التنفيذية
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-xs font-medium">
                      <Activity className="w-3 h-3 animate-pulse" />
                      مباشر
                    </span>
                  </h1>
                  <p className="text-slate-400 text-sm mt-0.5">Executive Command Center</p>
                </div>
              </div>
            </div>

            {pulse?.critical_alerts > 0 && (
              <div className="flex items-center gap-3 px-5 py-3 bg-red-500/20 border border-red-500/30 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-red-400 animate-pulse" />
                <div>
                  <div className="text-red-300 font-bold">{pulse.critical_alerts} تنبيه حرج</div>
                  <div className="text-red-400 text-xs">يتطلب انتباه فوري</div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 rounded-xl border border-slate-600">
                <Clock className="w-4 h-4 text-slate-400" />
                <span className="text-slate-300 text-sm font-medium">
                  {new Date().toLocaleDateString('ar-SA')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto px-8 py-8">

        {/* Main Sections Grid */}
        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* B2F Section */}
          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-3xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity" />
            <button
              onClick={() => navigate('/admin/b2f')}
              className="relative w-full bg-white/90 backdrop-blur-sm rounded-3xl p-8 border border-emerald-200 hover:border-emerald-300 transition-all duration-300 hover:shadow-2xl"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                    <Leaf className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-right">
                    <h3 className="text-2xl font-bold text-slate-900 mb-1">استثمار المزارع</h3>
                    <p className="text-slate-600 text-sm">Farm Investment Operations</p>
                  </div>
                </div>
                <ArrowRight className="w-6 h-6 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-2 transition-all" />
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-emerald-50 rounded-xl p-4">
                  <div className="text-2xl font-bold text-emerald-900">{pulse?.b2f_active || 0}</div>
                  <div className="text-xs text-emerald-700 mt-1">حجوزات نشطة</div>
                </div>
                <div className="bg-blue-50 rounded-xl p-4">
                  <div className="text-2xl font-bold text-blue-900">8</div>
                  <div className="text-xs text-blue-700 mt-1">مزارع تشغيلية</div>
                </div>
                <div className="bg-amber-50 rounded-xl p-4">
                  <div className="text-2xl font-bold text-amber-900">24</div>
                  <div className="text-xs text-amber-700 mt-1">عقود فعالة</div>
                </div>
              </div>

              <p className="text-slate-600 leading-relaxed">
                إدارة الاستثمار الزراعي وربط الإدارة بالمزارع والفرق التشغيلية ومتابعة العمليات الموسمية.
              </p>
            </button>
          </div>

          {/* B2B Section */}
          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-blue-600 rounded-3xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity" />
            <button
              onClick={() => navigate('/admin/auctions')}
              className="relative w-full bg-white/90 backdrop-blur-sm rounded-3xl p-8 border border-blue-200 hover:border-blue-300 transition-all duration-300 hover:shadow-2xl"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                    <Building2 className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-right">
                    <h3 className="text-2xl font-bold text-slate-900 mb-1">مزاد الشركات</h3>
                    <p className="text-slate-600 text-sm">Business Auctions Platform</p>
                  </div>
                </div>
                <ArrowRight className="w-6 h-6 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-2 transition-all" />
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 rounded-xl p-4">
                  <div className="text-2xl font-bold text-blue-900">{pulse?.b2b_active || 0}</div>
                  <div className="text-xs text-blue-700 mt-1">مزادات نشطة</div>
                </div>
                <div className="bg-emerald-50 rounded-xl p-4">
                  <div className="text-2xl font-bold text-emerald-900">156</div>
                  <div className="text-xs text-emerald-700 mt-1">مزايدات اليوم</div>
                </div>
                <div className="bg-amber-50 rounded-xl p-4">
                  <div className="text-2xl font-bold text-amber-900">42</div>
                  <div className="text-xs text-amber-700 mt-1">مباعة</div>
                </div>
              </div>

              <p className="text-slate-600 leading-relaxed">
                إدارة المزادات التجارية للشركات والمؤسسات ومتابعة النشاط التجاري والمزايدات.
              </p>
            </button>
          </div>
        </div>

        {/* Support Departments Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Finance */}
          <button
            onClick={() => navigate('/admin/operations-room/finance')}
            className="group bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-200 hover:border-amber-300 transition-all duration-300 hover:shadow-xl"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
                <Calculator className="w-7 h-7 text-white" />
              </div>
              <div className="text-right flex-1">
                <h3 className="text-xl font-bold text-slate-900">المحاسبة</h3>
                <p className="text-slate-600 text-xs">Finance Department</p>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-1 transition-all" />
            </div>

            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 bg-white rounded-lg p-3 border border-amber-200">
                <div className="text-lg font-bold text-emerald-900">{pulse?.finance_pending || 0}</div>
                <div className="text-xs text-slate-600">معلقة</div>
              </div>
              <div className="flex-1 bg-white rounded-lg p-3 border border-amber-200">
                <div className="text-lg font-bold text-slate-900">342K</div>
                <div className="text-xs text-slate-600">اليوم</div>
              </div>
            </div>

            <p className="text-slate-600 text-sm">
              متابعة الإيرادات والمصروفات والتقارير المالية
            </p>
          </button>

          {/* Marketing */}
          <button
            onClick={() => navigate('/admin/operations-room/marketing')}
            className="group bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-200 hover:border-purple-300 transition-all duration-300 hover:shadow-xl"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                <TrendingUp className="w-7 h-7 text-white" />
              </div>
              <div className="text-right flex-1">
                <h3 className="text-xl font-bold text-slate-900">التسويق</h3>
                <p className="text-slate-600 text-xs">Marketing Department</p>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
            </div>

            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 bg-white rounded-lg p-3 border border-purple-200">
                <div className="text-lg font-bold text-purple-900">{pulse?.marketing_visits || 0}</div>
                <div className="text-xs text-slate-600">زيارات</div>
              </div>
              <div className="flex-1 bg-white rounded-lg p-3 border border-purple-200">
                <div className="text-lg font-bold text-slate-900">18%</div>
                <div className="text-xs text-slate-600">تحويل</div>
              </div>
            </div>

            <p className="text-slate-600 text-sm">
              إدارة الحملات والقنوات التسويقية وقياس الأداء
            </p>
          </button>

          {/* Partners */}
          <button
            onClick={() => navigate('/admin/operations-room/partners')}
            className="group bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl p-6 border border-orange-200 hover:border-orange-300 transition-all duration-300 hover:shadow-xl"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
                <Users className="w-7 h-7 text-white" />
              </div>
              <div className="text-right flex-1">
                <h3 className="text-xl font-bold text-slate-900">الشركاء</h3>
                <p className="text-slate-600 text-xs">Partners Management</p>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-orange-600 group-hover:translate-x-1 transition-all" />
            </div>

            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 bg-white rounded-lg p-3 border border-orange-200">
                <div className="text-lg font-bold text-orange-900">12</div>
                <div className="text-xs text-slate-600">شريك</div>
              </div>
              <div className="flex-1 bg-white rounded-lg p-3 border border-orange-200">
                <div className="text-lg font-bold text-slate-900">128K</div>
                <div className="text-xs text-slate-600">أرباح</div>
              </div>
            </div>

            <p className="text-slate-600 text-sm">
              إدارة شركاء المنصة وتوزيع الأرباح والمزارع
            </p>
          </button>
        </div>

        {/* System Status Bar */}
        <div className="mt-8 bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse shadow-lg shadow-emerald-500/50" />
                <span className="text-sm font-medium text-slate-700">النظام يعمل بشكل طبيعي</span>
              </div>
              <div className="h-8 w-px bg-slate-200" />
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Shield className="w-4 h-4 text-emerald-600" />
                <span>آمن ومشفر</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Zap className="w-4 h-4 text-amber-600" />
                <span>وقت الاستجابة: 120ms</span>
              </div>
            </div>

            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors border border-slate-200"
            >
              <ArrowRight className="w-4 h-4 rotate-180" />
              <span className="text-sm font-medium">العودة للرئيسية</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
