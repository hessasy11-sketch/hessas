import { useState } from 'react';
import { X, Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface UploadPaymentDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  investorPhone: string;
  investorName: string;
  salesRequestId?: string;
}

export default function UploadPaymentDocumentModal({
  isOpen,
  onClose,
  investorPhone,
  investorName,
  salesRequestId
}: UploadPaymentDocumentModalProps) {
  const [operationType, setOperationType] = useState('investment_trees');
  const [expectedAmount, setExpectedAmount] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const sanitizeFileName = (fileName: string): string => {
    // Get file extension
    const extension = fileName.substring(fileName.lastIndexOf('.'));

    // Remove extension from filename
    const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));

    // Replace spaces and special characters with underscores
    // Keep only alphanumeric, underscores, and hyphens
    const sanitized = nameWithoutExt
      .replace(/\s+/g, '_')
      .replace(/[^\w\-]/g, '')
      .substring(0, 50); // Limit length

    return `${sanitized}${extension}`;
  };

  const handleSubmit = async () => {
    if (!file) {
      setError('يرجى اختيار ملف');
      return;
    }

    if (!salesRequestId) {
      setError('معرف الطلب مطلوب');
      return;
    }

    try {
      setUploading(true);
      setError(null);

      // الخطوة 1: رفع الملف
      const timestamp = new Date().getTime();
      const sanitizedFileName = sanitizeFileName(file.name);
      const fileName = `payment_${investorPhone}_${timestamp}_${sanitizedFileName}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('b2f-payment-receipts')
        .upload(fileName, file);

      if (uploadError) {
        throw new Error(`فشل رفع الملف: ${uploadError.message}`);
      }

      const { data: { publicUrl } } = supabase.storage
        .from('b2f-payment-receipts')
        .getPublicUrl(fileName);

      // الخطوة 2: تسجيل الإيصال في نظام مالية 2
      const { data: uploadResult, error: uploadFunctionError } = await supabase
        .rpc('upload_payment_receipt', {
          p_sales_request_id: salesRequestId,
          p_receipt_url: publicUrl
        });

      if (uploadFunctionError) {
        throw new Error(`فشل تسجيل الإيصال: ${uploadFunctionError.message}`);
      }

      if (!uploadResult || !uploadResult.success) {
        throw new Error(uploadResult?.message || 'فشل تسجيل الإيصال');
      }

      // لا حاجة لتحديث الطلب - الدالة تقوم بذلك تلقائياً

      setResult({
        success: true,
        decision: 'needs_review',
        message: uploadResult.message || 'تم رفع الإيصال بنجاح، وهو الآن قيد المراجعة في قسم المدفوعات والتحصيل',
        invoice_id: uploadResult.invoice_id,
        transaction_id: uploadResult.transaction_id
      });

    } catch (err) {
      console.error('Error uploading document:', err);
      setError(err instanceof Error ? err.message : 'حدث خطأ في رفع المستند');
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[70] animate-in fade-in"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-[71] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
          <div className="bg-gradient-to-br from-emerald-500 to-green-600 text-white p-6 rounded-t-2xl">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Upload className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-black">رفع مستند الدفع</h3>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center hover:bg-white/30"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-white/90">
              سيتم تحليل المستند آلياً بالذكاء الصناعي
            </p>
          </div>

          <div className="p-6 space-y-4">
            {result ? (
              <div className="space-y-4">
                {result.decision === 'auto_approved' && (
                  <div className="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-6 text-center">
                    <CheckCircle className="w-16 h-16 text-emerald-600 mx-auto mb-3 animate-bounce" />
                    <p className="text-emerald-900 font-black text-lg mb-2">تم اعتماد السداد بنجاح!</p>
                    <div className="bg-white rounded-lg p-3 mb-3 text-right">
                      <p className="text-sm text-emerald-800 whitespace-pre-line">{result.message}</p>
                    </div>
                    <div className="flex items-center justify-between text-xs text-emerald-700 bg-emerald-100 rounded-lg p-2">
                      <span>المبلغ المكتشف: {result.amount_detected?.toLocaleString('ar-SA')} ريال</span>
                      <span>الثقة: {((result.ai_confidence || 0) * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                )}

                {result.decision === 'needs_review' && (
                  <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-6 text-center">
                    <AlertCircle className="w-16 h-16 text-blue-600 mx-auto mb-3" />
                    <p className="text-blue-900 font-black text-lg mb-2">قيد المراجعة اليدوية</p>
                    <div className="bg-white rounded-lg p-3 mb-3 text-right">
                      <p className="text-sm text-blue-800 whitespace-pre-line">{result.message}</p>
                    </div>
                    <div className="text-xs text-blue-700 bg-blue-100 rounded-lg p-2">
                      سيتم مراجعة المستند من قبل الإدارة وإخطارك بالنتيجة
                    </div>
                  </div>
                )}

                {result.decision === 'auto_rejected' && (
                  <div className="bg-red-50 border-2 border-red-300 rounded-xl p-6 text-center">
                    <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-3" />
                    <p className="text-red-900 font-black text-lg mb-2">تعذر اعتماد المستند</p>
                    <div className="bg-white rounded-lg p-3 mb-3 text-right">
                      <p className="text-sm text-red-800 whitespace-pre-line">{result.message}</p>
                    </div>
                    <div className="text-xs text-red-700 bg-red-100 rounded-lg p-2">
                      يرجى رفع مستند دفع واضح يحتوي على المبلغ الصحيح
                    </div>
                  </div>
                )}

                <button
                  onClick={onClose}
                  className="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold py-3 px-4 rounded-xl hover:shadow-lg transition-all"
                >
                  حسناً، فهمت
                </button>
              </div>
            ) : (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                  <p className="text-sm text-blue-700 font-bold">
                    سيتم تحليل المستند آلياً والتحقق من المبلغ المدفوع بالذكاء الصناعي
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    مستند الدفع
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-emerald-500 transition-colors cursor-pointer">
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleFileChange}
                      className="hidden"
                      id="file-upload"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      {file ? (
                        <div className="flex items-center justify-center gap-2 text-emerald-600">
                          <FileText className="w-5 h-5" />
                          <span className="text-sm font-bold">{file.name}</span>
                        </div>
                      ) : (
                        <div>
                          <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-600">اضغط لرفع الملف</p>
                          <p className="text-xs text-gray-500 mt-1">صورة أو PDF</p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handleSubmit}
                    disabled={uploading || !file}
                    className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold py-3 px-4 rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        جاري التحليل...
                      </>
                    ) : (
                      'رفع وتحليل الآن'
                    )}
                  </button>

                  <button
                    onClick={onClose}
                    disabled={uploading}
                    className="px-4 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-all disabled:opacity-50"
                  >
                    إلغاء
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
