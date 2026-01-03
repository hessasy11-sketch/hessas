import { useState, useRef } from 'react';
import { Upload, X, FileText, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useReceiptUploadV2 } from '../../hooks/useReceiptUploadV2';

interface ReceiptUploadModalProps {
  requestId: string;
  expectedAmount: number;
  investorName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ReceiptUploadModal({
  requestId,
  expectedAmount,
  investorName,
  onClose,
  onSuccess
}: ReceiptUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [showSuccess, setShowSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { uploading, progress, uploadReceipt } = useReceiptUploadV2();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');

    // التحقق من نوع الملف
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setError('يرجى اختيار صورة (JPG, PNG, WEBP) أو ملف PDF فقط');
      return;
    }

    // التحقق من حجم الملف
    if (file.size > 5 * 1024 * 1024) {
      setError('حجم الملف يجب أن يكون أقل من 5 ميجابايت');
      return;
    }

    setSelectedFile(file);

    // إنشاء معاينة للصور فقط
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl('');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('يرجى اختيار ملف أولاً');
      return;
    }

    const result = await uploadReceipt({
      requestId,
      file: selectedFile,
      expectedAmount
    });

    if (result.success) {
      setShowSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } else {
      setError(result.error || 'حدث خطأ أثناء رفع الإيصال');
    }
  };

  const handleCancel = () => {
    if (uploading) return;
    setSelectedFile(null);
    setPreviewUrl('');
    setError('');
    onClose();
  };

  if (showSuccess) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            تم بنجاح!
          </h3>
          <p className="text-gray-600">
            تم استلام إيصال السداد وهو الآن قيد المراجعة
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">رفع إيصال التحويل البنكي</h2>
            <p className="text-sm text-gray-600 mt-1">
              المبلغ المطلوب: <span className="font-bold text-green-600">{expectedAmount.toLocaleString('ar-SA')} ر.س</span>
            </p>
          </div>
          <button
            onClick={handleCancel}
            disabled={uploading}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* معلومات الحجز */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <h3 className="font-bold text-blue-900 mb-2">معلومات الحجز</h3>
            <div className="space-y-1 text-sm text-blue-800">
              <p>المستثمر: <span className="font-bold">{investorName}</span></p>
              <p>المبلغ الإجمالي: <span className="font-bold">{expectedAmount.toLocaleString('ar-SA')} ر.س</span></p>
            </div>
          </div>

          {/* تعليمات */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800 space-y-2">
                <p className="font-bold">يرجى التأكد من:</p>
                <ul className="list-disc pr-4 space-y-1">
                  <li>رفع إيصال تحويل بنكي رسمي واضح</li>
                  <li>ظهور المبلغ الكامل في الإيصال: {expectedAmount.toLocaleString('ar-SA')} ر.س</li>
                  <li>وضوح تاريخ التحويل ورقم العملية</li>
                  <li>الصورة واضحة وغير مقصوصة</li>
                </ul>
              </div>
            </div>
          </div>

          {/* منطقة اختيار الملف */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
              onChange={handleFileSelect}
              disabled={uploading}
              className="hidden"
            />

            {!selectedFile ? (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full border-2 border-dashed border-gray-300 rounded-xl p-12 hover:border-blue-400 hover:bg-blue-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="text-center">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-bold text-gray-900 mb-2">اختر إيصال التحويل</p>
                  <p className="text-sm text-gray-600">
                    JPG, PNG, WEBP أو PDF (أقل من 5 ميجابايت)
                  </p>
                </div>
              </button>
            ) : (
              <div className="border-2 border-green-300 bg-green-50 rounded-xl p-6">
                {/* معاينة */}
                {previewUrl ? (
                  <div className="mb-4">
                    <img
                      src={previewUrl}
                      alt="Receipt preview"
                      className="max-h-64 mx-auto rounded-lg shadow-md"
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-3 mb-4 text-gray-700">
                    <FileText className="w-8 h-8" />
                    <span className="font-bold">{selectedFile.name}</span>
                  </div>
                )}

                {/* معلومات الملف */}
                <div className="flex items-center justify-between text-sm text-gray-700">
                  <span>الحجم: {(selectedFile.size / 1024).toFixed(1)} كيلوبايت</span>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                  >
                    تغيير الملف
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* شريط التقدم */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-700 font-medium">جاري الرفع...</span>
                <span className="text-blue-600 font-bold">{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 to-green-500 h-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* رسالة خطأ */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-800">
                <p className="font-bold mb-1">حدث خطأ</p>
                <p>{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex gap-3">
          <button
            onClick={handleCancel}
            disabled={uploading}
            className="flex-1 px-6 py-3 border border-gray-300 rounded-xl font-bold text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            إلغاء
          </button>
          <button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-bold hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                جاري الرفع...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                رفع الإيصال
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
