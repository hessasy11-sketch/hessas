import { useState, useEffect } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  FileText,
  Building2,
  DollarSign,
  UserX,
  BanIcon,
  Clock,
  TrendingUp,
  Briefcase
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Decision {
  id: string;
  decision_type: string;
  farm_id: string | null;
  farm_name: string | null;
  farm_location: string | null;
  target_staff_id: string | null;
  target_staff_name: string | null;
  expense_amount: number | null;
  expense_description: string | null;
  action_data: any;
  status: string;
  priority: string;
  requested_by: string | null;
  requested_by_name: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  source_category: string;
  impact_type: string;
}

interface Stats {
  pending: number;
  approved: number;
  rejected: number;
  urgent: number;
  high_priority: number;
}

interface ActionModalState {
  show: boolean;
  type: 'approve' | 'reject' | 'review' | null;
  decision: Decision | null;
}

export default function DecisionQueuePanel() {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [actionModal, setActionModal] = useState<ActionModalState>({
    show: false,
    type: null,
    decision: null
  });
  const [actionNotes, setActionNotes] = useState('');
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success'
  });

  useEffect(() => {
    loadData();
  }, [refreshKey]);

  const loadData = async () => {
    try {
      setLoading(true);

      const [decisionsResult, statsResult] = await Promise.all([
        supabase.rpc('get_pending_decisions'),
        supabase.rpc('get_decisions_stats')
      ]);

      if (decisionsResult.error) throw decisionsResult.error;
      if (statsResult.error) throw statsResult.error;

      setDecisions(decisionsResult.data || []);
      setStats(statsResult.data);
    } catch (error: any) {
      console.error('Error loading decisions:', error);
      showToast('حدث خطأ أثناء تحميل البيانات', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };

  const handleApprove = async () => {
    if (!actionModal.decision) return;

    setProcessingId(actionModal.decision.id);
    try {
      const { data, error } = await supabase.rpc('approve_decision', {
        p_decision_id: actionModal.decision.id,
        p_approved_by: null,
        p_approval_notes: actionNotes || null
      });

      if (error) throw error;

      showToast(data.message, 'success');
      setActionModal({ show: false, type: null, decision: null });
      setActionNotes('');
      setRefreshKey(prev => prev + 1);
    } catch (error: any) {
      console.error('Error approving decision:', error);
      showToast('حدث خطأ أثناء الموافقة', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!actionModal.decision || !actionNotes.trim()) {
      showToast('يجب تحديد سبب الرفض', 'error');
      return;
    }

    setProcessingId(actionModal.decision.id);
    try {
      const { data, error } = await supabase.rpc('reject_decision', {
        p_decision_id: actionModal.decision.id,
        p_rejected_by: null,
        p_rejection_reason: actionNotes
      });

      if (error) throw error;

      showToast(data.message, 'success');
      setActionModal({ show: false, type: null, decision: null });
      setActionNotes('');
      setRefreshKey(prev => prev + 1);
    } catch (error: any) {
      console.error('Error rejecting decision:', error);
      showToast(error.message || 'حدث خطأ أثناء الرفض', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRequestReview = async () => {
    if (!actionModal.decision || !actionNotes.trim()) {
      showToast('يجب تحديد سبب طلب المراجعة', 'error');
      return;
    }

    setProcessingId(actionModal.decision.id);
    try {
      const { data, error } = await supabase.rpc('request_decision_review', {
        p_decision_id: actionModal.decision.id,
        p_reviewed_by: null,
        p_review_notes: actionNotes
      });

      if (error) throw error;

      showToast(data.message, 'success');
      setActionModal({ show: false, type: null, decision: null });
      setActionNotes('');
      setRefreshKey(prev => prev + 1);
    } catch (error: any) {
      console.error('Error requesting review:', error);
      showToast('حدث خطأ أثناء طلب المراجعة', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const getDecisionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      change_farm_manager: 'تغيير مدير مزرعة',
      suspend_bookings: 'إيقاف حجوزات',
      financial_review: 'مراجعة مالية',
      approve_expense: 'اعتماد مصروف',
      extend_contract: 'تمديد عقد'
    };
    return labels[type] || type;
  };

  const getDecisionTypeIcon = (type: string) => {
    const icons: Record<string, any> = {
      change_farm_manager: UserX,
      suspend_bookings: BanIcon,
      financial_review: DollarSign,
      approve_expense: DollarSign,
      extend_contract: FileText
    };
    const Icon = icons[type] || FileText;
    return <Icon className="w-5 h-5" />;
  };

  const getSourceIcon = (source: string) => {
    const icons: Record<string, any> = {
      farm: Building2,
      financial: DollarSign,
      operational: Briefcase
    };
    const Icon = icons[source] || FileText;
    return <Icon className="w-4 h-4" />;
  };

  const getImpactBadge = (impact: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      operational: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'تشغيلي' },
      financial: { bg: 'bg-green-100', text: 'text-green-700', label: 'مالي' },
      investment: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'استثماري' }
    };
    const badge = badges[impact] || badges.operational;
    return (
      <span className={`px-2 py-1 rounded text-xs font-bold ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      urgent: { bg: 'bg-red-500', text: 'text-white', label: 'عاجل' },
      high: { bg: 'bg-orange-500', text: 'text-white', label: 'عالي' },
      normal: { bg: 'bg-blue-500', text: 'text-white', label: 'عادي' },
      low: { bg: 'bg-slate-400', text: 'text-white', label: 'منخفض' }
    };
    const badge = badges[priority] || badges.normal;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-bold ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border-2 border-slate-200 p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-blue-500"></div>
        </div>
        <p className="text-center text-slate-500 mt-4">جاري تحميل القرارات...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <AlertCircle className="w-7 h-7 text-orange-600" />
            طابور القرارات
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            القرارات بانتظار الموافقة من المدير العام
          </p>
        </div>
        <button
          onClick={() => setRefreshKey(prev => prev + 1)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-bold transition-colors text-sm"
        >
          <RefreshCw className="w-4 h-4" />
          تحديث
        </button>
      </div>

      {/* Quick Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-gradient-to-br from-orange-50 to-red-50 border-2 border-orange-200 rounded-xl p-4">
            <p className="text-3xl font-bold text-orange-600">{stats.pending}</p>
            <p className="text-xs text-slate-600 mt-1">بانتظار المعالجة</p>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-rose-50 border-2 border-red-200 rounded-xl p-4">
            <p className="text-3xl font-bold text-red-600">{stats.urgent}</p>
            <p className="text-xs text-slate-600 mt-1">عاجل</p>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-amber-200 rounded-xl p-4">
            <p className="text-3xl font-bold text-amber-600">{stats.high_priority}</p>
            <p className="text-xs text-slate-600 mt-1">أولوية عالية</p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4">
            <p className="text-3xl font-bold text-green-600">{stats.approved}</p>
            <p className="text-xs text-slate-600 mt-1">معتمد (30 يوم)</p>
          </div>
          <div className="bg-gradient-to-br from-slate-50 to-gray-50 border-2 border-slate-200 rounded-xl p-4">
            <p className="text-3xl font-bold text-slate-600">{stats.rejected}</p>
            <p className="text-xs text-slate-600 mt-1">مرفوض (30 يوم)</p>
          </div>
        </div>
      )}

      {/* Decisions List */}
      <div className="space-y-4">
        {decisions.length === 0 ? (
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-12 text-center">
            <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-900 mb-2">لا توجد قرارات معلقة</h3>
            <p className="text-slate-600">جميع القرارات تمت معالجتها</p>
          </div>
        ) : (
          decisions.map((decision) => (
            <div
              key={decision.id}
              className="bg-white border-2 border-slate-200 hover:border-blue-300 rounded-xl p-6 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4 flex-1">
                  <div className={`p-3 rounded-xl ${
                    decision.priority === 'urgent' ? 'bg-red-100' :
                    decision.priority === 'high' ? 'bg-orange-100' :
                    'bg-blue-100'
                  }`}>
                    {getDecisionTypeIcon(decision.decision_type)}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-bold text-slate-900">
                        {getDecisionTypeLabel(decision.decision_type)}
                      </h3>
                      {getPriorityBadge(decision.priority)}
                      {getImpactBadge(decision.impact_type)}
                    </div>

                    {decision.farm_name && (
                      <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
                        <Building2 className="w-4 h-4" />
                        <span className="font-medium">{decision.farm_name}</span>
                        {decision.farm_location && (
                          <span className="text-slate-400">• {decision.farm_location}</span>
                        )}
                      </div>
                    )}

                    {decision.expense_amount && (
                      <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
                        <DollarSign className="w-4 h-4" />
                        <span className="font-bold text-green-600">
                          {decision.expense_amount.toLocaleString('ar-SA')} ر.س
                        </span>
                        {decision.expense_description && (
                          <span>• {decision.expense_description}</span>
                        )}
                      </div>
                    )}

                    {decision.action_data?.reason && (
                      <p className="text-sm text-slate-600 bg-slate-50 px-3 py-2 rounded-lg mb-2">
                        <span className="font-bold">السبب:</span> {decision.action_data.reason}
                      </p>
                    )}

                    {decision.notes && (
                      <p className="text-xs text-slate-500 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
                        <span className="font-bold">ملاحظات:</span> {decision.notes}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    {getSourceIcon(decision.source_category)}
                    <span>{decision.source_category === 'farm' ? 'مزرعة' : decision.source_category === 'financial' ? 'مالي' : 'تشغيلي'}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <Clock className="w-3 h-3" />
                    <span>{formatDate(decision.created_at)}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
                <button
                  onClick={() => setActionModal({ show: true, type: 'approve', decision })}
                  disabled={processingId === decision.id}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white rounded-lg font-bold transition-colors text-sm"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  اعتماد
                </button>

                <button
                  onClick={() => setActionModal({ show: true, type: 'reject', decision })}
                  disabled={processingId === decision.id}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white rounded-lg font-bold transition-colors text-sm"
                >
                  <XCircle className="w-4 h-4" />
                  رفض
                </button>

                <button
                  onClick={() => setActionModal({ show: true, type: 'review', decision })}
                  disabled={processingId === decision.id}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white rounded-lg font-bold transition-colors text-sm"
                >
                  <RefreshCw className="w-4 h-4" />
                  طلب مراجعة
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Action Modal */}
      {actionModal.show && actionModal.decision && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full">
            <h3 className="text-xl font-bold text-slate-900 mb-4">
              {actionModal.type === 'approve' && 'تأكيد الموافقة'}
              {actionModal.type === 'reject' && 'تأكيد الرفض'}
              {actionModal.type === 'review' && 'طلب مراجعة إضافية'}
            </h3>

            <p className="text-slate-600 mb-4">
              {getDecisionTypeLabel(actionModal.decision.decision_type)}
              {actionModal.decision.farm_name && ` - ${actionModal.decision.farm_name}`}
            </p>

            <textarea
              value={actionNotes}
              onChange={(e) => setActionNotes(e.target.value)}
              placeholder={
                actionModal.type === 'approve' ? 'ملاحظات الموافقة (اختياري)' :
                actionModal.type === 'reject' ? 'سبب الرفض (مطلوب)' :
                'سبب طلب المراجعة (مطلوب)'
              }
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none text-right resize-none"
              rows={4}
              required={actionModal.type !== 'approve'}
            />

            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={() => {
                  if (actionModal.type === 'approve') handleApprove();
                  else if (actionModal.type === 'reject') handleReject();
                  else if (actionModal.type === 'review') handleRequestReview();
                }}
                disabled={!!processingId}
                className={`flex-1 py-3 rounded-lg font-bold text-white transition-colors ${
                  actionModal.type === 'approve' ? 'bg-green-500 hover:bg-green-600' :
                  actionModal.type === 'reject' ? 'bg-red-500 hover:bg-red-600' :
                  'bg-amber-500 hover:bg-amber-600'
                } disabled:opacity-50`}
              >
                {processingId ? 'جاري المعالجة...' : 'تأكيد'}
              </button>
              <button
                onClick={() => {
                  setActionModal({ show: false, type: null, decision: null });
                  setActionNotes('');
                }}
                disabled={!!processingId}
                className="flex-1 py-3 bg-slate-200 hover:bg-slate-300 text-slate-900 rounded-lg font-bold transition-colors disabled:opacity-50"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast.show && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 animate-slide-up">
          <div className={`flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl border-2 ${
            toast.type === 'success'
              ? 'bg-green-500 border-green-600 text-white'
              : 'bg-red-500 border-red-600 text-white'
          }`}>
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-6 h-6 flex-shrink-0" />
            ) : (
              <XCircle className="w-6 h-6 flex-shrink-0" />
            )}
            <p className="font-bold">{toast.message}</p>
          </div>
        </div>
      )}
    </div>
  );
}
