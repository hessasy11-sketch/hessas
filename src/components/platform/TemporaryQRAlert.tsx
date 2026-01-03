import { useState, useEffect } from 'react';
import { AlertTriangle, X, QrCode, Download, CheckCircle2, Copy } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface TemporaryQRData {
  has_temporary_qr: boolean;
  created_at?: string;
  job_title?: string;
  role?: string;
  staff_id?: string;
  qr_token?: string;
}

export function TemporaryQRAlert() {
  const [qrData, setQrData] = useState<TemporaryQRData | null>(null);
  const [isReplacing, setIsReplacing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [newQRToken, setNewQRToken] = useState<string | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    checkTemporaryQRStatus();
  }, []);

  const checkTemporaryQRStatus = async () => {
    try {
      const { data, error } = await supabase.rpc('check_temporary_qr_status');

      if (error) {
        console.error('Error checking temporary QR:', error);
        return;
      }

      if (data && data.has_temporary_qr) {
        setQrData(data);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleReplaceQR = async () => {
    setIsReplacing(true);
    try {
      const { data, error } = await supabase.rpc('replace_temporary_qr');

      if (error) throw error;

      if (data && data.success) {
        setNewQRToken(data.qr_token);
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(data.qr_token)}`;
        setQrCodeDataUrl(qrUrl);
        setShowSuccess(true);
        setQrData(null);
      }
    } catch (error) {
      console.error('Error replacing QR:', error);
      alert('فشل استبدال الباركود. حاول مرة أخرى.');
    } finally {
      setIsReplacing(false);
    }
  };

  const handleDownloadQR = () => {
    if (!qrCodeDataUrl) return;

    const link = document.createElement('a');
    link.href = qrCodeDataUrl;
    link.download = 'qr-code-permanent.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyToken = () => {
    if (!newQRToken) return;
    navigator.clipboard.writeText(newQRToken);
    alert('تم نسخ الباركود بنجاح');
  };

  if (isDismissed || !qrData?.has_temporary_qr) return null;

  if (showSuccess && newQRToken) {
    return (
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4">
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-2xl shadow-2xl p-6 border-2 border-emerald-400">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div className="flex-1">
              <h3 className="text-xl font-bold mb-2" dir="rtl">تم استبدال الباركود بنجاح</h3>
              <p className="text-emerald-50 mb-4" dir="rtl">
                تم توليد باركود دائم جديد. يرجى حفظه في مكان آمن.
              </p>

              <div className="bg-white rounded-xl p-4 mb-4">
                {qrCodeDataUrl && (
                  <img
                    src={qrCodeDataUrl}
                    alt="QR Code"
                    className="w-48 h-48 mx-auto"
                  />
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleCopyToken}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white text-emerald-600 rounded-xl font-bold hover:bg-emerald-50 transition-colors"
                  dir="rtl"
                >
                  <Copy className="w-5 h-5" />
                  نسخ Token
                </button>
                <button
                  onClick={handleDownloadQR}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white text-emerald-600 rounded-xl font-bold hover:bg-emerald-50 transition-colors"
                  dir="rtl"
                >
                  <Download className="w-5 h-5" />
                  تحميل QR
                </button>
                <button
                  onClick={() => setShowSuccess(false)}
                  className="px-4 py-3 bg-emerald-700 text-white rounded-xl font-bold hover:bg-emerald-800 transition-colors"
                  dir="rtl"
                >
                  إغلاق
                </button>
              </div>

              <p className="text-xs text-emerald-100 mt-3 text-center" dir="rtl">
                احتفظ بالباركود في مكان آمن. ستحتاجه للدخول إلى لوحة الإدارة.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4">
      <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-2xl shadow-2xl p-6 border-2 border-amber-400 animate-pulse">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 animate-bounce">
            <AlertTriangle className="w-7 h-7" />
          </div>

          <div className="flex-1">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-xl font-bold" dir="rtl">تنبيه: باركود مؤقت</h3>
              <button
                onClick={() => setIsDismissed(true)}
                className="text-white/80 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-amber-50 mb-4" dir="rtl">
              أنت تستخدم باركود مؤقت للدخول. يرجى استبداله بباركود دائم للأمان.
            </p>

            <div className="bg-white/10 rounded-lg p-3 mb-4 backdrop-blur-sm" dir="rtl">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-amber-100 mb-1">الدور:</p>
                  <p className="font-bold">{qrData.job_title}</p>
                </div>
                <div>
                  <p className="text-amber-100 mb-1">تاريخ الإنشاء:</p>
                  <p className="font-bold">
                    {qrData.created_at ? new Date(qrData.created_at).toLocaleDateString('ar-SA') : '-'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleReplaceQR}
                disabled={isReplacing}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-white text-amber-600 rounded-xl font-bold hover:bg-amber-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                dir="rtl"
              >
                {isReplacing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-amber-600"></div>
                    جاري الاستبدال...
                  </>
                ) : (
                  <>
                    <QrCode className="w-5 h-5" />
                    استبدال الباركود الآن
                  </>
                )}
              </button>
            </div>

            <p className="text-xs text-amber-100 mt-3 text-center" dir="rtl">
              الباركود المؤقت صالح للاستخدام، لكن يُنصح بشدة باستبداله بباركود دائم.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
