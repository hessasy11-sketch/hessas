import { useExecutivePulse } from '../../hooks/useExecutivePulse';
import { Activity, AlertTriangle, DollarSign, Calendar, Clock, TrendingUp, CheckCircle, XCircle } from 'lucide-react';

export default function ExecutivePulse() {
  const { data, loading, error } = useExecutivePulse();

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
            <p className="text-sm font-medium">{formatDate(data.last_updated)}</p>
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
          <p className="text-4xl font-bold text-gray-900">{data.active_farms}</p>
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
          <p className="text-4xl font-bold text-gray-900">{data.struggling_farms}</p>
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
            {formatCurrency(data.total_expenses)}
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
          <p className="text-4xl font-bold text-gray-900">{data.bookings_today}</p>
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
          <p className="text-4xl font-bold text-gray-900">{data.pending_decisions}</p>
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
            {data.active_farms + data.bookings_today}
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
          {data.recent_events && data.recent_events.length > 0 ? (
            <div className="space-y-4">
              {data.recent_events.map((event, index) => (
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
                    {index < data.recent_events.length - 1 && (
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
    </div>
  );
}
