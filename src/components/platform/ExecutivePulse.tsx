import { useExecutivePulse } from '../../hooks/useExecutivePulse';
import { useNavigate } from 'react-router-dom';
import { Activity, AlertTriangle, DollarSign, Calendar, Clock, TrendingUp, CheckCircle, XCircle, Radar, Sprout, Gavel, ArrowRight } from 'lucide-react';

export default function ExecutivePulse() {
  const { data, loading, error } = useExecutivePulse();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-red-600" />
          <div>
            <h3 className="text-red-900 font-semibold">خطأ في تحميل البيانات</h3>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const pulseData = data.pulse;
  const b2fRadar = data.b2f_radar;
  const b2bRadar = data.b2b_radar;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    if (diffDays === 1) return 'أمس';
    if (diffDays < 7) return `منذ ${diffDays} أيام`;

    return date.toLocaleDateString('ar-SA', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActionLabel = (actionType: string) => {
    const labels: Record<string, string> = {
      approve_decision: 'اعتماد قرار',
      execute_approve_expense: 'اعتماد مصروف',
      execute_suspend_bookings: 'إيقاف حجوزات',
      execute_change_farm_manager: 'تغيير مدير',
      create_farm_operation: 'إنشاء عملية',
      issue_contract: 'إصدار عقد'
    };
    return labels[actionType] || actionType;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">لوحة المؤشرات العليا</h1>
            <p className="text-blue-100">نظرة شاملة على أداء المنصة</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-blue-100 mb-1">آخر تحديث</p>
            <p className="text-sm font-medium">{formatDate(pulseData.last_updated)}</p>
            <div className="flex items-center gap-1 mt-2 text-xs text-blue-100">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>تحديث تلقائي</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* عدد المزارع النشطة */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-medium">
              نشط
            </span>
          </div>
          <h3 className="text-gray-600 text-sm mb-1">المزارع النشطة</h3>
          <p className="text-4xl font-bold text-gray-900">{pulseData.active_farms}</p>
          <p className="text-xs text-gray-500 mt-2">مزرعة تعمل بشكل طبيعي</p>
        </div>

        {/* عدد المزارع المتعثرة */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-lg text-xs font-medium">
              تحذير
            </span>
          </div>
          <h3 className="text-gray-600 text-sm mb-1">المزارع المتعثرة</h3>
          <p className="text-4xl font-bold text-gray-900">{pulseData.struggling_farms}</p>
          <p className="text-xs text-gray-500 mt-2">مزرعة موقوفة أو في صيانة</p>
        </div>

        {/* إجمالي المصروفات */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-medium">
              30 يوم
            </span>
          </div>
          <h3 className="text-gray-600 text-sm mb-1">إجمالي المصروفات</h3>
          <p className="text-4xl font-bold text-gray-900">
            {formatCurrency(pulseData.total_expenses)}
          </p>
          <p className="text-xs text-gray-500 mt-2">المصروفات المعتمدة خلال شهر</p>
        </div>

        {/* عدد الحجوزات اليوم */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium">
              اليوم
            </span>
          </div>
          <h3 className="text-gray-600 text-sm mb-1">الحجوزات اليوم</h3>
          <p className="text-4xl font-bold text-gray-900">{pulseData.bookings_today}</p>
          <p className="text-xs text-gray-500 mt-2">طلب حجز جديد اليوم</p>
        </div>

        {/* عدد القرارات المعلقة */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-lg text-xs font-medium">
              معلق
            </span>
          </div>
          <h3 className="text-gray-600 text-sm mb-1">القرارات المعلقة</h3>
          <p className="text-4xl font-bold text-gray-900">{pulseData.pending_decisions}</p>
          <p className="text-xs text-gray-500 mt-2">قرار بانتظار المراجعة</p>
        </div>

        {/* Activity Summary */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <span className="px-3 py-1 bg-teal-100 text-teal-700 rounded-lg text-xs font-medium">
              النشاط
            </span>
          </div>
          <h3 className="text-gray-600 text-sm mb-1">معدل النشاط</h3>
          <p className="text-4xl font-bold text-gray-900">
            {pulseData.active_farms + pulseData.bookings_today}
          </p>
          <p className="text-xs text-gray-500 mt-2">إجمالي التفاعلات اليوم</p>
        </div>
      </div>

      {/* Recent Events Timeline */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">آخر الأحداث المهمة</h3>
              <p className="text-sm text-gray-500">آخر 5 عمليات تنفيذية</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {pulseData.recent_events && pulseData.recent_events.length > 0 ? (
            <div className="space-y-4">
              {pulseData.recent_events.map((event, index) => (
                <div
                  key={event.id}
                  className="flex items-start gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors border border-gray-100"
                >
                  {/* Timeline Indicator */}
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      event.result === 'success' ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      {event.result === 'success' ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                    {index < pulseData.recent_events.length - 1 && (
                      <div className="w-0.5 h-8 bg-gray-200 mt-2"></div>
                    )}
                  </div>

                  {/* Event Details */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-gray-900">
                          {getActionLabel(event.action_type)}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {event.farm_name && (
                            <span className="text-blue-600">{event.farm_name}</span>
                          )}
                        </p>
                      </div>
                      <span className="text-xs text-gray-500">
                        {formatDate(event.created_at)}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>بواسطة: {event.staff_name || 'النظام'}</span>
                      {event.notes && (
                        <span className="text-gray-600">{event.notes}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">لا توجد أحداث حديثة</p>
              <p className="text-sm">سيتم عرض الأحداث هنا عند تنفيذ العمليات</p>
            </div>
          )}
        </div>
      </div>

      {/* Section Radars */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* B2F Radar */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 border-b border-green-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-600 to-green-700 flex items-center justify-center">
                <Sprout className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-green-900">Radar استثمار المزارع (B2F)</h3>
                <p className="text-sm text-green-600">مراقبة المزارع والعمليات</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* مزارع تحتاج تدخل */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  مزارع تحتاج تدخل
                </h4>
                <span className="text-xs text-gray-500">
                  {b2fRadar.farms_need_attention?.length || 0}
                </span>
              </div>
              {b2fRadar.farms_need_attention && b2fRadar.farms_need_attention.length > 0 ? (
                <div className="space-y-2">
                  {b2fRadar.farms_need_attention.map((farm) => (
                    <div
                      key={farm.id}
                      onClick={() => navigate(`/admin/operations-room/b2f/farms/${farm.id}`)}
                      className="flex items-center justify-between p-3 rounded-lg bg-red-50 hover:bg-red-100 cursor-pointer transition-colors border border-red-100"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{farm.name}</p>
                        <p className="text-xs text-red-600">{farm.issue}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-red-600" />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-3">لا توجد مزارع تحتاج تدخل</p>
              )}
            </div>

            {/* مزارع جديدة */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-500" />
                  مزارع جديدة
                </h4>
                <span className="text-xs text-gray-500">
                  {b2fRadar.new_farms?.length || 0}
                </span>
              </div>
              {b2fRadar.new_farms && b2fRadar.new_farms.length > 0 ? (
                <div className="space-y-2">
                  {b2fRadar.new_farms.map((farm) => (
                    <div
                      key={farm.id}
                      onClick={() => navigate(`/admin/operations-room/b2f/farms/${farm.id}`)}
                      className="flex items-center justify-between p-3 rounded-lg bg-blue-50 hover:bg-blue-100 cursor-pointer transition-colors border border-blue-100"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{farm.name}</p>
                        <p className="text-xs text-blue-600">
                          منذ {Math.floor(farm.days_old)} يوم
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-blue-600" />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-3">لا توجد مزارع جديدة</p>
              )}
            </div>

            {/* مزارع عالية المصروف */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-orange-500" />
                  مزارع عالية المصروف
                </h4>
                <span className="text-xs text-gray-500">
                  {b2fRadar.high_expense_farms?.length || 0}
                </span>
              </div>
              {b2fRadar.high_expense_farms && b2fRadar.high_expense_farms.length > 0 ? (
                <div className="space-y-2">
                  {b2fRadar.high_expense_farms.map((farm) => (
                    <div
                      key={farm.id}
                      onClick={() => navigate(`/admin/operations-room/b2f/farms/${farm.id}`)}
                      className="flex items-center justify-between p-3 rounded-lg bg-orange-50 hover:bg-orange-100 cursor-pointer transition-colors border border-orange-100"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{farm.name}</p>
                        <p className="text-xs text-orange-600">
                          {formatCurrency(farm.total_expenses)} ({farm.expense_count} مصروف)
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-orange-600" />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-3">لا توجد مزارع عالية المصروف</p>
              )}
            </div>

            {/* Button to B2F Operations Room */}
            <button
              onClick={() => navigate('/admin/operations-room/b2f')}
              className="w-full py-3 px-4 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl font-semibold hover:from-green-700 hover:to-green-800 transition-all flex items-center justify-center gap-2"
            >
              <Radar className="w-5 h-5" />
              غرفة عمليات المزارع
            </button>
          </div>
        </div>

        {/* B2B Radar */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-amber-50 to-amber-100 p-6 border-b border-amber-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-600 to-amber-700 flex items-center justify-center">
                <Gavel className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-amber-900">Radar مزاد الشركات (B2B)</h3>
                <p className="text-sm text-amber-600">مراقبة المزادات والعطاءات</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* مزادات حرجة */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  مزادات حرجة
                </h4>
                <span className="text-xs text-gray-500">
                  {b2bRadar.critical_auctions?.length || 0}
                </span>
              </div>
              {b2bRadar.critical_auctions && b2bRadar.critical_auctions.length > 0 ? (
                <div className="space-y-2">
                  {b2bRadar.critical_auctions.map((auction) => (
                    <div
                      key={auction.id}
                      onClick={() => navigate(`/admin/operations-room/b2b`)}
                      className="flex items-center justify-between p-3 rounded-lg bg-red-50 hover:bg-red-100 cursor-pointer transition-colors border border-red-100"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{auction.title}</p>
                        <p className="text-xs text-red-600">
                          {auction.reports_count} تقرير معلق
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-red-600" />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-3">لا توجد مزادات حرجة</p>
              )}
            </div>

            {/* مزادات متوقفة */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-gray-500" />
                  مزادات متوقفة
                </h4>
                <span className="text-xs text-gray-500">
                  {b2bRadar.stopped_auctions?.length || 0}
                </span>
              </div>
              {b2bRadar.stopped_auctions && b2bRadar.stopped_auctions.length > 0 ? (
                <div className="space-y-2">
                  {b2bRadar.stopped_auctions.map((auction) => (
                    <div
                      key={auction.id}
                      onClick={() => navigate(`/admin/operations-room/b2b`)}
                      className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors border border-gray-100"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{auction.title}</p>
                        <p className="text-xs text-gray-600">{auction.reason}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-600" />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-3">لا توجد مزادات متوقفة</p>
              )}
            </div>

            {/* مزادات قريبة الإغلاق */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-yellow-500" />
                  مزادات قريبة الإغلاق
                </h4>
                <span className="text-xs text-gray-500">
                  {b2bRadar.closing_soon_auctions?.length || 0}
                </span>
              </div>
              {b2bRadar.closing_soon_auctions && b2bRadar.closing_soon_auctions.length > 0 ? (
                <div className="space-y-2">
                  {b2bRadar.closing_soon_auctions.map((auction) => (
                    <div
                      key={auction.id}
                      onClick={() => navigate(`/admin/operations-room/b2b`)}
                      className="flex items-center justify-between p-3 rounded-lg bg-yellow-50 hover:bg-yellow-100 cursor-pointer transition-colors border border-yellow-100"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{auction.title}</p>
                        <p className="text-xs text-yellow-600">
                          {Math.floor(auction.hours_left)} ساعة متبقية | {auction.current_bids} عرض
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-yellow-600" />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-3">لا توجد مزادات قريبة الإغلاق</p>
              )}
            </div>

            {/* Button to B2B Operations Room */}
            <button
              onClick={() => navigate('/admin/operations-room/b2b')}
              className="w-full py-3 px-4 bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-xl font-semibold hover:from-amber-700 hover:to-amber-800 transition-all flex items-center justify-center gap-2"
            >
              <Radar className="w-5 h-5" />
              غرفة عمليات المزادات
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
