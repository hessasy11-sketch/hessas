import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTaskDetails } from '../../hooks/useTaskDetails';
import BackToGatewayButton from './BackToGatewayButton';
import {
  ArrowLeft,
  Calendar,
  User,
  Clock,
  CheckCircle,
  AlertTriangle,
  FileText,
  Play,
  Check,
  X,
  Upload,
  Link as LinkIcon,
  Leaf,
  TrendingUp,
  MessageSquare,
} from 'lucide-react';

export default function TaskDetailsPage() {
  const { taskType, taskId } = useParams<{ taskType: 'staff' | 'farm'; taskId: string }>();
  const navigate = useNavigate();
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showProofModal, setShowProofModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    task,
    timeline,
    loading,
    error,
    canEdit,
    canApprove,
    updateTaskStatus,
    uploadProof,
    approveTask,
    rejectTask,
    refresh,
  } = useTaskDetails(taskType as 'staff' | 'farm', taskId || '');

  useEffect(() => {
    if (!taskType || !taskId) {
      navigate('/admin/my-work');
      return;
    }

    if (!['staff', 'farm'].includes(taskType)) {
      navigate('/admin/my-work');
      return;
    }
  }, [taskType, taskId, navigate]);

  const handleStartTask = async () => {
    if (!canEdit) return;
    setIsSubmitting(true);
    try {
      await updateTaskStatus('in_progress');
    } catch (err) {
      alert('حدث خطأ في بدء المهمة');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteTask = async () => {
    if (!canEdit) return;

    if (task?.requires_proof && !task?.proof_url) {
      alert('يجب رفع إثبات قبل إنهاء المهمة');
      setShowProofModal(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const newStatus = taskType === 'farm' ? 'awaiting_approval' : 'under_review';
      await updateTaskStatus(newStatus);
    } catch (err) {
      alert('حدث خطأ في إنهاء المهمة');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUploadProof = async () => {
    if (!proofUrl.trim()) {
      alert('يرجى إدخال رابط الإثبات');
      return;
    }

    setIsSubmitting(true);
    try {
      await uploadProof(proofUrl);
      setShowProofModal(false);
      setProofUrl('');
      alert('تم رفع الإثبات بنجاح');
    } catch (err) {
      alert('حدث خطأ في رفع الإثبات');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async () => {
    if (!canApprove) return;
    if (!confirm('هل أنت متأكد من اعتماد هذه المهمة؟')) return;

    setIsSubmitting(true);
    try {
      await approveTask();
      alert('تم اعتماد المهمة بنجاح');
    } catch (err) {
      alert('حدث خطأ في اعتماد المهمة');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!canApprove) return;
    if (!rejectReason.trim()) {
      alert('يرجى إدخال سبب الرفض');
      return;
    }

    setIsSubmitting(true);
    try {
      await rejectTask(rejectReason);
      setShowRejectModal(false);
      setRejectReason('');
      alert('تم رفض المهمة');
    } catch (err) {
      alert('حدث خطأ في رفض المهمة');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">جاري تحميل تفاصيل المهمة...</p>
        </div>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border-2 border-red-200 p-8 max-w-md text-center">
          <AlertTriangle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">حدث خطأ</h2>
          <p className="text-gray-600 mb-6">{error || 'لم يتم العثور على المهمة'}</p>
          <button
            onClick={() => navigate('/admin/my-work')}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-bold hover:shadow-lg transition-all"
          >
            العودة إلى عملي اليوم
          </button>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'under_review':
      case 'awaiting_approval':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'معلق';
      case 'in_progress':
        return 'جاري العمل';
      case 'under_review':
        return 'قيد المراجعة';
      case 'awaiting_approval':
        return 'بانتظار الاعتماد';
      case 'completed':
        return 'مكتملة';
      case 'rejected':
        return 'مرفوضة';
      default:
        return status;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-50';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50';
      case 'low':
        return 'text-green-600 bg-green-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'عالي';
      case 'medium':
        return 'متوسط';
      case 'low':
        return 'منخفض';
      default:
        return priority;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const formatDateShort = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
      <BackToGatewayButton />

      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 text-white">
        <div className="max-w-[1400px] mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigate('/admin/my-work')}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all backdrop-blur-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="font-medium">عملي اليوم</span>
            </button>

            {task.type === 'farm' && (
              <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 rounded-xl backdrop-blur-sm border border-green-400/30">
                <Leaf className="w-5 h-5 text-green-200" />
                <span className="font-medium text-green-100">مهمة مزرعة</span>
              </div>
            )}
          </div>

          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">{task.title}</h1>
              {task.farm_name && (
                <p className="text-blue-100 text-lg mb-2">📍 {task.farm_name}</p>
              )}
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className={`px-3 py-1.5 rounded-lg font-medium border ${getStatusColor(task.status)}`}>
                  {getStatusText(task.status)}
                </span>
                <span className={`px-3 py-1.5 rounded-lg font-medium ${getPriorityColor(task.priority)}`}>
                  الأولوية: {getPriorityText(task.priority)}
                </span>
                {task.due_date && (
                  <div className="flex items-center gap-1 text-blue-100">
                    <Calendar className="w-4 h-4" />
                    <span>الموعد: {formatDateShort(task.due_date)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                الوصف
              </h2>
              {task.description ? (
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{task.description}</p>
              ) : (
                <p className="text-gray-500 italic">لا يوجد وصف للمهمة</p>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                تفاصيل الإسناد
              </h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">مسندة إلى:</span>
                  <span className="font-bold text-gray-900">{task.assigned_to_name}</span>
                </div>
                {task.assigned_by_name && (
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">مسندة بواسطة:</span>
                    <span className="font-bold text-gray-900">{task.assigned_by_name}</span>
                  </div>
                )}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">تاريخ الإنشاء:</span>
                  <span className="font-medium text-gray-900">{formatDateShort(task.created_at)}</span>
                </div>
              </div>
            </div>

            {task.requires_proof && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Upload className="w-5 h-5 text-blue-600" />
                  الإثبات
                </h2>
                {task.proof_url ? (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="font-medium text-green-800">تم رفع الإثبات</span>
                    </div>
                    <a
                      href={task.proof_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                    >
                      <LinkIcon className="w-4 h-4" />
                      عرض الإثبات
                    </a>
                  </div>
                ) : (
                  <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="w-5 h-5 text-orange-600" />
                      <span className="font-medium text-orange-800">لم يتم رفع الإثبات بعد</span>
                    </div>
                    {canEdit && (
                      <button
                        onClick={() => setShowProofModal(true)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all"
                      >
                        رفع إثبات
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {task.notes && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                  ملاحظات
                </h2>
                <p className="text-gray-700 leading-relaxed">{task.notes}</p>
              </div>
            )}

            {task.status === 'rejected' && task.rejection_reason && (
              <div className="bg-white rounded-2xl border border-red-200 p-6">
                <h2 className="text-xl font-bold text-red-900 mb-4 flex items-center gap-2">
                  <X className="w-5 h-5 text-red-600" />
                  سبب الرفض
                </h2>
                <p className="text-red-700 leading-relaxed">{task.rejection_reason}</p>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {canEdit && task.status !== 'completed' && task.status !== 'rejected' && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">الإجراءات</h2>
                <div className="space-y-3">
                  {task.status === 'pending' && (
                    <button
                      onClick={handleStartTask}
                      disabled={isSubmitting}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all disabled:opacity-50"
                    >
                      <Play className="w-5 h-5" />
                      بدء المهمة
                    </button>
                  )}
                  {task.status === 'in_progress' && (
                    <button
                      onClick={handleCompleteTask}
                      disabled={isSubmitting}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-all disabled:opacity-50"
                    >
                      <Check className="w-5 h-5" />
                      إنهاء المهمة
                    </button>
                  )}
                </div>
              </div>
            )}

            {canApprove && (task.status === 'under_review' || task.status === 'awaiting_approval') && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">اعتماد المهمة</h2>
                <div className="space-y-3">
                  <button
                    onClick={handleApprove}
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-all disabled:opacity-50"
                  >
                    <CheckCircle className="w-5 h-5" />
                    اعتماد
                  </button>
                  <button
                    onClick={() => setShowRejectModal(true)}
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all disabled:opacity-50"
                  >
                    <X className="w-5 h-5" />
                    رفض
                  </button>
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                السجل الزمني
              </h2>
              <div className="space-y-3">
                {timeline.length === 0 ? (
                  <p className="text-gray-500 text-sm">لا توجد أحداث بعد</p>
                ) : (
                  timeline.map((event) => (
                    <div
                      key={event.id}
                      className="p-3 bg-gray-50 rounded-lg border-r-4 border-blue-500"
                    >
                      <div className="flex items-start justify-between mb-1">
                        <span className="font-medium text-gray-900">{event.action}</span>
                        <span className="text-xs text-gray-500">{formatDateShort(event.timestamp)}</span>
                      </div>
                      {event.actor_name && (
                        <p className="text-sm text-gray-600 mb-1">بواسطة: {event.actor_name}</p>
                      )}
                      {event.notes && (
                        <p className="text-sm text-gray-600 italic">{event.notes}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showProofModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-4">رفع إثبات</h3>
            <p className="text-gray-600 mb-4">يرجى إدخال رابط الإثبات (صورة أو ملف)</p>
            <input
              type="url"
              value={proofUrl}
              onChange={(e) => setProofUrl(e.target.value)}
              placeholder="https://example.com/proof.jpg"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={handleUploadProof}
                disabled={isSubmitting}
                className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all disabled:opacity-50"
              >
                رفع
              </button>
              <button
                onClick={() => {
                  setShowProofModal(false);
                  setProofUrl('');
                }}
                className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-bold transition-all"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-4">رفض المهمة</h3>
            <p className="text-gray-600 mb-4">يرجى إدخال سبب الرفض</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="سبب الرفض..."
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={handleReject}
                disabled={isSubmitting}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all disabled:opacity-50"
              >
                رفض
              </button>
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                }}
                className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-bold transition-all"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
