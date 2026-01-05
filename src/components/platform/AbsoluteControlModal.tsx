import { useState } from 'react';
import { X, AlertTriangle, Shield, Lock, Unlock } from 'lucide-react';

interface AbsoluteControlModalProps {
  mode: 'activate' | 'deactivate';
  currentReason?: string | null;
  onConfirm: (reason?: string) => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function AbsoluteControlModal({
  mode,
  currentReason,
  onConfirm,
  onCancel,
  loading = false
}: AbsoluteControlModalProps) {
  const [reason, setReason] = useState('');

  const handleConfirm = () => {
    if (mode === 'activate') {
      if (!reason.trim()) {
        alert('يرجى إدخال سبب التفعيل');
        return;
      }
      onConfirm(reason.trim());
    } else {
      onConfirm();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4" dir="rtl">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl animate-in fade-in zoom-in duration-300">
        {/* Header */}
        <div className={`p-6 border-b-2 ${mode === 'activate' ? 'bg-gradient-to-r from-red-500 to-red-600 border-red-700' : 'bg-gradient-to-r from-slate-700 to-slate-800 border-slate-900'} rounded-t-3xl`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl ${mode === 'activate' ? 'bg-red-600' : 'bg-slate-600'} flex items-center justify-center shadow-lg`}>
                {mode === 'activate' ? (
                  <Lock className="w-7 h-7 text-white" />
                ) : (
                  <Unlock className="w-7 h-7 text-white" />
                )}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {mode === 'activate' ? 'تفعيل وضع السيطرة المطلقة' : 'إلغاء وضع السيطرة المطلقة'}
                </h2>
                <p className="text-white/80 text-sm">
                  {mode === 'activate' ? 'Activate Absolute Control Mode' : 'Deactivate Absolute Control Mode'}
                </p>
              </div>
            </div>
            <button
              onClick={onCancel}
              disabled={loading}
              className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {mode === 'activate' ? (
            <>
              {/* Warning */}
              <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <h3 className="font-bold text-red-900 text-lg">تحذير هام</h3>
                    <ul className="text-red-700 text-sm space-y-1 mr-4">
                      <li className="list-disc">سيتم فتح الأوامر الحساسة التي يمكن أن تؤثر على النظام بالكامل</li>
                      <li className="list-disc">جميع الإجراءات سيتم تسجيلها في السجل القيادي</li>
                      <li className="list-disc">استخدم هذا الوضع فقط في حالات الطوارئ</li>
                      <li className="list-disc">تأكد من إلغاء التفعيل بعد الانتهاء</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Enabled Commands Preview */}
              <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <Shield className="w-6 h-6 text-slate-600 flex-shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <h3 className="font-bold text-slate-900">الأوامر التي سيتم فتحها:</h3>
                    <ul className="text-slate-700 text-sm space-y-1 mr-4">
                      <li className="list-disc">حذف المزارع والعمليات (Delete Farm/Operation)</li>
                      <li className="list-disc">إيقاف العمليات قسراً (Force Stop Operation)</li>
                      <li className="list-disc">تجاوز القفل المالي (Override Financial Lock)</li>
                      <li className="list-disc">العمليات الجماعية (Mass Operations)</li>
                      <li className="list-disc">التحكم في البيانات الحساسة (Sensitive Data Control)</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Reason Input */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-900">
                  سبب التفعيل <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="مثال: إصلاح عطل طارئ في النظام، تصحيح خطأ في البيانات، حالة طوارئ..."
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-red-500 focus:ring-4 focus:ring-red-500/10 resize-none"
                  rows={4}
                  disabled={loading}
                />
                <p className="text-xs text-slate-500">
                  سيتم حفظ هذا السبب في السجل القيادي
                </p>
              </div>
            </>
          ) : (
            <>
              {/* Current Session Info */}
              {currentReason && (
                <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-4">
                  <div className="space-y-2">
                    <h3 className="font-bold text-slate-900">الجلسة الحالية:</h3>
                    <div className="bg-white rounded-lg p-3 border border-slate-200">
                      <p className="text-sm text-slate-600">السبب المسجل:</p>
                      <p className="text-slate-900 font-medium mt-1">{currentReason}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Deactivation Confirmation */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <h3 className="font-bold text-blue-900">تأكيد الإلغاء</h3>
                    <p className="text-blue-700 text-sm">
                      عند إلغاء وضع السيطرة المطلقة:
                    </p>
                    <ul className="text-blue-700 text-sm space-y-1 mr-4">
                      <li className="list-disc">سيتم إخفاء جميع الأوامر الحساسة</li>
                      <li className="list-disc">سيتم تسجيل الإلغاء في السجل القيادي</li>
                      <li className="list-disc">سيتم حساب مدة الجلسة تلقائياً</li>
                    </ul>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50 border-t-2 border-slate-200 rounded-b-3xl flex items-center gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-6 py-3 bg-white border-2 border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 font-bold transition-colors disabled:opacity-50"
          >
            إلغاء
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || (mode === 'activate' && !reason.trim())}
            className={`flex-1 px-6 py-3 rounded-xl font-bold transition-colors disabled:opacity-50 ${
              mode === 'activate'
                ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg shadow-red-500/30'
                : 'bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 text-white shadow-lg'
            }`}
          >
            {loading ? 'جاري المعالجة...' : mode === 'activate' ? 'تفعيل الآن' : 'إلغاء التفعيل'}
          </button>
        </div>
      </div>
    </div>
  );
}
