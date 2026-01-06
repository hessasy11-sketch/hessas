import { useState } from 'react';
import { X, CheckCircle, XCircle, Image as ImageIcon, FileText, Loader2, Calendar, User } from 'lucide-react';
import { TaskProof, FarmTask } from '../../hooks/useTaskProofs';

interface ProofReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: FarmTask;
  proofs: TaskProof[];
  onApprove: (notes: string) => Promise<{ success: boolean }>;
  onReject: (reason: string) => Promise<{ success: boolean }>;
  loading: boolean;
}

export default function ProofReviewModal({
  isOpen,
  onClose,
  task,
  proofs,
  onApprove,
  onReject,
  loading
}: ProofReviewModalProps) {
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [notes, setNotes] = useState('');
  const [selectedProof, setSelectedProof] = useState<TaskProof | null>(null);

  if (!isOpen) return null;

  const handleApprove = async () => {
    const result = await onApprove(notes);
    if (result.success) {
      setNotes('');
      setAction(null);
      onClose();
    }
  };

  const handleReject = async () => {
    if (!notes.trim()) {
      alert('يرجى إدخال سبب الرفض');
      return;
    }

    const result = await onReject(notes);
    if (result.success) {
      setNotes('');
      setAction(null);
      onClose();
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-emerald-500 to-teal-600">
          <div>
            <h2 className="text-2xl font-bold text-white">مراجعة إثبات المهمة</h2>
            <p className="text-emerald-100 mt-1">{task.title}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-emerald-100 transition-colors"
            disabled={loading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Task Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-slate-600 mb-2">
                <User className="w-4 h-4" />
                <span className="text-sm font-medium">المكلف بالمهمة</span>
              </div>
              <p className="text-slate-800 font-semibold">
                {task.assigned_to_name || 'غير محدد'}
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-slate-600 mb-2">
                <Calendar className="w-4 h-4" />
                <span className="text-sm font-medium">تاريخ التسليم</span>
              </div>
              <p className="text-slate-800 font-semibold">
                {task.submitted_at ? formatDate(task.submitted_at) : 'لم يتم التسليم'}
              </p>
            </div>
          </div>

          {/* Worker Notes */}
          {task.proof_notes && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-900 mb-1">ملاحظات العامل:</p>
                  <p className="text-blue-800">{task.proof_notes}</p>
                </div>
              </div>
            </div>
          )}

          {/* Proofs Gallery */}
          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-emerald-600" />
              الإثباتات المرفوعة ({proofs.length})
            </h3>

            {proofs.length === 0 ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-8 text-center">
                <ImageIcon className="w-12 h-12 text-amber-500 mx-auto mb-3" />
                <p className="text-amber-800 font-medium">لم يتم رفع أي إثبات بعد</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {proofs.map((proof) => (
                  <div
                    key={proof.id}
                    onClick={() => setSelectedProof(proof)}
                    className="relative group cursor-pointer rounded-xl overflow-hidden border-2 border-slate-200 hover:border-emerald-500 transition-all"
                  >
                    {proof.image_url.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                      <img
                        src={proof.image_url}
                        alt="Proof"
                        className="w-full h-48 object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-48 bg-slate-100 flex items-center justify-center">
                        <FileText className="w-12 h-12 text-slate-400" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Selection */}
          {!action && proofs.length > 0 && (
            <div className="flex items-center justify-center gap-4 pt-4">
              <button
                onClick={() => setAction('approve')}
                className="flex items-center gap-2 px-8 py-4 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors font-medium text-lg"
              >
                <CheckCircle className="w-6 h-6" />
                اعتماد المهمة
              </button>
              <button
                onClick={() => setAction('reject')}
                className="flex items-center gap-2 px-8 py-4 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-medium text-lg"
              >
                <XCircle className="w-6 h-6" />
                رفض المهمة
              </button>
            </div>
          )}

          {/* Approve Form */}
          {action === 'approve' && (
            <div className="bg-emerald-50 border-2 border-emerald-500 rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
                <h4 className="text-lg font-bold text-emerald-900">اعتماد المهمة</h4>
              </div>

              <div>
                <label className="block text-sm font-medium text-emerald-900 mb-2">
                  ملاحظات الاعتماد (اختياري)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="أضف ملاحظاتك حول المهمة..."
                  className="w-full px-4 py-3 border border-emerald-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none"
                  rows={3}
                  disabled={loading}
                />
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    setAction(null);
                    setNotes('');
                  }}
                  className="px-6 py-2 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 transition-colors font-medium"
                  disabled={loading}
                >
                  إلغاء
                </button>
                <button
                  onClick={handleApprove}
                  disabled={loading}
                  className="px-6 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      جاري الاعتماد...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      تأكيد الاعتماد
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Reject Form */}
          {action === 'reject' && (
            <div className="bg-red-50 border-2 border-red-500 rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <XCircle className="w-6 h-6 text-red-600" />
                <h4 className="text-lg font-bold text-red-900">رفض المهمة</h4>
              </div>

              <div>
                <label className="block text-sm font-medium text-red-900 mb-2">
                  سبب الرفض *
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="اشرح سبب رفض المهمة بوضوح..."
                  className="w-full px-4 py-3 border border-red-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none resize-none"
                  rows={3}
                  disabled={loading}
                />
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    setAction(null);
                    setNotes('');
                  }}
                  className="px-6 py-2 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 transition-colors font-medium"
                  disabled={loading}
                >
                  إلغاء
                </button>
                <button
                  onClick={handleReject}
                  disabled={loading || !notes.trim()}
                  className="px-6 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      جاري الرفض...
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5" />
                      تأكيد الرفض
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Image Modal */}
        {selectedProof && (
          <div
            className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[60] p-4"
            onClick={() => setSelectedProof(null)}
          >
            <div className="relative max-w-4xl w-full">
              <button
                onClick={() => setSelectedProof(null)}
                className="absolute top-4 right-4 bg-white text-gray-800 p-2 rounded-full hover:bg-gray-200 transition-colors z-10"
              >
                <X className="w-6 h-6" />
              </button>
              <img
                src={selectedProof.image_url}
                alt="Proof"
                className="w-full h-auto max-h-[85vh] object-contain rounded-lg"
              />
              {selectedProof.notes && (
                <div className="mt-4 bg-white rounded-lg p-4">
                  <p className="text-slate-800">{selectedProof.notes}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
