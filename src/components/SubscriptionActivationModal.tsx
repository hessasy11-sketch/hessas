import { useState } from 'react';
import { X, Upload, FileCheck, Loader, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface SubscriptionActivationModalProps {
  plan: {
    id: string;
    name: string;
    price: string;
    duration_days: number;
  };
  onClose: () => void;
  onSuccess: () => void;
}

type ActivationStatus = 'upload' | 'processing' | 'approved' | 'needs_review' | 'rejected';

export function SubscriptionActivationModal({ plan, onClose, onSuccess }: SubscriptionActivationModalProps) {
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<ActivationStatus>('upload');
  const [aiDecision, setAiDecision] = useState<{
    decision: string;
    confidence: number;
    reason: string;
  } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setReceiptFile(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!receiptFile) {
      alert('الرجاء اختيار صورة الإيصال');
      return;
    }

    setUploading(true);
    setStatus('processing');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const fileExt = receiptFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, receiptFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('receipts')
        .getPublicUrl(fileName);

      const startsAt = new Date();
      const endsAt = new Date();
      endsAt.setDate(endsAt.getDate() + plan.duration_days);

      const { data: subscription, error: subError } = await supabase
        .from('user_subscriptions')
        .insert({
          user_id: user.id,
          plan_id: plan.id,
          status: 'pending',
          payment_status: 'pending_payment',
          receipt_url: publicUrl,
          starts_at: startsAt.toISOString(),
          ends_at: endsAt.toISOString(),
        })
        .select()
        .single();

      if (subError) throw subError;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-subscription-receipt`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            subscription_id: subscription.id,
            receipt_url: publicUrl,
            plan_amount: parseFloat(plan.price),
          }),
        }
      );

      const result = await response.json();

      setAiDecision({
        decision: result.decision,
        confidence: result.confidence,
        reason: result.reason,
      });

      if (result.decision === 'approved') {
        setStatus('approved');
      } else if (result.decision === 'needs_review') {
        setStatus('needs_review');
      } else {
        setStatus('rejected');
      }

      setTimeout(() => {
        onSuccess();
      }, 3000);

    } catch (error) {
      console.error('Error processing subscription:', error);
      alert('حدث خطأ أثناء معالجة الاشتراك');
      setStatus('upload');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">تفعيل الاشتراك</h2>
              <p className="text-blue-100 text-sm mt-1">{plan.name} - {plan.price} ر.س</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {status === 'upload' && (
            <div>
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-800 mb-2">خطوات التفعيل:</h3>
                <ol className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-blue-600">1.</span>
                    <span>قم بتحويل المبلغ {plan.price} ر.س إلى الحساب البنكي</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-blue-600">2.</span>
                    <span>التقط صورة واضحة لإيصال الدفع</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-blue-600">3.</span>
                    <span>ارفع الصورة هنا وسيتم المراجعة تلقائياً</span>
                  </li>
                </ol>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-500 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  id="receipt-upload"
                />
                <label htmlFor="receipt-upload" className="cursor-pointer">
                  {receiptFile ? (
                    <div className="flex flex-col items-center gap-3">
                      <FileCheck className="w-16 h-16 text-emerald-500" />
                      <p className="text-sm font-medium text-gray-700">{receiptFile.name}</p>
                      <p className="text-xs text-gray-500">اضغط لتغيير الملف</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <Upload className="w-16 h-16 text-gray-400" />
                      <p className="text-sm font-medium text-gray-700">اضغط لاختيار صورة الإيصال</p>
                      <p className="text-xs text-gray-500">JPG, PNG - حتى 5MB</p>
                    </div>
                  )}
                </label>
              </div>

              <button
                onClick={handleSubmit}
                disabled={!receiptFile || uploading}
                className="w-full mt-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-4 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? 'جاري المعالجة...' : 'رفع الإيصال وتفعيل الاشتراك'}
              </button>
            </div>
          )}

          {status === 'processing' && (
            <div className="text-center py-12">
              <Loader className="w-16 h-16 text-blue-500 animate-spin mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-800 mb-2">جاري تحليل الإيصال...</h3>
              <p className="text-gray-600 text-sm">الذكاء الصناعي يقوم بمراجعة الإيصال</p>
            </div>
          )}

          {status === 'approved' && aiDecision && (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-12 h-12 text-emerald-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">تم قبول الاشتراك!</h3>
              <p className="text-gray-600 mb-4">{aiDecision.reason}</p>
              <div className="bg-emerald-50 rounded-xl p-4 border-2 border-emerald-200">
                <p className="text-sm text-emerald-700">
                  <span className="font-bold">نسبة الثقة:</span> {Math.round(aiDecision.confidence * 100)}%
                </p>
              </div>
            </div>
          )}

          {status === 'needs_review' && aiDecision && (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-12 h-12 text-yellow-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">يحتاج مراجعة</h3>
              <p className="text-gray-600 mb-4">{aiDecision.reason}</p>
              <div className="bg-yellow-50 rounded-xl p-4 border-2 border-yellow-200 space-y-3">
                <p className="text-sm text-yellow-700 font-medium">
                  تم تفعيل اشتراك مؤقت لمدة 24 ساعة
                </p>
                <p className="text-xs text-yellow-600">
                  سيتم المراجعة اليدوية خلال 24 ساعة
                </p>
                <div className="flex items-center justify-center gap-2 text-sm text-yellow-700">
                  <AlertTriangle className="w-4 h-4" />
                  <span>مراقبة الذكاء الصناعي مفعّلة</span>
                </div>
              </div>
            </div>
          )}

          {status === 'rejected' && aiDecision && (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-12 h-12 text-red-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">تم رفض الإيصال</h3>
              <p className="text-gray-600 mb-4">{aiDecision.reason}</p>
              <div className="bg-red-50 rounded-xl p-4 border-2 border-red-200">
                <p className="text-sm text-red-700">
                  الرجاء رفع إيصال صحيح أو التواصل مع الدعم
                </p>
              </div>
              <button
                onClick={() => {
                  setStatus('upload');
                  setReceiptFile(null);
                  setAiDecision(null);
                }}
                className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all"
              >
                إعادة المحاولة
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
