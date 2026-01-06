import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  Lock,
  Unlock,
  Clock,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  User,
  History,
  Activity
} from 'lucide-react';
import { FarmRadarData } from '../../hooks/useFarmRadar';
import FarmDecisionActionsMenu from './FarmDecisionActionsMenu';

interface FarmRadarCardProps {
  farm: FarmRadarData;
}

export default function FarmRadarCard({ farm }: FarmRadarCardProps) {
  const navigate = useNavigate();

  const CURRENT_STAFF_ID = '00000000-0000-0000-0000-000000000001';

  const getTimeAgo = (dateString: string | null) => {
    if (!dateString) return 'لا يوجد نشاط';

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    return `منذ ${diffDays} يوم`;
  };

  const getBorderColor = () => {
    if (farm.overdue_tasks_count > 0) return 'border-red-300';
    if (farm.pending_tasks_count > 0) return 'border-amber-300';
    return 'border-slate-200';
  };

  const handleOpenDashboard = () => {
    navigate(`/admin/b2f/farm-command/farms/${farm.id}`);
  };

  const handleOpenTimeline = () => {
    navigate(`/admin/b2f/farms/${farm.id}?tab=timeline`);
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'task_created':
        return '🆕';
      case 'proof_uploaded':
        return '📤';
      case 'task_approved':
        return '✅';
      case 'task_rejected':
        return '❌';
      case 'farm_created':
        return '🌱';
      default:
        return '📝';
    }
  };

  const getEventTypeName = (eventType: string) => {
    switch (eventType) {
      case 'task_created':
        return 'إنشاء مهمة';
      case 'proof_uploaded':
        return 'رفع إثبات';
      case 'task_approved':
        return 'اعتماد مهمة';
      case 'task_rejected':
        return 'رفض مهمة';
      case 'farm_created':
        return 'إنشاء مزرعة';
      default:
        return 'حدث';
    }
  };

  return (
    <div
      className={`bg-white rounded-xl border-2 ${getBorderColor()} p-4 hover:shadow-lg transition-all duration-200`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
            {farm.name}
            {farm.status === 'active' ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-slate-400" />
            )}
          </h3>
          <p className="text-sm text-slate-500 flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {farm.location}
          </p>
        </div>

        <FarmDecisionActionsMenu
          farm={{
            id: farm.id,
            name: farm.name,
            bookings_enabled: farm.bookings_enabled
          }}
          requestedBy={CURRENT_STAFF_ID}
        />
      </div>

      <div className="mb-3">
        {farm.farm_manager_name ? (
          <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
            <User className="w-4 h-4 text-emerald-600" />
            <span className="text-sm text-emerald-700 font-medium">
              {farm.farm_manager_name}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg">
            <User className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-500">غير معيّن</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-slate-50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-600">حالة الحجوزات</span>
            {farm.bookings_enabled ? (
              <Unlock className="w-4 h-4 text-emerald-500" />
            ) : (
              <Lock className="w-4 h-4 text-red-500" />
            )}
          </div>
          <div className={`text-sm font-bold ${farm.bookings_enabled ? 'text-emerald-600' : 'text-red-600'}`}>
            {farm.bookings_enabled ? 'مفتوحة' : 'مغلقة'}
          </div>
        </div>

        <div className="bg-slate-50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-600">مهام معلقة</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-lg font-bold text-amber-600">
            {farm.pending_tasks_count}
          </div>
        </div>

        <div className="bg-slate-50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-600">مهام متأخرة</span>
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </div>
          <div className={`text-lg font-bold ${farm.overdue_tasks_count > 0 ? 'text-red-600' : 'text-slate-400'}`}>
            {farm.overdue_tasks_count}
          </div>
        </div>

        <div className="bg-slate-50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-600">آخر نشاط</span>
            <CheckCircle className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xs font-medium text-slate-600">
            {getTimeAgo(farm.last_activity)}
          </div>
        </div>
      </div>

      {/* Last Timeline Event */}
      {farm.last_timeline_event ? (
        <div className="mb-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <div className="text-2xl mt-0.5">
              {getEventIcon(farm.last_timeline_event.event_type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-blue-700">
                  آخر حدث تشغيل
                </span>
                <span className="text-xs text-blue-500">
                  {getTimeAgo(farm.last_timeline_event.created_at)}
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-800 mb-1 truncate">
                {farm.last_timeline_event.description}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600">
                  {farm.last_timeline_event.actor_name}
                </span>
                <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                  {getEventTypeName(farm.last_timeline_event.event_type)}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-3 bg-slate-50 border-2 border-slate-200 rounded-lg p-3 text-center">
          <Activity className="w-6 h-6 text-slate-400 mx-auto mb-1" />
          <p className="text-xs text-slate-500">لا توجد أحداث حتى الآن</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={handleOpenTimeline}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-bold transition-colors"
        >
          <History className="w-4 h-4" />
          <span>السجل الزمني</span>
        </button>
        <button
          onClick={handleOpenDashboard}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg font-bold hover:from-emerald-600 hover:to-emerald-700 transition-all duration-200 shadow-md hover:shadow-lg"
        >
          <span>لوحة المزرعة</span>
          <ExternalLink className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
