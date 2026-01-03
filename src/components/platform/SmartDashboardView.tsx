import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  FileText,
  Clock,
  Sprout,
  Users,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Eye,
  Store,
  ArrowRight,
  TreePine,
  DollarSign
} from 'lucide-react';

interface Props {
  onNavigateToB2F?: () => void;
  onNavigateToAuctions?: () => void;
}

interface Stats {
  total_farms: number;
  active_contracts: number;
  total_investors: number;
  open_service_requests: number;
  unreviewed_reports: number;
  overdue_tasks: number;
  active_farms: number;
  affected_investors_today: number;
  critical_alerts: number;
}

export default function SmartDashboardView({ onNavigateToB2F, onNavigateToAuctions }: Props) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    try {
      const [commandStats, b2fStats] = await Promise.all([
        supabase.rpc('get_command_center_stats'),
        loadB2FStats()
      ]);

      if (commandStats.error) throw commandStats.error;

      setStats({
        ...commandStats.data,
        ...b2fStats
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadB2FStats = async () => {
    try {
      const [farmsResult, contractsResult, investorsResult, requestsResult] = await Promise.all([
        supabase.from('b2f_farms').select('id', { count: 'exact', head: true }),
        supabase.from('b2f_contracts').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('b2f_investor_accounts').select('id', { count: 'exact', head: true }),
        supabase.from('investor_action_requests').select('id', { count: 'exact', head: true }).eq('status', 'open')
      ]);

      return {
        total_farms: farmsResult.count || 0,
        active_contracts: contractsResult.count || 0,
        total_investors: investorsResult.count || 0,
        open_service_requests: requestsResult.count || 0
      };
    } catch (error) {
      console.warn('B2F tables not yet created:', error);
      return {
        total_farms: 0,
        active_contracts: 0,
        total_investors: 0,
        open_service_requests: 0
      };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل الإحصائيات...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-red-900 mb-2">خطأ في تحميل البيانات</h3>
        <p className="text-red-700">تعذر تحميل إحصائيات لوحة القيادة</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* تنبيه لوحة إشرافية */}
      <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-200 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <Eye className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-orange-900 mb-2">لوحة قيادة إشرافية - بدون تنفيذ مباشر</h3>
            <p className="text-sm text-orange-800 leading-relaxed">
              هذه اللوحة للعرض والإشراف فقط. للإجراءات التنفيذية، استخدم بطاقات التحويل أدناه للدخول للأقسام المتخصصة.
            </p>
          </div>
        </div>
      </div>

      {/* بطاقات التحويل للأقسام */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* بطاقة مزاد الشركات */}
        <button
          onClick={onNavigateToAuctions}
          className="group relative bg-white rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 border-2 border-orange-100 overflow-hidden hover:scale-[1.02] active:scale-[0.98] text-right"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-red-600 opacity-0 group-hover:opacity-5 transition-opacity duration-300"></div>

          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 mb-5">
              <Store className="w-8 h-8 text-white" />
            </div>

            <h2 className="text-2xl font-black text-gray-900 mb-3">
              مزاد الشركات (B2B)
            </h2>

            <p className="text-gray-600 leading-relaxed mb-4 text-base">
              الدخول الكامل لإدارة المزادات والإعلانات والخطط والاشتراكات
            </p>

            <div className="flex items-center gap-2 text-orange-600 font-bold group-hover:gap-3 transition-all">
              <span>الدخول للوحة التحكم</span>
              <ArrowRight className="w-5 h-5" />
            </div>
          </div>

          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-all duration-1000"></div>
        </button>

        {/* بطاقة استثمار أشجار المزارع */}
        <button
          onClick={onNavigateToB2F}
          className="group relative bg-white rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 border-2 border-emerald-100 overflow-hidden hover:scale-[1.02] active:scale-[0.98] text-right"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-600 opacity-0 group-hover:opacity-5 transition-opacity duration-300"></div>

          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 mb-5">
              <TreePine className="w-8 h-8 text-white" />
            </div>

            <h2 className="text-2xl font-black text-gray-900 mb-3">
              استثمار أشجار المزارع (B2F)
            </h2>

            <p className="text-gray-600 leading-relaxed mb-4 text-base">
              الدخول الكامل لإدارة المزارع والعروض الاستثمارية والعمليات التشغيلية
            </p>

            <div className="flex items-center gap-2 text-emerald-600 font-bold group-hover:gap-3 transition-all">
              <span>الدخول للوحة التحكم</span>
              <ArrowRight className="w-5 h-5" />
            </div>
          </div>

          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-all duration-1000"></div>
        </button>
      </div>

      {/* المؤشرات الرئيسية - B2F */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <TreePine className="w-5 h-5 text-emerald-600" />
          مؤشرات استثمار أشجار المزارع
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-xl p-6 hover:shadow-xl transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="w-14 h-14 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                <Sprout className="w-7 h-7 text-white" />
              </div>
            </div>
            <h4 className="text-sm font-medium text-gray-600 mb-1">إجمالي المزارع</h4>
            <div className="text-4xl font-black text-emerald-700">
              {stats.total_farms}
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-sky-50 border-2 border-blue-200 rounded-xl p-6 hover:shadow-xl transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="w-14 h-14 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                <FileText className="w-7 h-7 text-white" />
              </div>
            </div>
            <h4 className="text-sm font-medium text-gray-600 mb-1">العقود النشطة</h4>
            <div className="text-4xl font-black text-blue-700">
              {stats.active_contracts}
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl p-6 hover:shadow-xl transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="w-14 h-14 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg">
                <Users className="w-7 h-7 text-white" />
              </div>
            </div>
            <h4 className="text-sm font-medium text-gray-600 mb-1">عدد المستثمرين</h4>
            <div className="text-4xl font-black text-amber-700">
              {stats.total_investors}
            </div>
          </div>

          <div className="bg-gradient-to-br from-rose-50 to-red-50 border-2 border-rose-200 rounded-xl p-6 hover:shadow-xl transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="w-14 h-14 bg-rose-500 rounded-xl flex items-center justify-center shadow-lg">
                <AlertCircle className="w-7 h-7 text-white" />
              </div>
            </div>
            <h4 className="text-sm font-medium text-gray-600 mb-1">طلبات خدمة مفتوحة</h4>
            <div className="text-4xl font-black text-rose-700">
              {stats.open_service_requests}
            </div>
          </div>
        </div>
      </div>

      {/* مؤشرات التنبيه */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-amber-600" />
          مؤشرات التنبيه والمتابعة
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className={`bg-gradient-to-br from-blue-50 to-sky-50 border-2 ${
            stats.unreviewed_reports > 0 ? 'border-blue-300' : 'border-blue-200'
          } rounded-xl p-6 hover:shadow-xl transition-all`}>
            <div className="flex items-start justify-between mb-4">
              <div className={`w-14 h-14 ${
                stats.unreviewed_reports > 0 ? 'bg-blue-600' : 'bg-blue-400'
              } rounded-xl flex items-center justify-center shadow-lg`}>
                <FileText className="w-7 h-7 text-white" />
              </div>
              {stats.unreviewed_reports > 0 && (
                <span className="px-3 py-1 bg-blue-600 text-white rounded-full text-sm font-bold shadow">
                  {stats.unreviewed_reports}
                </span>
              )}
            </div>
            <h4 className="text-sm font-medium text-gray-600 mb-1">التقارير غير المقروءة</h4>
            <div className="text-3xl font-black text-blue-700">
              {stats.unreviewed_reports}
            </div>
            <p className="text-xs text-gray-600 mt-2">تقارير تشغيلية بانتظار المراجعة</p>
          </div>

          <div className={`bg-gradient-to-br from-amber-50 to-orange-50 border-2 ${
            stats.overdue_tasks > 0 ? 'border-amber-300' : 'border-amber-200'
          } rounded-xl p-6 hover:shadow-xl transition-all`}>
            <div className="flex items-start justify-between mb-4">
              <div className={`w-14 h-14 ${
                stats.overdue_tasks > 0 ? 'bg-amber-600' : 'bg-amber-400'
              } rounded-xl flex items-center justify-center shadow-lg`}>
                <Clock className="w-7 h-7 text-white" />
              </div>
              {stats.overdue_tasks > 0 && (
                <span className="px-3 py-1 bg-amber-600 text-white rounded-full text-sm font-bold shadow">
                  {stats.overdue_tasks}
                </span>
              )}
            </div>
            <h4 className="text-sm font-medium text-gray-600 mb-1">المهام المتأخرة (SLA)</h4>
            <div className="text-3xl font-black text-amber-700">
              {stats.overdue_tasks}
            </div>
            <p className="text-xs text-gray-600 mt-2">مهام تجاوزت موعدها المحدد</p>
          </div>

          <div className={`bg-gradient-to-br from-red-50 to-rose-50 border-2 ${
            stats.critical_alerts > 0 ? 'border-red-300' : 'border-red-200'
          } rounded-xl p-6 hover:shadow-xl transition-all`}>
            <div className="flex items-start justify-between mb-4">
              <div className={`w-14 h-14 ${
                stats.critical_alerts > 0 ? 'bg-red-600' : 'bg-red-400'
              } rounded-xl flex items-center justify-center shadow-lg`}>
                <AlertCircle className="w-7 h-7 text-white" />
              </div>
              {stats.critical_alerts > 0 && (
                <span className="px-3 py-1 bg-red-600 text-white rounded-full text-sm font-bold shadow animate-pulse">
                  {stats.critical_alerts}
                </span>
              )}
            </div>
            <h4 className="text-sm font-medium text-gray-600 mb-1">التنبيهات الحرجة</h4>
            <div className="text-3xl font-black text-red-700">
              {stats.critical_alerts}
            </div>
            <p className="text-xs text-gray-600 mt-2">تنبيهات تتطلب اهتماماً فورياً</p>
          </div>
        </div>
      </div>

      {/* ملخص الحالة */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-orange-600" />
          ملخص الحالة العامة
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
            {stats.unreviewed_reports === 0 ? (
              <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
            )}
            <div>
              <div className="font-bold text-gray-900 mb-1">التقارير</div>
              <div className="text-sm text-gray-600">
                {stats.unreviewed_reports === 0
                  ? 'جميع التقارير مُراجعة'
                  : `${stats.unreviewed_reports} تقرير بانتظار المراجعة`}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
            {stats.overdue_tasks === 0 ? (
              <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
            )}
            <div>
              <div className="font-bold text-gray-900 mb-1">المهام</div>
              <div className="text-sm text-gray-600">
                {stats.overdue_tasks === 0
                  ? 'لا توجد مهام متأخرة'
                  : `${stats.overdue_tasks} مهمة تجاوزت SLA`}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
            <Sprout className="w-5 h-5 text-emerald-500 mt-0.5" />
            <div>
              <div className="font-bold text-gray-900 mb-1">المزارع</div>
              <div className="text-sm text-gray-600">
                {stats.active_farms} مزرعة في حالة تشغيل نشطة
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
            <Users className="w-5 h-5 text-amber-500 mt-0.5" />
            <div>
              <div className="font-bold text-gray-900 mb-1">المستثمرين</div>
              <div className="text-sm text-gray-600">
                {stats.affected_investors_today} مستثمر تلقوا تحديثات اليوم
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ملاحظة إرشادية */}
      <div className="bg-gradient-to-r from-gray-50 to-slate-50 border-2 border-gray-200 rounded-xl p-5">
        <h4 className="font-bold text-gray-900 mb-3">💡 للإجراءات التنفيذية:</h4>
        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex items-start gap-2">
            <span className="text-orange-600 font-bold">•</span>
            <span><strong>استخدم بطاقات التحويل أعلاه</strong> للدخول المباشر لـ B2B أو B2F</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-orange-600 font-bold">•</span>
            <span><strong>تبويب "التنبيهات"</strong> لعرض التنبيهات الحرجة فقط</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-orange-600 font-bold">•</span>
            <span><strong>تبويب "تقارير التوثيق"</strong> لمراجعة التقارير القادمة من التشغيل</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
