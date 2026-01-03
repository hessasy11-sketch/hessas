import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { AlertTriangle, FileText, Clock, Sprout, Users, AlertCircle, Eye, CheckCircle, X } from 'lucide-react';

interface Alert {
  id: string;
  alert_type: string;
  title: string;
  description: string;
  severity: string;
  related_entity_type: string | null;
  related_entity_id: string | null;
  section: string | null;
  created_at: string;
}

export default function CriticalAlertsView() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | null>(null);

  useEffect(() => {
    loadAlerts();
  }, [filter]);

  const loadAlerts = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase.rpc('get_active_alerts', {
        p_severity: filter,
        p_limit: 100
      });

      if (error) throw error;
      setAlerts(data || []);
    } catch (error) {
      console.error('Error loading alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAlertIcon = (type: string) => {
    const icons: Record<string, any> = {
      unreviewed_reports: FileText,
      overdue_tasks: Clock,
      farms_without_manager: Sprout,
      pending_requests: Users,
      system_error: AlertCircle
    };
    return icons[type] || AlertTriangle;
  };

  const getAlertColor = (severity: string) => {
    const colors: Record<string, any> = {
      critical: {
        bg: 'from-red-50 to-rose-50',
        border: 'border-red-300',
        icon: 'bg-red-600',
        text: 'text-red-900',
        badge: 'bg-red-100 text-red-800'
      },
      high: {
        bg: 'from-orange-50 to-amber-50',
        border: 'border-orange-300',
        icon: 'bg-orange-600',
        text: 'text-orange-900',
        badge: 'bg-orange-100 text-orange-800'
      },
      medium: {
        bg: 'from-yellow-50 to-amber-50',
        border: 'border-yellow-300',
        icon: 'bg-yellow-600',
        text: 'text-yellow-900',
        badge: 'bg-yellow-100 text-yellow-800'
      },
      low: {
        bg: 'from-blue-50 to-sky-50',
        border: 'border-blue-300',
        icon: 'bg-blue-600',
        text: 'text-blue-900',
        badge: 'bg-blue-100 text-blue-800'
      }
    };
    return colors[severity] || colors.medium;
  };

  const getSeverityLabel = (severity: string) => {
    const labels: Record<string, string> = {
      critical: 'حرج',
      high: 'مرتفع',
      medium: 'متوسط',
      low: 'منخفض'
    };
    return labels[severity] || severity;
  };

  const getAlertTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      unreviewed_reports: 'تقارير لم تُراجع',
      overdue_tasks: 'مهام متأخرة',
      farms_without_manager: 'مزارع بدون مدير',
      pending_requests: 'طلبات متراكمة',
      system_error: 'خطأ نظامي'
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل التنبيهات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* تنبيه */}
      <div className="bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-200 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <Eye className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-red-900 mb-2">عرض التنبيهات فقط (بدون تنفيذ)</h3>
            <p className="text-sm text-red-800 leading-relaxed">
              هذه الصفحة تعرض التنبيهات الحرجة. للإجراءات التنفيذية، انتقل للأقسام المتخصصة.
            </p>
          </div>
        </div>
      </div>

      {/* الفلاتر */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-bold text-gray-700">تصفية حسب الأولوية:</span>
          <button
            onClick={() => setFilter(null)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === null
                ? 'bg-slate-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            الكل ({alerts.length})
          </button>
          <button
            onClick={() => setFilter('critical')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === 'critical'
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            حرج
          </button>
          <button
            onClick={() => setFilter('high')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === 'high'
                ? 'bg-orange-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            مرتفع
          </button>
          <button
            onClick={() => setFilter('medium')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === 'medium'
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            متوسط
          </button>
        </div>
      </div>

      {/* إحصائيات */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {['critical', 'high', 'medium', 'low'].map((severity) => {
          const count = alerts.filter(a => a.severity === severity).length;
          const colors = getAlertColor(severity);
          return (
            <div key={severity} className={`bg-gradient-to-br ${colors.bg} border-2 ${colors.border} rounded-xl p-5`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium mb-1" style={{ color: colors.text.replace('text-', '') }}>
                    {getSeverityLabel(severity)}
                  </div>
                  <div className="text-3xl font-bold" style={{ color: colors.text.replace('text-', '') }}>
                    {count}
                  </div>
                </div>
                <AlertTriangle className="w-10 h-10 opacity-40" style={{ color: colors.text.replace('text-', '') }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* قائمة التنبيهات */}
      <div className="space-y-4">
        {alerts.length === 0 ? (
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-xl p-12 text-center">
            <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-emerald-900 mb-2">لا توجد تنبيهات</h3>
            <p className="text-emerald-700">جميع الأمور تسير بشكل طبيعي ✓</p>
          </div>
        ) : (
          alerts.map((alert) => {
            const Icon = getAlertIcon(alert.alert_type);
            const colors = getAlertColor(alert.severity);

            return (
              <div
                key={alert.id}
                className={`bg-gradient-to-r ${colors.bg} border-2 ${colors.border} rounded-xl p-6 hover:shadow-lg transition-all`}
              >
                <div className="flex items-start gap-4">
                  {/* الأيقونة */}
                  <div className={`w-14 h-14 ${colors.icon} rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>

                  {/* المحتوى */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1">
                        <h4 className={`text-lg font-bold ${colors.text} mb-1`}>{alert.title}</h4>
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${colors.badge}`}>
                            {getSeverityLabel(alert.severity)}
                          </span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                            {getAlertTypeLabel(alert.alert_type)}
                          </span>
                          {alert.section && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
                              {alert.section === 'b2f' ? 'استثمار الأشجار' : alert.section}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(alert.created_at).toLocaleString('ar-SA')}
                      </div>
                    </div>

                    <p className="text-sm text-gray-700 mb-4 leading-relaxed">
                      {alert.description}
                    </p>

                    <div className="flex items-center gap-3">
                      <button className="px-4 py-2 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 transition-all flex items-center gap-2">
                        <Eye className="w-4 h-4" />
                        عرض التفاصيل
                      </button>
                      <button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-all flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        تعليم كمحلول
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* إرشادات الانتقال للتنفيذ */}
      <div className="bg-gradient-to-r from-gray-50 to-slate-50 border-2 border-gray-200 rounded-xl p-6">
        <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          للمعالجة الفعلية للتنبيهات:
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="font-bold text-gray-900 mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              التقارير غير المقروءة
            </div>
            <p className="text-gray-600 mb-2">اذهب إلى:</p>
            <code className="text-xs bg-gray-100 px-2 py-1 rounded block">
              إدارة التشغيل → اختر المزرعة → إدارة المزرعة
            </code>
          </div>

          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="font-bold text-gray-900 mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-600" />
              المهام المتأخرة
            </div>
            <p className="text-gray-600 mb-2">اذهب إلى:</p>
            <code className="text-xs bg-gray-100 px-2 py-1 rounded block">
              إدارة التشغيل → اختر المزرعة → اعتمادات المشرفين
            </code>
          </div>

          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="font-bold text-gray-900 mb-2 flex items-center gap-2">
              <Sprout className="w-4 h-4 text-emerald-600" />
              مزارع بدون مدير
            </div>
            <p className="text-gray-600 mb-2">اذهب إلى:</p>
            <code className="text-xs bg-gray-100 px-2 py-1 rounded block">
              إدارة التشغيل → اختر المزرعة → إدارة فريق المزرعة
            </code>
          </div>

          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="font-bold text-gray-900 mb-2 flex items-center gap-2">
              <Users className="w-4 h-4 text-teal-600" />
              طلبات متراكمة
            </div>
            <p className="text-gray-600 mb-2">اذهب إلى:</p>
            <code className="text-xs bg-gray-100 px-2 py-1 rounded block">
              لوحة B2F → قسم المبيعات/المالية
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}
