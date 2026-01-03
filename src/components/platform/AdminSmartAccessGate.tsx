import { useState } from 'react';
import { QrCode, Shield, Lock, CheckCircle2, User, Loader2 } from 'lucide-react';
import { SmartQRScanner } from './SmartQRScanner';
import { useQRVerification, StaffInfo } from '../../hooks/useQRVerification';

type ScanStatus = 'ready' | 'valid' | 'needsPin' | 'rejected' | 'verifying';

export function AdminSmartAccessGate() {
  const [scanStatus, setScanStatus] = useState<ScanStatus>('ready');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [staffInfo, setStaffInfo] = useState<StaffInfo | null>(null);
  const { verifyQRToken } = useQRVerification();

  const handleScanSuccess = async (decodedText: string) => {
    setScanStatus('verifying');
    setErrorMessage('');
    setStaffInfo(null);

    const result = await verifyQRToken(decodedText);

    if (result.success && result.staff) {
      setStaffInfo(result.staff);
      setScanStatus('valid');

      setTimeout(() => {
        setScanStatus('ready');
        setStaffInfo(null);
      }, 5000);
    } else {
      setErrorMessage(result.message);
      setScanStatus('rejected');

      setTimeout(() => {
        setScanStatus('ready');
        setErrorMessage('');
      }, 4000);
    }
  };

  const handleScanError = (error: string) => {
    setErrorMessage(error);
    setScanStatus('rejected');

    setTimeout(() => {
      setScanStatus('ready');
      setErrorMessage('');
    }, 3000);
  };

  const getFrameColor = () => {
    switch (scanStatus) {
      case 'ready':
        return 'border-gray-500';
      case 'verifying':
        return 'border-blue-500 shadow-blue-500/50 animate-pulse';
      case 'valid':
        return 'border-emerald-500 shadow-emerald-500/50';
      case 'needsPin':
        return 'border-blue-500 shadow-blue-500/50';
      case 'rejected':
        return 'border-red-500 shadow-red-500/50';
      default:
        return 'border-gray-500';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMyMjIiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIwOS0xLjc5MS00LTQtNHMtNCAxLjc5MS00IDQgMS43OTEgNCA0IDQgNC0xLjc5MSA0LTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-20"></div>

      <div className="absolute top-8 left-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <div className="text-left" dir="ltr">
            <div className="text-sm text-gray-400 font-medium">Secure Platform</div>
            <div className="text-xs text-gray-500">Employee Access Only</div>
          </div>
        </div>
      </div>

      <div className="relative z-10 w-full max-w-lg px-6">
        <div className="backdrop-blur-xl bg-white/5 rounded-3xl border border-white/10 shadow-2xl p-8 md:p-12">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-600/20 border border-emerald-500/30 mb-4">
              <QrCode className="w-8 h-8 text-emerald-400" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2" dir="rtl">
              بوابة الدخول الذكي
            </h1>
            <p className="text-gray-400 text-sm" dir="rtl">
              موظفو المنصة فقط
            </p>
          </div>

          <div className="relative">
            <div className={`relative rounded-2xl border-4 ${getFrameColor()} transition-all duration-300 shadow-lg overflow-hidden`}>
              <SmartQRScanner
                onScanSuccess={handleScanSuccess}
                onScanError={handleScanError}
                scanStatus={scanStatus}
              />

              {scanStatus === 'verifying' && (
                <div className="absolute inset-0 flex items-center justify-center bg-blue-500/10 backdrop-blur-sm">
                  <div className="text-center">
                    <Loader2 className="w-16 h-16 text-blue-400 mx-auto mb-3 animate-spin" />
                    <p className="text-blue-400 font-bold text-xl" dir="rtl">جاري التحقق...</p>
                  </div>
                </div>
              )}

              {scanStatus === 'valid' && staffInfo && (
                <div className="absolute inset-0 flex items-center justify-center bg-emerald-500/10 backdrop-blur-sm">
                  <div className="text-center px-6">
                    <div className="w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-500/50">
                      <CheckCircle2 className="w-12 h-12 text-white" />
                    </div>
                    <p className="text-emerald-400 font-bold text-2xl mb-2" dir="rtl">مرحباً بك</p>
                    <div className="bg-emerald-900/30 backdrop-blur-sm rounded-xl p-4 border border-emerald-500/30 space-y-2">
                      <div className="flex items-center justify-center gap-2">
                        <User className="w-5 h-5 text-emerald-300" />
                        <p className="text-emerald-200 font-bold text-lg">{staffInfo.full_name}</p>
                      </div>
                      <p className="text-emerald-300 text-sm">{staffInfo.role_title || staffInfo.role}</p>
                      <div className="flex items-center justify-center gap-2 text-emerald-400 text-xs">
                        <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                        <span>{staffInfo.department}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {scanStatus === 'rejected' && (
                <div className="absolute inset-0 flex items-center justify-center bg-red-500/10 backdrop-blur-sm">
                  <div className="text-center px-6">
                    <div className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-red-500/50">
                      <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <p className="text-red-400 font-bold text-xl mb-2" dir="rtl">الدخول مرفوض</p>
                    {errorMessage && (
                      <p className="text-red-300 text-sm" dir="rtl">{errorMessage}</p>
                    )}
                  </div>
                </div>
              )}

              {scanStatus === 'needsPin' && (
                <div className="absolute inset-0 flex items-center justify-center bg-blue-500/10 backdrop-blur-sm">
                  <div className="text-center">
                    <Lock className="w-16 h-16 text-blue-400 mx-auto mb-3" />
                    <p className="text-blue-400 font-bold text-xl" dir="rtl">يتطلب رمز PIN</p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 text-center" dir="rtl">
              <p className="text-gray-400 text-sm mb-4">
                ضع رمز QR الخاص بك أمام الكاميرا
              </p>
              <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                <div className={`w-2 h-2 rounded-full ${
                  scanStatus === 'ready' ? 'bg-gray-500 animate-pulse' :
                  scanStatus === 'verifying' ? 'bg-blue-500 animate-pulse' :
                  scanStatus === 'valid' ? 'bg-emerald-500' :
                  scanStatus === 'rejected' ? 'bg-red-500' :
                  'bg-blue-500'
                }`}></div>
                <span>
                  {scanStatus === 'ready' && 'جاهز للمسح'}
                  {scanStatus === 'verifying' && 'جاري التحقق...'}
                  {scanStatus === 'valid' && 'تم القبول'}
                  {scanStatus === 'rejected' && 'تم الرفض'}
                  {scanStatus === 'needsPin' && 'يتطلب رمز PIN'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-white/10">
            <div className="flex items-center justify-center gap-3 text-gray-500 text-xs">
              <Shield className="w-4 h-4" />
              <span>محمي بتقنية التشفير المتقدم + AI</span>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-6 left-0 right-0 text-center">
        <p className="text-gray-600 text-xs">
          © 2026 Platform Security System | All Rights Reserved
        </p>
      </div>

      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-50"></div>
    </div>
  );
}
