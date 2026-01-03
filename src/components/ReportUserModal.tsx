import { useState } from 'react';
import { X, AlertCircle, Flag } from 'lucide-react';
import { Modal } from './Modal';

interface ReportUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string, details?: string) => void;
  userName?: string;
}

const REPORT_REASONS = [
  'محتوى غير لائق',
  'محاولة احتيال',
  'مزايدة وهمية',
  'طلب معلومات شخصية',
  'إزعاج أو تحرش',
  'عرض خارج المنصة',
  'سلوك مريب',
  'أخرى (حدد السبب)'
];

export function ReportUserModal({ isOpen, onClose, onConfirm, userName }: ReportUserModalProps) {
  const [selectedReason, setSelectedReason] = useState('');
  const [details, setDetails] = useState('');

  const handleConfirm = () => {
    if (!selectedReason) {
      alert('الرجاء اختيار سبب البلاغ');
      return;
    }

    if (selectedReason === 'أخرى (حدد السبب)' && !details.trim()) {
      alert('الرجاء كتابة تفاصيل البلاغ');
      return;
    }

    onConfirm(selectedReason, details);
    setSelectedReason('');
    setDetails('');
    onClose();
  };

  const handleCancel = () => {
    setSelectedReason('');
    setDetails('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleCancel} size="md">
      <div className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <Flag className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">إبلاغ عن مخالفة</h2>
              {userName && (
                <p className="text-sm text-gray-600 mt-1">الإبلاغ عن: {userName}</p>
              )}
            </div>
          </div>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-800">
            سيتم مراجعة البلاغ من قبل فريق الإدارة. جميع البلاغات سرية وسيتم التعامل معها بجدية.
          </p>
        </div>

        <div className="space-y-3 mb-6">
          <label className="block text-sm font-bold text-gray-900 mb-3">
            سبب البلاغ:
          </label>

          {REPORT_REASONS.map((reason) => (
            <label
              key={reason}
              className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                selectedReason === reason
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-gray-200 hover:border-orange-300 bg-white'
              }`}
            >
              <input
                type="radio"
                name="reportReason"
                value={reason}
                checked={selectedReason === reason}
                onChange={(e) => setSelectedReason(e.target.value)}
                className="w-5 h-5 text-orange-600 border-gray-300 focus:ring-orange-500"
              />
              <span className={`text-sm font-medium ${
                selectedReason === reason ? 'text-orange-900' : 'text-gray-700'
              }`}>
                {reason}
              </span>
            </label>
          ))}
        </div>

        <div className="mb-6">
          <label className="block text-sm font-bold text-gray-900 mb-2">
            تفاصيل إضافية (اختياري):
          </label>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="أضف أي تفاصيل إضافية تساعدنا في فهم البلاغ..."
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none resize-none"
            rows={4}
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleCancel}
            className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-50 transition-all"
          >
            إلغاء
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 px-4 py-3 bg-orange-600 text-white rounded-lg font-bold hover:bg-orange-700 transition-all flex items-center justify-center gap-2"
          >
            <Flag className="w-5 h-5" />
            إرسال البلاغ
          </button>
        </div>
      </div>
    </Modal>
  );
}
