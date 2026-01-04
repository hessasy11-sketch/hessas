import { useState, useEffect } from 'react';
import { Shield, Lock } from 'lucide-react';
import QRCodeLib from 'qrcode';

interface StaffAccessCardProps {
  staffName: string;
  jobTitle: string;
  department: string;
  qrToken: string;
  requiresPin: boolean;
  onClose: () => void;
}

export function StaffAccessCard({ staffName, jobTitle, department, qrToken, requiresPin, onClose }: StaffAccessCardProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  useEffect(() => {
    generateQR();
  }, [qrToken]);

  const generateQR = async () => {
    try {
      const dataURL = await QRCodeLib.toDataURL(qrToken, {
        width: 300,
        margin: 1,
        color: { dark: '#000000', light: '#FFFFFF' }
      });
      setQrCodeUrl(dataURL);
    } catch (error) {
      console.error('Error generating QR:', error);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
        <div className="p-6 no-print">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-900" dir="rtl">بطاقة الدخول</h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 text-2xl"
            >
              ✕
            </button>
          </div>

          <div className="flex gap-3 mb-6">
            <button
              onClick={handlePrint}
              className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg transition-colors"
            >
              طباعة البطاقة
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg transition-colors"
            >
              إغلاق
            </button>
          </div>
        </div>

        <div className="print-only" id="access-card">
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-8 mx-6 mb-6 border-4 border-emerald-500 shadow-2xl">
            <div className="bg-white rounded-xl p-6">
              <div className="text-center mb-6">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                    <Shield className="w-7 h-7 text-white" />
                  </div>
                  <div className="text-right" dir="rtl">
                    <div className="text-lg font-bold text-slate-900">بوابة الدخول الذكي</div>
                    <div className="text-xs text-slate-600">Platform Access System</div>
                  </div>
                </div>
                <div className="h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent mb-4"></div>
              </div>

              <div className="text-center mb-6" dir="rtl">
                <h3 className="text-2xl font-bold text-slate-900 mb-1">{staffName}</h3>
                <p className="text-slate-600 font-medium mb-2">{jobTitle}</p>
                <div className="inline-block px-4 py-1 bg-slate-100 rounded-full">
                  <p className="text-sm text-slate-700">{department}</p>
                </div>
              </div>

              <div className="flex justify-center mb-6">
                <div className="bg-white p-4 rounded-xl border-4 border-slate-200 shadow-lg">
                  {qrCodeUrl ? (
                    <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" />
                  ) : (
                    <div className="w-48 h-48 flex items-center justify-center bg-gray-100 animate-pulse">
                      <span className="text-xs text-gray-500">جاري التحميل...</span>
                    </div>
                  )}
                </div>
              </div>

              {requiresPin && (
                <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 mb-4">
                  <div className="flex items-center justify-center gap-2 text-amber-800">
                    <Lock className="w-5 h-5" />
                    <span className="font-bold text-sm" dir="rtl">يتطلب رمز PIN للدخول</span>
                  </div>
                </div>
              )}

              <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-xs text-slate-600" dir="rtl">
                <p className="font-bold text-slate-800">تعليمات الاستخدام:</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>امسح الباركود عند بوابة الدخول</li>
                  {requiresPin && <li>أدخل رمز PIN المخصص لك</li>}
                  <li>احتفظ بالبطاقة في مكان آمن</li>
                  <li>لا تشارك بطاقتك مع أي شخص</li>
                </ul>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>© 2026 Platform Security</span>
                  <div className="flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    <span>Protected</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <style>
          {`
            @media print {
              body * {
                visibility: hidden;
              }
              #access-card, #access-card * {
                visibility: visible;
              }
              #access-card {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
              }
              .no-print {
                display: none !important;
              }
              .print-only {
                display: block !important;
              }
            }
            @media screen {
              .print-only {
                display: block;
              }
            }
          `}
        </style>
      </div>
    </div>
  );
}
