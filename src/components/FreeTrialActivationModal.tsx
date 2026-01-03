import { useState } from 'react';
import { X, Check, Clock, Gift, Sparkles, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface FreeTrialActivationModalProps {
  isOpen: boolean;
  onClose: () => void;
  planId: string;
  planName: string;
  trialDays: number;
}

export function FreeTrialActivationModal({
  isOpen,
  onClose,
  planId,
  planName,
  trialDays
}: FreeTrialActivationModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleStartTrial = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setError('يجب تسجيل الدخول أولاً');
        return;
      }

      const { data, error: rpcError } = await supabase.rpc('start_free_trial', {
        p_user_id: user.id,
        p_plan_id: planId,
      });

      if (rpcError) {
        setError(rpcError.message);
        return;
      }

      if (data && !data.success) {
        setError(data.error || 'فشل تفعيل التجربة المجانية');
        return;
      }

      setSuccess(true);

      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-8 text-center">
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">
            تم تفعيل التجربة المجانية!
          </h2>
          <p className="text-gray-600 mb-4">
            استمتع بجميع مميزات {planName} لمدة {trialDays} يوم
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
            <span>جاري إعادة التحميل...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        className="bg-white rounded-2xl max-w-md w-full shadow-2xl animate-in fade-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative p-6 bg-gradient-to-r from-green-500 to-emerald-600 rounded-t-2xl text-white">
          <button
            onClick={onClose}
            className="absolute top-4 left-4 p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full mb-4">
              <Sparkles className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black mb-2">
              ابدأ تجربتك المجانية
            </h2>
            <p className="text-white/90 text-sm">
              {planName} - {trialDays} يوم مجاناً
            </p>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-blue-900 mb-1">
                  {trialDays} يوم تجربة مجانية
                </h3>
                <p className="text-sm text-blue-700">
                  استمتع بجميع مميزات الباقة {planName} بدون أي رسوم لمدة {trialDays} يوم
                </p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Gift className="w-5 h-5 text-green-600" />
              ما الذي ستحصل عليه:
            </h3>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-gray-700 leading-tight">
                  الوصول الكامل لجميع مميزات {planName}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-gray-700 leading-tight">
                  عداد تنازلي يعرض الأيام المتبقية
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-gray-700 leading-tight">
                  تنبيهات قبل انتهاء التجربة
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-gray-700 leading-tight">
                  عروض خاصة قبل انتهاء التجربة
                </span>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-bold text-yellow-900 mb-1 text-sm">
                  ملاحظات هامة:
                </h4>
                <ul className="text-xs text-yellow-800 space-y-1 list-disc list-inside">
                  <li>لا يلزم بطاقة ائتمانية</li>
                  <li>يمكنك الإلغاء في أي وقت</li>
                  <li>ستعود للباقة المجانية تلقائياً بعد {trialDays} يوم</li>
                  <li>ستتلقى تنبيهات قبل 48 ساعة من انتهاء التجربة</li>
                </ul>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
              <p className="text-sm text-red-700 text-center">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors disabled:opacity-50"
            >
              إلغاء
            </button>
            <button
              onClick={handleStartTrial}
              disabled={loading}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl transition-all disabled:opacity-50 shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  جاري التفعيل...
                </span>
              ) : (
                'ابدأ التجربة المجانية'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
