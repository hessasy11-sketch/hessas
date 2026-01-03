import { useState, useRef } from 'react';
import { Upload, FileImage, X, Loader2 } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

interface ImageQRUploaderProps {
  onSuccess: (decodedText: string) => void;
  onError: (error: string) => void;
}

export function ImageQRUploader({ onSuccess, onError }: ImageQRUploaderProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      onError('الرجاء اختيار صورة فقط');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      onError('حجم الصورة كبير جداً (الحد الأقصى 10MB)');
      return;
    }

    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const imageDataUrl = e.target?.result as string;
      setSelectedImage(imageDataUrl);

      try {
        const html5QrCode = new Html5Qrcode('qr-image-reader');
        const decodedText = await html5QrCode.scanFile(file, true);

        onSuccess(decodedText);
        setIsProcessing(false);

        setTimeout(() => {
          setSelectedImage(null);
        }, 2000);
      } catch (err) {
        console.error('QR decode error:', err);
        onError('لم يتم العثور على باركود صالح في الصورة');
        setIsProcessing(false);
        setSelectedImage(null);
      }
    };

    reader.onerror = () => {
      onError('خطأ في قراءة الصورة');
      setIsProcessing(false);
      setSelectedImage(null);
    };

    reader.readAsDataURL(file);
  };

  const handleClearImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full">
      <div id="qr-image-reader" className="hidden"></div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {!selectedImage ? (
        <button
          onClick={handleUploadClick}
          disabled={isProcessing}
          className="w-full py-8 border-2 border-dashed border-slate-600 rounded-xl hover:border-emerald-500 hover:bg-slate-800/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex flex-col items-center gap-3">
            {isProcessing ? (
              <>
                <Loader2 className="w-12 h-12 text-emerald-400 animate-spin" />
                <p className="text-slate-300" dir="rtl">جاري معالجة الصورة...</p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center">
                  <Upload className="w-8 h-8 text-slate-400" />
                </div>
                <div>
                  <p className="text-slate-300 font-bold mb-1" dir="rtl">رفع صورة الباركود</p>
                  <p className="text-slate-500 text-sm" dir="rtl">اضغط لاختيار صورة من جهازك</p>
                </div>
              </>
            )}
          </div>
        </button>
      ) : (
        <div className="relative">
          <img
            src={selectedImage}
            alt="Selected QR"
            className="w-full h-64 object-contain bg-slate-900 rounded-xl"
          />

          {!isProcessing && (
            <button
              onClick={handleClearImage}
              className="absolute top-2 right-2 p-2 bg-red-500 hover:bg-red-600 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          )}

          {isProcessing && (
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center rounded-xl">
              <div className="text-center">
                <Loader2 className="w-12 h-12 text-emerald-400 animate-spin mx-auto mb-3" />
                <p className="text-slate-300" dir="rtl">جاري قراءة الباركود...</p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
        <div className="flex items-start gap-3">
          <FileImage className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-slate-400" dir="rtl">
            <p className="font-bold text-slate-300 mb-1">ملاحظات:</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>الصورة تُقرأ في الذاكرة فقط ولا يتم حفظها</li>
              <li>تأكد من وضوح الباركود في الصورة</li>
              <li>يُفضل التصوير على خلفية بيضاء</li>
              <li>الحد الأقصى لحجم الصورة: 10MB</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
