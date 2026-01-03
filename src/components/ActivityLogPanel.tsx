import { History, Clock, Bot, User, ChevronDown, ChevronUp, AlertCircle, TrendingUp } from 'lucide-react';
import { useActivityLog } from '../hooks/useActivityLog';
import { useState } from 'react';

interface ActivityLogPanelProps {
  auctionId: string;
  isOwner: boolean;
}

export function ActivityLogPanel({ auctionId, isOwner }: ActivityLogPanelProps) {
  const { activities, stats, loading } = useActivityLog(auctionId);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAll, setShowAll] = useState(false);

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-gray-600">
          <History className="w-5 h-5 animate-spin" />
          <span>جاري تحميل سجل النشاط...</span>
        </div>
      </div>
    );
  }

  if (!isOwner || activities.length === 0) {
    return null;
  }

  const displayedActivities = showAll ? activities : activities.slice(0, 3);

  const getActivityIcon = (activityType: string, isAi: boolean) => {
    if (isAi) {
      return <Bot className="w-4 h-4 text-purple-600" />;
    }

    switch (activityType) {
      case 'close_auction':
      case 'open_auction':
        return <AlertCircle className="w-4 h-4 text-blue-600" />;
      case 'extend_auction':
        return <Clock className="w-4 h-4 text-orange-600" />;
      case 'mark_sold':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'share_auction':
        return <User className="w-4 h-4 text-gray-600" />;
      default:
        return <History className="w-4 h-4 text-gray-600" />;
    }
  };

  const getActivityColor = (activityType: string, isAi: boolean) => {
    if (isAi) return 'bg-purple-50 border-purple-200';

    switch (activityType) {
      case 'close_auction':
      case 'open_auction':
        return 'bg-blue-50 border-blue-200';
      case 'extend_auction':
        return 'bg-orange-50 border-orange-200';
      case 'mark_sold':
        return 'bg-green-50 border-green-200';
      case 'share_auction':
        return 'bg-gray-50 border-gray-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
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
    if (diffDays < 7) return `منذ ${diffDays} يوم`;

    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 p-2 rounded-lg">
            <History className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-right">
            <h3 className="font-bold text-gray-900">سجل نشاط المزاد</h3>
            {stats && (
              <p className="text-sm text-gray-600">
                {stats.total_actions} إجراء ({stats.ai_actions} ذكي، {stats.manual_actions} يدوي)
              </p>
            )}
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-600" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-600" />
        )}
      </button>

      {isExpanded && (
        <div className="border-t border-gray-200 p-4 space-y-3">
          {displayedActivities.map((activity) => (
            <div
              key={activity.id}
              className={`border rounded-lg p-3 ${getActivityColor(activity.activity_type, activity.is_ai_action)}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <div className="mt-1">
                    {getActivityIcon(activity.activity_type, activity.is_ai_action)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-gray-900">{activity.activity_name_ar}</span>
                      {activity.is_ai_action && (
                        <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded-full">
                          AI {activity.ai_confidence ? `${Math.round(activity.ai_confidence)}%` : ''}
                        </span>
                      )}
                      {activity.can_rollback && (
                        <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full">
                          قابل للتراجع
                        </span>
                      )}
                    </div>
                    {activity.description_ar && (
                      <p className="text-sm text-gray-700 mb-1">{activity.description_ar}</p>
                    )}
                    {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                      <div className="text-xs text-gray-600 bg-white/50 rounded px-2 py-1 mt-2">
                        <details>
                          <summary className="cursor-pointer font-medium">تفاصيل إضافية</summary>
                          <pre className="mt-2 text-right" dir="rtl">
                            {JSON.stringify(activity.metadata, null, 2)}
                          </pre>
                        </details>
                      </div>
                    )}
                  </div>
                </div>
                <span className="text-xs text-gray-500 whitespace-nowrap">
                  {formatDate(activity.created_at)}
                </span>
              </div>
            </div>
          ))}

          {activities.length > 3 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="w-full py-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {showAll ? 'عرض أقل' : `عرض الكل (${activities.length})`}
            </button>
          )}

          {stats && (
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-3 mt-4">
              <h4 className="font-bold text-gray-900 mb-2 text-sm">إحصائيات النشاط</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-white rounded-lg p-2">
                  <div className="text-gray-600">إجمالي الإجراءات</div>
                  <div className="text-xl font-bold text-gray-900">{stats.total_actions}</div>
                </div>
                <div className="bg-white rounded-lg p-2">
                  <div className="text-gray-600">إجراءات ذكية</div>
                  <div className="text-xl font-bold text-purple-600">{stats.ai_actions}</div>
                </div>
                <div className="bg-white rounded-lg p-2">
                  <div className="text-gray-600">إجراءات يدوية</div>
                  <div className="text-xl font-bold text-blue-600">{stats.manual_actions}</div>
                </div>
                <div className="bg-white rounded-lg p-2">
                  <div className="text-gray-600">آخر نشاط</div>
                  <div className="text-xs font-bold text-gray-900">
                    {formatDate(stats.last_activity)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
