import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface DecisionRejectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  decisionTitle: string;
  loading?: boolean;
}

export default function DecisionRejectModal({
  isOpen,
  onClose,
  onConfirm,
  decisionTitle,
  loading = false
}: DecisionRejectModalProps) {
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (reason.trim()) {
      onConfirm(reason.trim());
    }
  };

  const handleClose = () => {
    if (!loading) {
      setReason('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">رفض القرار</h2>
                <p className="text-sm text-slate-500">يجب إدخال سبب الرفض</p>
              </div>
            </div>
            {!loading && (
              <button
                onClick={handleClose}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
            <div className="text-sm text-slate-600 mb-3">
              <span className="font-bold text-slate-900">القرار:</span> {decisionTitle}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              سبب الرفض <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="اكتب سبب الرفض هنا..."
              rows={4}
              required
              disabled={loading}
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all disabled:bg-slate-50 disabled:text-slate-500"
            />
            <p className="text-xs text-slate-500 mt-2">
              سيتم إرسال السبب للجهة المعنية
            </p>
          </div>

          <div className="flex items-center gap-3 mt-6">
            <button
              type="submit"
              disabled={!reason.trim() || loading}
              className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'جاري الرفض...' : 'تأكيد الرفض'}
            </button>
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
