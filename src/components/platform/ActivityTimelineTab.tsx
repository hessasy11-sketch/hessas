import { Clock, CheckCircle2, AlertCircle, DollarSign, Wrench, FileText, Upload, XCircle, Activity } from 'lucide-react';
import { useActivityTimeline, TimelineEvent } from '../../hooks/useActivityTimeline';

interface ActivityTimelineTabProps {
  farmId: string;
}

export default function ActivityTimelineTab({ farmId }: ActivityTimelineTabProps) {
  const { events, loading, error } = useActivityTimeline(farmId);

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'task_created':
        return <FileText className="w-5 h-5 text-blue-500" />;
      case 'task_status_changed':
        return <Activity className="w-5 h-5 text-amber-500" />;
      case 'proof_uploaded':
        return <Upload className="w-5 h-5 text-purple-500" />;
      case 'task_approved':
        return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'task_rejected':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'expense_added':
        return <DollarSign className="w-5 h-5 text-rose-500" />;
      case 'equipment_added':
        return <Wrench className="w-5 h-5 text-slate-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getEventTitle = (event: TimelineEvent) => {
    switch (event.event_type) {
      case 'task_created':
        return 'إنشاء مهمة جديدة';
      case 'task_status_changed':
        return 'تغيير حالة مهمة';
      case 'proof_uploaded':
        return 'رفع إثبات';
      case 'task_approved':
        return 'اعتماد مهمة';
      case 'task_rejected':
        return 'رفض مهمة';
      case 'expense_added':
        return 'إضافة مصروف';
      case 'equipment_added':
        return 'إضافة معدة';
      default:
        return event.event_type;
    }
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'task_created':
        return 'border-blue-200 bg-blue-50';
      case 'task_status_changed':
        return 'border-amber-200 bg-amber-50';
      case 'proof_uploaded':
        return 'border-purple-200 bg-purple-50';
      case 'task_approved':
        return 'border-emerald-200 bg-emerald-50';
      case 'task_rejected':
        return 'border-red-200 bg-red-50';
      case 'expense_added':
        return 'border-rose-200 bg-rose-50';
      case 'equipment_added':
        return 'border-slate-200 bg-slate-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const renderEventDetails = (event: TimelineEvent) => {
    const data = event.event_data;

    switch (event.event_type) {
      case 'task_created':
        return (
          <div className="mt-2 space-y-1">
            <p className="text-sm text-slate-700">
              <span className="font-medium">المهمة:</span> {data.task_title}
            </p>
            {data.assigned_to && (
              <p className="text-sm text-slate-600">
                <span className="font-medium">المكلف:</span> {data.assigned_to}
              </p>
            )}
          </div>
        );

      case 'task_status_changed':
        return (
          <div className="mt-2 space-y-1">
            <p className="text-sm text-slate-700">
              <span className="font-medium">المهمة:</span> {data.task_title}
            </p>
            <div className="flex items-center gap-2 text-sm">
              <span className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded">
                {getStatusLabel(data.old_status)}
              </span>
              <span className="text-gray-400">←</span>
              <span className="px-2 py-0.5 bg-blue-200 text-blue-700 rounded">
                {getStatusLabel(data.new_status)}
              </span>
            </div>
          </div>
        );

      case 'proof_uploaded':
        return (
          <div className="mt-2 space-y-1">
            <p className="text-sm text-slate-700">
              <span className="font-medium">المهمة:</span> {data.task_title}
            </p>
            <p className="text-sm text-slate-600">
              {data.file_count} ملف
            </p>
          </div>
        );

      case 'task_approved':
      case 'task_rejected':
        return (
          <div className="mt-2 space-y-1">
            <p className="text-sm text-slate-700">
              <span className="font-medium">المهمة:</span> {data.task_title}
            </p>
            {data.notes && (
              <p className="text-sm text-slate-600 italic">
                "{data.notes}"
              </p>
            )}
          </div>
        );

      case 'expense_added':
        return (
          <div className="mt-2 space-y-1">
            <p className="text-sm text-slate-700">
              <span className="font-medium">المبلغ:</span> {data.amount} ريال
            </p>
            {data.description && (
              <p className="text-sm text-slate-600">
                {data.description}
              </p>
            )}
          </div>
        );

      case 'equipment_added':
        return (
          <div className="mt-2 space-y-1">
            <p className="text-sm text-slate-700">
              <span className="font-medium">المعدة:</span> {data.equipment_name}
            </p>
            {data.quantity && (
              <p className="text-sm text-slate-600">
                الكمية: {data.quantity}
              </p>
            )}
            {data.cost && (
              <p className="text-sm text-slate-600">
                التكلفة: {data.cost} ريال
              </p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'قيد الانتظار';
      case 'in_progress':
        return 'جاري العمل';
      case 'completed':
        return 'مكتمل';
      case 'cancelled':
        return 'ملغى';
      default:
        return status;
    }
  };

  const formatTime = (timestamp: string) => {
    try {
      const now = new Date();
      const eventTime = new Date(timestamp);
      const diff = now.getTime() - eventTime.getTime();
      const seconds = Math.floor(diff / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (days > 0) {
        return `منذ ${days} ${days === 1 ? 'يوم' : 'أيام'}`;
      } else if (hours > 0) {
        return `منذ ${hours} ${hours === 1 ? 'ساعة' : 'ساعات'}`;
      } else if (minutes > 0) {
        return `منذ ${minutes} ${minutes === 1 ? 'دقيقة' : 'دقائق'}`;
      } else {
        return 'منذ قليل';
      }
    } catch {
      return 'منذ وقت قريب';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-slate-600">جاري تحميل السجل الزمني...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <p className="text-red-700 font-medium">فشل تحميل السجل الزمني</p>
        <p className="text-sm text-red-600 mt-1">{error}</p>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-12 text-center">
        <Clock className="w-16 h-16 text-slate-400 mx-auto mb-4" />
        <p className="text-slate-600 font-medium text-lg">لا توجد أحداث بعد</p>
        <p className="text-sm text-slate-500 mt-2">
          سيتم عرض جميع الأنشطة والأحداث هنا
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-800">السجل الزمني</h3>
          <p className="text-sm text-slate-600 mt-1">
            {events.length} حدث مسجل
          </p>
        </div>
      </div>

      <div className="relative">
        {/* Timeline vertical line */}
        <div className="absolute right-6 top-0 bottom-0 w-0.5 bg-slate-200" />

        {/* Events */}
        <div className="space-y-6">
          {events.map((event, index) => (
            <div key={event.id} className="relative">
              {/* Timeline dot */}
              <div className="absolute right-3.5 top-3 w-5 h-5 rounded-full bg-white border-2 border-emerald-500 z-10" />

              {/* Event card */}
              <div className={`mr-14 border-2 rounded-lg p-4 ${getEventColor(event.event_type)}`}>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getEventIcon(event.event_type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-semibold text-slate-800">
                        {getEventTitle(event)}
                      </h4>
                      <span className="text-xs text-slate-500 flex-shrink-0 mr-2">
                        {formatTime(event.created_at)}
                      </span>
                    </div>

                    <p className="text-sm text-slate-600 mb-2">
                      بواسطة: <span className="font-medium">{event.actor_name}</span>
                    </p>

                    {renderEventDetails(event)}

                    {event.reference_type && (
                      <div className="mt-3 pt-3 border-t border-slate-200">
                        <p className="text-xs text-slate-500">
                          مرجع: {event.reference_type} - {event.reference_id?.substring(0, 8)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
