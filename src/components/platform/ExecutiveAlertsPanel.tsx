import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExecutiveAlerts } from '../../hooks/useExecutiveAlerts';
import {
  Bell,
  AlertTriangle,
  AlertCircle,
  Info,
  X,
  ChevronDown,
  ChevronUp,
  DollarSign,
  TrendingDown,
  Clock,
  Gavel,
  ExternalLink
} from 'lucide-react';

export default function ExecutiveAlertsPanel() {
  const { data, loading, dismissAlert } = useExecutiveAlerts();
  const [expanded, setExpanded] = useState(true);
  const [dismissing, setDismissing] = useState<string | null>(null);
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="mr-3 text-gray-600">جاري تحميل التنبيهات...</span>
        </div>
      </div>
    );
  }

  if (!data || data.stats.total === 0) {
    return (
      <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-2xl shadow-sm border border-green-200 p-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-600 to-green-700 flex items-center justify-center">
            <Bell className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-green-900">لا توجد تنبيهات حرجة</h3>
            <p className="text-sm text-green-600">جميع الأمور تسير بشكل طبيعي</p>
          </div>
        </div>
      </div>
    );
  }

  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case 'critical':
        return {
          icon: AlertTriangle,
          color: 'red',
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-900',
          badge: 'bg-red-100 text-red-700',
          iconBg: 'from-red-600 to-red-700'
        };
      case 'high':
        return {
          icon: AlertCircle,
          color: 'orange',
          bg: 'bg-orange-50',
          border: 'border-orange-200',
          text: 'text-orange-900',
          badge: 'bg-orange-100 text-orange-700',
          iconBg: 'from-orange-600 to-orange-700'
        };
      default:
        return {
          icon: Info,
          color: 'yellow',
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          text: 'text-yellow-900',
          badge: 'bg-yellow-100 text-yellow-700',
          iconBg: 'from-yellow-600 to-yellow-700'
        };
    }
  };

  const getAlertTypeIcon = (type: string) => {
    switch (type) {
      case 'expense_exceeded':
        return DollarSign;
      case 'farm_performance_drop':
        return TrendingDown;
      case 'decision_overdue':
        return Clock;
      case 'auction_conflict':
        return Gavel;
      default:
        return Bell;
    }
  };

  const getAlertTypeLabel = (type: string) => {
    switch (type) {
      case 'expense_exceeded':
        return 'مصروف متجاوز';
      case 'farm_performance_drop':
        return 'انخفاض أداء';
      case 'decision_overdue':
        return 'قرار متأخر';
      case 'auction_conflict':
        return 'تعارض مزاد';
      default:
        return 'تنبيه';
    }
  };

  const handleDismiss = async (alertId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (dismissing) return;

    const staffId = localStorage.getItem('staff_session_id');
    if (!staffId) return;

    try {
      setDismissing(alertId);
      await dismissAlert(alertId, staffId);
    } catch (error) {
      console.error('Failed to dismiss alert:', error);
    } finally {
      setDismissing(null);
    }
  };

  const handleAlertClick = (alert: any) => {
    if (alert.farm_id) {
      navigate(`/admin/operations-room/b2f/farms/${alert.farm_id}`);
    } else if (alert.auction_id) {
      navigate('/admin/operations-room/b2b');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    const diffDays = Math.floor(diffMs / 86400000);
    return `منذ ${diffDays} يوم`;
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div
        className="bg-gradient-to-r from-red-50 to-orange-50 p-6 border-b border-red-100 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center relative">
              <Bell className="w-5 h-5 text-white" />
              {data.stats.critical > 0 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-white">{data.stats.critical}</span>
                </div>
              )}
            </div>
            <div>
              <h3 className="text-xl font-bold text-red-900 flex items-center gap-2">
                التنبيهات القيادية الحرجة
                <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-lg text-sm font-semibold">
                  {data.stats.total}
                </span>
              </h3>
              <p className="text-sm text-red-600">
                {data.stats.critical > 0 && `${data.stats.critical} حرج`}
                {data.stats.critical > 0 && data.stats.high > 0 && ' • '}
                {data.stats.high > 0 && `${data.stats.high} عالي`}
                {(data.stats.critical > 0 || data.stats.high > 0) && data.stats.medium > 0 && ' • '}
                {data.stats.medium > 0 && `${data.stats.medium} متوسط`}
              </p>
            </div>
          </div>
          <button
            className="w-8 h-8 rounded-lg hover:bg-red-100 flex items-center justify-center transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
          >
            {expanded ? (
              <ChevronUp className="w-5 h-5 text-red-700" />
            ) : (
              <ChevronDown className="w-5 h-5 text-red-700" />
            )}
          </button>
        </div>
      </div>

      {/* Alerts List */}
      {expanded && (
        <div className="p-6 space-y-3 max-h-[600px] overflow-y-auto">
          {data.alerts.map((alert) => {
            const config = getSeverityConfig(alert.severity);
            const SeverityIcon = config.icon;
            const TypeIcon = getAlertTypeIcon(alert.alert_type);

            return (
              <div
                key={alert.id}
                onClick={() => handleAlertClick(alert)}
                className={`${config.bg} ${config.border} border rounded-xl p-4 hover:shadow-md transition-all cursor-pointer group relative`}
              >
                {/* Dismiss Button */}
                <button
                  onClick={(e) => handleDismiss(alert.id, e)}
                  disabled={dismissing === alert.id}
                  className="absolute top-3 left-3 w-6 h-6 rounded-lg bg-white/80 hover:bg-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  title="رفض التنبيه"
                >
                  {dismissing === alert.id ? (
                    <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <X className="w-4 h-4 text-gray-600" />
                  )}
                </button>

                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${config.iconBg} flex items-center justify-center flex-shrink-0`}>
                    <SeverityIcon className="w-5 h-5 text-white" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className={`font-bold ${config.text}`}>{alert.title}</h4>
                          <span className={`px-2 py-0.5 ${config.badge} rounded text-xs font-medium`}>
                            {getAlertTypeLabel(alert.alert_type)}
                          </span>
                        </div>
                        <p className={`text-sm ${config.text} opacity-90 leading-relaxed`}>
                          {alert.description}
                        </p>
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-3 text-xs">
                        {alert.farm_name && (
                          <span className={`${config.text} opacity-75 flex items-center gap-1`}>
                            <TypeIcon className="w-3 h-3" />
                            {alert.farm_name}
                          </span>
                        )}
                        <span className={`${config.text} opacity-60`}>
                          {formatDate(alert.created_at)}
                        </span>
                      </div>

                      {(alert.farm_id || alert.auction_id) && (
                        <div className={`flex items-center gap-1 ${config.text} opacity-75 text-xs group-hover:opacity-100`}>
                          <span>عرض التفاصيل</span>
                          <ExternalLink className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
