import { useState } from 'react';
import { Upload, CheckCircle, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface SmartSubscriptionUploadProps {
  planId: string;
  planName: string;
  planPrice: number;
  onSuccess: () => void;
  onCancel: () => void;
}

export function SmartSubscriptionUpload({
  planId,
  planName,
  planPrice,
  onSuccess,
  onCancel,
}: SmartSubscriptionUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!validTypes.includes(selectedFile.type)) {
        setError('يرجى رفع صورة (JPG, PNG) أو ملف PDF');
        return;
      }
      if (selectedFile.size > 5 * 1024 * 1024) {
        setError('حجم الملف يجب أن يكون أقل من 5 ميجابايت');
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    try {
      setUploading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('يجب تسجيل الدخول');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;
      const filePath = `subscription-receipts/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('receipts')
        .getPublicUrl(filePath);

      const { data: request, error: insertError } = await supabase
        .from('subscription_requests')
        .insert({
          user_id: user.id,
          plan_id: planId,
          receipt_url: publicUrl,
          status: 'submitted',
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setUploadComplete(true);
      setUploading(false);
      setAnalyzing(true);

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-subscription-receipt`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId: request.id,
          receiptUrl: publicUrl,
          planPrice: planPrice,
        }),
      });

      const result = await response.json();
      setAnalysisResult(result);
      setAnalyzing(false);

      setTimeout(() => {
        onSuccess();
      }, 3000);

    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'حدث خطأ أثناء رفع الإيصال');
      setUploading(false);
      setAnalyzing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[300] p-4" dir="rtl">
      <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">تفعيل الباقة {planName === 'silver' ? 'الفضية' : 'الذهبية'}</h2>
            <p className="text-sm text-gray-600">نظام التفعيل الذكي بالذكاء الصناعي</p>
          </div>
        </div>

        {!uploadComplete && !analyzing && !analysisResult && (
          <>
            <div className="mb-6">
              <div className="bg-gradient-to-br from-blue-50 to-emerald-50 border-2 border-emerald-200 rounded-lg p-4 mb-4">
                <h3 className="font-bold text-gray-900 mb-2">💳 المبلغ المطلوب: {planPrice} ريال</h3>
                <p className="text-sm text-gray-700 mb-2">
                  قم بتحويل المبلغ إلى الحساب البنكي التالي:
                </p>
                <div className="bg-white rounded-lg p-3 border border-emerald-200">
                  <p className="text-sm"><strong>البنك:</strong> البنك الأهلي السعودي</p>
                  <p className="text-sm"><strong>رقم الحساب:</strong> SA1234567890123456789012</p>
                  <p className="text-sm"><strong>اسم المستفيد:</strong> منصة المزادات</p>
                </div>
              </div>

              <label className="block mb-2 text-sm font-bold text-gray-700">
                رفع إيصال التحويل البنكي
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-emerald-500 transition-colors">
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept="image/jpeg,image/png,image/jpg,application/pdf"
                  className="hidden"
                  id="receipt-upload"
                />
                <label htmlFor="receipt-upload" className="cursor-pointer">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 mb-1">انقر لاختيار الملف</p>
                  <p className="text-xs text-gray-500">JPG, PNG أو PDF (أقل من 5 ميجا)</p>
                </label>
              </div>

              {file && (
                <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                  <span className="text-sm text-emerald-900 font-medium">{file.name}</span>
                </div>
              )}

              {error && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <span className="text-sm text-red-900">{error}</span>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="flex-1 bg-gradient-to-br from-emerald-500 to-green-600 text-white font-bold py-3 px-6 rounded-lg hover:from-emerald-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    جاري الرفع...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    رفع وتفعيل ذكي
                  </>
                )}
              </button>
              <button
                onClick={onCancel}
                disabled={uploading}
                className="px-6 py-3 border-2 border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-all"
              >
                إلغاء
              </button>
            </div>
          </>
        )}

        {(uploadComplete || analyzing) && !analysisResult && (
          <div className="text-center py-8">
            <div className="relative inline-block mb-4">
              <Loader2 className="w-16 h-16 text-emerald-600 animate-spin" />
              <Sparkles className="w-6 h-6 text-yellow-500 absolute top-0 right-0 animate-pulse" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {uploadComplete && !analyzing ? 'تم رفع الإيصال بنجاح' : 'جاري التحليل الذكي...'}
            </h3>
            <p className="text-gray-600">
              الذكاء الصناعي يقوم بقراءة وتحليل الإيصال الآن
            </p>
          </div>
        )}

        {analysisResult && (
          <div className="text-center py-8">
            {analysisResult.autoActivated ? (
              <>
                <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-12 h-12 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">تم التفعيل بنجاح!</h3>
                <p className="text-gray-600 mb-4">
                  تم تفعيل باقتك تلقائياً بواسطة الذكاء الصناعي
                </p>
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-right">
                  <p className="text-sm text-emerald-900 mb-1">
                    <strong>المبلغ المكتشف:</strong> {analysisResult.analysis.detectedAmount} ريال
                  </p>
                  <p className="text-sm text-emerald-900 mb-1">
                    <strong>درجة الثقة:</strong> {(analysisResult.analysis.confidenceScore * 100).toFixed(0)}%
                  </p>
                  <p className="text-sm text-emerald-900">
                    <strong>الحالة:</strong> تفعيل فوري
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-12 h-12 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">تم استلام طلبك</h3>
                <p className="text-gray-600 mb-4">
                  طلبك قيد المراجعة الإدارية
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-right">
                  <p className="text-sm text-blue-900">
                    سيتم مراجعة طلبك يدوياً وتفعيل باقتك خلال 24 ساعة
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
