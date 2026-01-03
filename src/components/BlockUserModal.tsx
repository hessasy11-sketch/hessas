import { useState } from 'react';
import { X, Ban, AlertCircle } from 'lucide-react';
import { Modal } from './Modal';

interface BlockUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string, customReason?: string) => void;
  userName?: string;
}

const BLOCK_REASONS = [
  'سلوك غير لائق',
  'محاولات احتيال',
  'مزايدات وهمية',
  'إزعاج متكرر',
  'انتهاك شروط الاستخدام',
  'أخرى (حدد السبب)'
];

export function BlockUserModal({ isOpen, onClose, onConfirm, userName }: BlockUserModalProps) {
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');

  const handleConfirm = () => {
    if (!selectedReason) {
      alert('الرجاء اختيار سبب الحظر');
      return;
    }

    if (selectedReason === 'أخرى (حدد السبب)' && !customReason.trim()) {
      alert('الرجاء كتابة سبب الحظر');
      return;
    }

    onConfirm(selectedReason, customReason);
    setSelectedReason('');
    setCustomReason('');
    onClose();
  };

  const handleCancel = () => {
    setSelectedReason('');
    setCustomReason('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleCancel} size="md">
      <div className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <Ban className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">حظر مستخدم</h2>
              {userName && (
                <p className="text-sm text-gray-600 mt-1">حظر: {userName}</p>
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

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-yellow-800">
            سيتم منع هذا المستخدم من المشاركة في هذا المزاد بشكل دائم. هذا الإجراء لا يمكن التراجع عنه.
          </p>
        </div>

        <div className="space-y-3 mb-6">
          <label className="block text-sm font-bold text-gray-900 mb-3">
            سبب الحظر:
          </label>

          {BLOCK_REASONS.map((reason) => (
            <label
              key={reason}
              className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                selectedReason === reason
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-200 hover:border-red-300 bg-white'
              }`}
            >
              <input
                type="radio"
                name="blockReason"
                value={reason}
                checked={selectedReason === reason}
                onChange={(e) => setSelectedReason(e.target.value)}
                className="w-5 h-5 text-red-600 border-gray-300 focus:ring-red-500"
              />
              <span className={`text-sm font-medium ${
                selectedReason === reason ? 'text-red-900' : 'text-gray-700'
              }`}>
                {reason}
              </span>
            </label>
          ))}
        </div>

        {selectedReason === 'أخرى (حدد السبب)' && (
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-900 mb-2">
              حدد السبب:
            </label>
            <textarea
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="اكتب سبب الحظر..."
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none resize-none"
              rows={3}
            />
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleCancel}
            className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-50 transition-all"
          >
            إلغاء
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-all flex items-center justify-center gap-2"
          >
            <Ban className="w-5 h-5" />
            تأكيد الحظر
          </button>
        </div>
      </div>
    </Modal>
  );
}
