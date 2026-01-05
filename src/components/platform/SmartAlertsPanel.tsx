import { AlertTriangle, Info, AlertCircle, Loader2, RefreshCw, CheckCircle, X } from 'lucide-react';
import { useSmartAlerts } from '../../hooks/useSmartAlerts';
import { useState } from 'react';

export default function SmartAlertsPanel() {
  const { alerts, summary, loading, generateAlerts, resolveAlert } = useSmartAlerts();
  const [generating, setGenerating] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const getSeverityConfig = (severity: string) => {
    const configs: Record<string, any> = {
      info: {
        icon: Info,
        color: 'bg-blue-100 text-blue-700 border-blue-200'
      },
      warning: {
        icon: AlertCircle,
        color: 'bg-yellow-100 text-yellow-700 border-yellow-200'
      },
      critical: {
        icon: AlertTriangle,
        color: 'bg-red-100 text-red-700 border-red-200'
      }
    };
    return configs[severity] || configs.info;
  };

  const handleGenerate = async () => {
    setGenerating(true);
    const result = await generateAlerts();
    setGenerating(false);

    if (result.success) {
      alert('تم توليد التنبيهات بنجاح');
    } else {
      alert('حدث خطأ: ' + result.error);
    }
  };

  const handleResolve = async (alertId: string) => {
    if (!confirm('هل تريد تحديد هذا التنبيه كمحلول؟')) return;

    setResolvingId(alertId);
    const result = await resolveAlert(alertId);
    setResolvingId(null);

    if (result.success) {
      alert('تم حل التنبيه بنجاح');
    } else {
      alert('حدث خطأ: ' + result.error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Generate Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">التنبيهات الذكية</h3>
          {summary && (
            <p className="text-sm text-gray-600">
              إجمالي: {summary.by_severity.total} تنبيه ({summary.by_severity.critical} حرجة، {summary.by_severity.warning} تحذير، {summary.by_severity.info} معلومة)
            </p>
          )}
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:bg-gray-300 transition-colors"
        >
          {generating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          توليد التنبيهات
        </button>
      </div>

      {/* Alerts List */}
      <div className="space-y-4">
        {alerts.map((alert) => {
          const config = getSeverityConfig(alert.severity);
          const Icon = config.icon;

          return (
            <div
              key={alert.id}
              className={`flex items-center gap-4 p-6 rounded-xl border-2 ${config.color} group`}
            >
              <div className="w-12 h-12 rounded-full bg-white/50 flex items-center justify-center flex-shrink-0">
                <Icon className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-lg">{alert.message}</p>
                <p className="text-xs opacity-75 mt-1">
                  {new Date(alert.created_at).toLocaleString('ar-SA')}
                </p>
              </div>
              <button
                onClick={() => handleResolve(alert.id)}
                disabled={resolvingId === alert.id}
                className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 px-3 py-2 bg-white/80 hover:bg-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {resolvingId === alert.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    حل
                  </>
                )}
              </button>
            </div>
          );
        })}

        {alerts.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <Info className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">لا توجد تنبيهات نشطة</p>
            <button
              onClick={handleGenerate}
              className="mt-4 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"
            >
              توليد التنبيهات
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
