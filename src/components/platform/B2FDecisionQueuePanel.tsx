import React, { useState, useEffect } from 'react';
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Building2,
  DollarSign,
  FileCheck,
  Users,
  Calendar,
  ChevronRight
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Decision {
  id: string;
  decision_type: string;
  decision_type_ar: string;
  farm_id: string;
  farm_name: string;
  farm_location: string;
  target_staff_id: string | null;
  target_staff_name: string | null;
  expense_amount: number | null;
  expense_description: string | null;
  action_data: any;
  status: string;
  priority: string;
  priority_ar: string;
  requested_by: string;
  requested_by_name: string;
  required_roles: string[];
  notes: string;
  created_at: string;
  hours_pending: number;
}

const B2FDecisionQueuePanel: React.FC = () => {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [selectedDecision, setSelectedDecision] = useState<Decision | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    loadDecisions();
  }, []);

  const loadDecisions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_pending_b2f_decisions');

      if (error) throw error;

      setDecisions(data || []);
    } catch (error: any) {
      console.error('Error loading decisions:', error);
      alert('فشل تحميل القرارات');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (decision: Decision) => {
    const currentStaffId = sessionStorage.getItem('current_staff_id');
    if (!currentStaffId) {
      alert('الرجاء تسجيل الدخول أولاً');
      return;
    }

    if (!window.confirm(`هل أنت متأكد من الموافقة على: ${decision.decision_type_ar}؟`)) {
      return;
    }

    try {
      setProcessing(decision.id);
      const { data, error } = await supabase.rpc('approve_b2f_decision', {
        p_decision_id: decision.id,
        p_approved_by: currentStaffId,
        p_approval_notes: null
      });

      if (error) throw error;

      if (data.success) {
        alert(data.message_ar || 'تمت الموافقة بنجاح');
        await loadDecisions();
      } else {
        alert(data.error_ar || data.error || 'فشلت العملية');
      }
    } catch (error: any) {
      console.error('Error approving decision:', error);
      alert('حدث خطأ أثناء الموافقة');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = (decision: Decision) => {
    setSelectedDecision(decision);
    setShowRejectModal(true);
    setRejectionReason('');
  };

  const confirmReject = async () => {
    if (!selectedDecision) return;

    if (!rejectionReason.trim()) {
      alert('الرجاء إدخال سبب الرفض');
      return;
    }

    const currentStaffId = sessionStorage.getItem('current_staff_id');
    if (!currentStaffId) {
      alert('الرجاء تسجيل الدخول أولاً');
      return;
    }

    try {
      setProcessing(selectedDecision.id);

      const { error } = await supabase
        .from('decision_queue')
        .update({
          status: 'rejected',
          approved_by: currentStaffId,
          notes: `${selectedDecision.notes || ''} | رفض: ${rejectionReason}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedDecision.id);

      if (error) throw error;

      alert('تم رفض القرار بنجاح');
      setShowRejectModal(false);
      setSelectedDecision(null);
      await loadDecisions();
    } catch (error: any) {
      console.error('Error rejecting decision:', error);
      alert('حدث خطأ أثناء رفض القرار');
    } finally {
      setProcessing(null);
    }
  };

  const getDecisionIcon = (type: string) => {
    switch (type) {
      case 'approve_expense':
        return <DollarSign className="w-5 h-5" />;
      case 'approve_task_submission':
        return <FileCheck className="w-5 h-5" />;
      case 'change_farm_manager':
        return <Users className="w-5 h-5" />;
      case 'request_visit':
        return <Calendar className="w-5 h-5" />;
      default:
        return <AlertCircle className="w-5 h-5" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'normal':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'low':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">جاري تحميل القرارات...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-3 rounded-lg">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">طابور القرارات (B2F)</h2>
              <p className="text-blue-100 text-sm mt-1">قرارات تحتاج اعتماد فوري</p>
            </div>
          </div>
          <div className="bg-white/20 px-4 py-2 rounded-lg">
            <p className="text-3xl font-bold text-white">{decisions.length}</p>
            <p className="text-blue-100 text-xs">قرار معلق</p>
          </div>
        </div>
      </div>

      {/* Decisions List */}
      {decisions.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">لا توجد قرارات معلقة</h3>
          <p className="text-gray-600">جميع القرارات تمت معالجتها</p>
        </div>
      ) : (
        <div className="space-y-4">
          {decisions.map((decision) => (
            <div
              key={decision.id}
              className="bg-white rounded-lg shadow-md border-2 border-gray-200 hover:border-blue-400 transition-all"
            >
              <div className="p-6">
                {/* Priority Badge */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      decision.priority === 'urgent' ? 'bg-red-100 text-red-600' :
                      decision.priority === 'high' ? 'bg-orange-100 text-orange-600' :
                      'bg-blue-100 text-blue-600'
                    }`}>
                      {getDecisionIcon(decision.decision_type)}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{decision.decision_type_ar}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Building2 className="w-4 h-4 text-gray-500" />
                        <p className="text-sm text-gray-600">{decision.farm_name}</p>
                        {decision.farm_location && (
                          <span className="text-xs text-gray-400">• {decision.farm_location}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getPriorityColor(decision.priority)}`}>
                    {decision.priority_ar}
                  </span>
                </div>

                {/* Decision Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                  {decision.expense_amount && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">المبلغ</p>
                      <p className="text-lg font-bold text-green-600">
                        {decision.expense_amount.toLocaleString('ar-SA')} ر.س
                      </p>
                      {decision.expense_description && (
                        <p className="text-sm text-gray-600 mt-1">{decision.expense_description}</p>
                      )}
                    </div>
                  )}
                  {decision.target_staff_name && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">الموظف المستهدف</p>
                      <p className="text-sm font-semibold text-gray-900">{decision.target_staff_name}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-gray-500 mb-1">طلب من</p>
                    <p className="text-sm font-semibold text-gray-900">{decision.requested_by_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">وقت الانتظار</p>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-orange-500" />
                      <p className="text-sm font-semibold text-gray-900">
                        {decision.hours_pending < 1
                          ? 'أقل من ساعة'
                          : decision.hours_pending < 24
                          ? `${Math.floor(decision.hours_pending)} ساعة`
                          : `${Math.floor(decision.hours_pending / 24)} يوم`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {decision.notes && (
                  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-xs text-yellow-800 font-medium mb-1">ملاحظات:</p>
                    <p className="text-sm text-yellow-900">{decision.notes}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="text-xs text-gray-500">
                    يتطلب: {decision.required_roles.map(r => {
                      if (r === 'super_admin') return 'المدير العام';
                      if (r === 'farm_manager') return 'مدير المزرعة';
                      if (r === 'b2f_assistant') return 'مساعد B2F';
                      return r;
                    }).join(' أو ')}
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleReject(decision)}
                      disabled={processing === decision.id}
                      className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 border border-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <XCircle className="w-4 h-4" />
                      رفض
                    </button>
                    <button
                      onClick={() => handleApprove(decision)}
                      disabled={processing === decision.id}
                      className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {processing === decision.id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          جاري المعالجة...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          اعتماد
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedDecision && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-red-100 p-3 rounded-lg">
                  <XCircle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">رفض القرار</h3>
                  <p className="text-sm text-gray-600">{selectedDecision.decision_type_ar}</p>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  سبب الرفض <span className="text-red-600">*</span>
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  rows={4}
                  placeholder="اكتب سبب رفض القرار..."
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setSelectedDecision(null);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={confirmReject}
                  disabled={!rejectionReason.trim() || processing === selectedDecision.id}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processing === selectedDecision.id ? 'جاري الرفض...' : 'تأكيد الرفض'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default B2FDecisionQueuePanel;
