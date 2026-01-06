import { useEffect } from 'react';
import {
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Calendar,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { useFarmDailySummary } from '../../hooks/useFarmDailySummary';

interface FarmDailySummaryCardProps {
  farmId: string;
  onTasksChange?: () => void;
}

export default function FarmDailySummaryCard({ farmId, onTasksChange }: FarmDailySummaryCardProps) {
  const { summary, loading, reload } = useFarmDailySummary(farmId, true);

  useEffect(() => {
    if (onTasksChange) {
      onTasksChange();
    }
  }, [summary]);

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 1) return 'الآن';
    if (minutes < 60) return `منذ ${minutes} دقيقة`;
    if (hours < 24) return `منذ ${hours} ساعة`;
    return 'منذ أكثر من يوم';
  };

  if (loading && !summary) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border-2 border-slate-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-200 rounded w-1/2"></div>
          <div className="space-y-3">
            <div className="h-16 bg-slate-100 rounded"></div>
            <div className="h-16 bg-slate-100 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border-2 border-slate-200 p-6">
        <p className="text-slate-600 text-center">لا توجد بيانات</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-white to-emerald-50 rounded-2xl shadow-lg border-2 border-emerald-200 overflow-hidden" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white bg-opacity-20 p-2 rounded-lg">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">ملخص تشغيل اليوم</h3>
              <p className="text-emerald-100 text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {new Date().toLocaleDateString('ar-SA', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>
          <button
            onClick={reload}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            title="تحديث"
          >
            <RefreshCw className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="p-6 space-y-4">
        {/* Row 1: Tasks Today */}
        <div className="grid grid-cols-2 gap-4">
          {/* New Tasks */}
          <div className="bg-white rounded-xl p-4 border-2 border-blue-200 hover:border-blue-400 transition-colors">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-blue-100 p-2 rounded-lg">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-sm font-medium text-slate-600">مهام جديدة</span>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-blue-600">
                {summary.tasks_created_today}
              </span>
              <span className="text-sm text-slate-500 mb-1">اليوم</span>
            </div>
          </div>

          {/* Completed Tasks */}
          <div className="bg-white rounded-xl p-4 border-2 border-emerald-200 hover:border-emerald-400 transition-colors">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-emerald-100 p-2 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <span className="text-sm font-medium text-slate-600">مهام مكتملة</span>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-emerald-600">
                {summary.tasks_completed_today}
              </span>
              <span className="text-sm text-slate-500 mb-1">اليوم</span>
            </div>
          </div>
        </div>

        {/* Row 2: Performance */}
        <div className="grid grid-cols-2 gap-4">
          {/* Overdue Tasks */}
          <div className="bg-white rounded-xl p-4 border-2 border-red-200 hover:border-red-400 transition-colors">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-red-100 p-2 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <span className="text-sm font-medium text-slate-600">مهام متأخرة</span>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-red-600">
                {summary.tasks_overdue}
              </span>
              <span className="text-sm text-slate-500 mb-1">مهمة</span>
            </div>
          </div>

          {/* Completion Rate */}
          <div className="bg-white rounded-xl p-4 border-2 border-purple-200 hover:border-purple-400 transition-colors">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-purple-100 p-2 rounded-lg">
                <Sparkles className="w-5 h-5 text-purple-600" />
              </div>
              <span className="text-sm font-medium text-slate-600">نسبة الإنجاز</span>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-purple-600">
                {summary.completion_rate}%
              </span>
              <span className="text-sm text-slate-500 mb-1">اليوم</span>
            </div>
          </div>
        </div>

        {/* Last Approval */}
        {summary.last_approval && (
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4 border-2 border-emerald-300">
            <div className="flex items-start gap-3">
              <div className="bg-emerald-500 p-2 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-bold text-emerald-900">آخر اعتماد</span>
                  <span className="text-xs text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">
                    {getTimeAgo(summary.last_approval.approved_at)}
                  </span>
                </div>
                <p className="text-slate-800 font-semibold mb-1">
                  {summary.last_approval.task_title}
                </p>
                <div className="flex items-center gap-4 text-sm text-slate-600">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {formatTime(summary.last_approval.approved_at)}
                  </span>
                  <span>بواسطة: {summary.last_approval.approved_by_name}</span>
                </div>
                {summary.last_approval.approval_notes && (
                  <p className="mt-2 text-sm text-slate-700 bg-white bg-opacity-50 p-2 rounded">
                    {summary.last_approval.approval_notes}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* No approvals yet */}
        {!summary.last_approval && (
          <div className="bg-slate-50 rounded-xl p-4 border-2 border-slate-200 text-center">
            <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm text-slate-600">لم يتم اعتماد أي مهمة حتى الآن</p>
          </div>
        )}
      </div>

      {/* Auto-refresh indicator */}
      <div className="bg-slate-50 px-6 py-2 border-t border-slate-200">
        <p className="text-xs text-slate-500 text-center flex items-center justify-center gap-2">
          <RefreshCw className="w-3 h-3" />
          يتم التحديث تلقائياً كل 30 ثانية
        </p>
      </div>
    </div>
  );
}
