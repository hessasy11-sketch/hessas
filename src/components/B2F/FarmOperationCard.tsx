import { useState } from 'react';
import {
  Play,
  Pause,
  Calendar,
  User,
  TreePine,
  DollarSign,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { OperationCard } from '../../hooks/useOperations';

interface FarmOperationCardProps {
  operation: OperationCard;
  onStartManually: (id: string) => void;
  onPause: (id: string) => void;
  onReschedule: (id: string, date: string, reason: string) => void;
}

export default function FarmOperationCard({
  operation,
  onStartManually,
  onPause,
  onReschedule
}: FarmOperationCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [reason, setReason] = useState('');

  const getStatusBadge = (status: string) => {
    const badges = {
      scheduled: { text: 'مجدول', gradient: 'from-blue-500 to-indigo-600', icon: Clock },
      active: { text: 'نشط', gradient: 'from-emerald-500 to-teal-600', icon: CheckCircle2 },
      paused: { text: 'متوقف', gradient: 'from-amber-500 to-orange-600', icon: Pause },
      completed: { text: 'مكتمل', gradient: 'from-gray-500 to-gray-600', icon: CheckCircle2 },
      cancelled: { text: 'ملغى', gradient: 'from-red-500 to-red-600', icon: AlertCircle },
    };
    const badge = badges[status as keyof typeof badges] || badges.scheduled;
    const Icon = badge.icon;

    return (
      <span className={`px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r ${badge.gradient} text-white shadow-sm flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {badge.text}
      </span>
    );
  };

  const getPaymentBadge = (status: string) => {
    const badges = {
      paid: { text: 'مدفوع', class: 'bg-emerald-100 text-emerald-800' },
      partial: { text: 'جزئي', class: 'bg-amber-100 text-amber-800' },
      pending: { text: 'معلق', class: 'bg-red-100 text-red-800' },
    };
    const badge = badges[status as keyof typeof badges] || badges.pending;

    return (
      <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${badge.class}`}>
        {badge.text}
      </span>
    );
  };

  const handleReschedule = () => {
    if (newDate && reason) {
      onReschedule(operation.id, newDate, reason);
      setShowRescheduleModal(false);
      setNewDate('');
      setReason('');
    }
  };

  return (
    <>
      <div className="bg-white rounded-2xl border-2 border-gray-100 p-5 hover:shadow-lg transition-all">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-gray-900">{operation.investor_name}</h4>
                <p className="text-sm text-gray-600">{operation.investor_phone}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {getStatusBadge(operation.operation_status)}
            {getPaymentBadge(operation.payment_status)}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-blue-50 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <TreePine className="w-4 h-4 text-blue-600" />
              <p className="text-xs text-blue-700 font-medium">الأشجار</p>
            </div>
            <p className="text-lg font-black text-blue-900">{operation.trees_count}</p>
          </div>

          <div className="bg-emerald-50 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <p className="text-xs text-emerald-700 font-medium">المبلغ</p>
            </div>
            <p className="text-sm font-bold text-emerald-900">{operation.total_amount.toLocaleString()} ر.س</p>
          </div>

          <div className="bg-amber-50 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="w-4 h-4 text-amber-600" />
              <p className="text-xs text-amber-700 font-medium">العقد</p>
            </div>
            <p className="text-xs font-bold text-amber-900">{operation.contract_number}</p>
          </div>

          <div className="bg-indigo-50 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <p className="text-xs text-indigo-700 font-medium">البداية</p>
            </div>
            <p className="text-xs font-bold text-indigo-900">
              {operation.scheduled_start_date
                ? new Date(operation.scheduled_start_date).toLocaleDateString('ar-SA')
                : 'غير محدد'}
            </p>
          </div>
        </div>

        {operation.ai_suggestions?.recommended_start_date && (
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-3 mb-4 border border-purple-100">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <p className="text-xs font-bold text-purple-900">اقتراح الذكاء الصناعي</p>
            </div>
            <p className="text-sm text-purple-800">
              تاريخ البداية المقترح: {new Date(operation.ai_suggestions.recommended_start_date).toLocaleDateString('ar-SA')}
            </p>
            {operation.ai_suggestions.optimal_season && (
              <p className="text-xs text-purple-700 mt-1">
                الموسم المثالي: {operation.ai_suggestions.optimal_season}
              </p>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          {operation.operation_status === 'scheduled' && (
            <button
              onClick={() => onStartManually(operation.id)}
              className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl py-2.5 px-4 font-bold hover:from-emerald-700 hover:to-teal-700 transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
            >
              <Play className="w-4 h-4" />
              بدء التشغيل يدوياً
            </button>
          )}

          {operation.operation_status === 'active' && (
            <button
              onClick={() => onPause(operation.id)}
              className="flex-1 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-xl py-2.5 px-4 font-bold hover:from-amber-700 hover:to-orange-700 transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
            >
              <Pause className="w-4 h-4" />
              إيقاف مؤقت
            </button>
          )}

          {(operation.operation_status === 'scheduled' || operation.operation_status === 'active') && (
            <button
              onClick={() => setShowRescheduleModal(true)}
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl py-2.5 px-4 font-bold hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
            >
              <Calendar className="w-4 h-4" />
              إعادة جدولة
            </button>
          )}

          <button
            onClick={() => setExpanded(!expanded)}
            className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-colors flex items-center gap-2"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {expanded ? 'إخفاء' : 'عرض التفاصيل'}
          </button>
        </div>

        {expanded && (
          <div className="mt-4 pt-4 border-t-2 border-gray-100 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-600 mb-1">تاريخ بداية العقد</p>
                <p className="text-sm font-bold text-gray-900">
                  {new Date(operation.contract_start_date).toLocaleDateString('ar-SA')}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">تاريخ نهاية العقد</p>
                <p className="text-sm font-bold text-gray-900">
                  {new Date(operation.contract_end_date).toLocaleDateString('ar-SA')}
                </p>
              </div>
            </div>

            {operation.actual_start_date && (
              <div>
                <p className="text-xs text-gray-600 mb-1">تاريخ البداية الفعلي</p>
                <p className="text-sm font-bold text-emerald-600">
                  {new Date(operation.actual_start_date).toLocaleDateString('ar-SA')}
                </p>
              </div>
            )}

            {operation.admin_notes && (
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-600 mb-1">ملاحظات الإدارة</p>
                <p className="text-sm text-gray-900">{operation.admin_notes}</p>
              </div>
            )}

            {operation.manual_actions_log && operation.manual_actions_log.length > 0 && (
              <div className="bg-blue-50 rounded-xl p-3">
                <p className="text-xs text-blue-700 font-bold mb-2">سجل الإجراءات اليدوية</p>
                <div className="space-y-2">
                  {operation.manual_actions_log.slice(0, 3).map((action: any, idx: number) => (
                    <div key={idx} className="text-xs text-blue-900">
                      <span className="font-semibold">{action.type}</span> - {action.description}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showRescheduleModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-6 h-6 text-blue-600" />
              إعادة جدولة التشغيل
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  التاريخ الجديد
                </label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  السبب
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  placeholder="اذكر سبب إعادة الجدولة..."
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleReschedule}
                  disabled={!newDate || !reason}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl py-3 font-bold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
                >
                  تأكيد إعادة الجدولة
                </button>
                <button
                  onClick={() => setShowRescheduleModal(false)}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
