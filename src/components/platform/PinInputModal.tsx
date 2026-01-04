import { useState, useRef, useEffect } from 'react';
import { Lock, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';

interface PinInputModalProps {
  staffId: string;
  staffName: string;
  onSuccess: () => void;
  onCancel: () => void;
  onPinVerification: (staffId: string, pin: string) => Promise<{
    success: boolean;
    message: string;
    attempts_remaining?: number;
    locked_until?: string;
  }>;
}

export function PinInputModal({
  staffId,
  staffName,
  onSuccess,
  onCancel,
  onPinVerification,
}: PinInputModalProps) {
  const [pin, setPin] = useState<string[]>(['', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string>('');
  const [attemptsRemaining, setAttemptsRemaining] = useState<number>(3);
  const [isLocked, setIsLocked] = useState(false);
  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  useEffect(() => {
    console.log('🔑 PIN Modal Mounted:', { staffId, staffName });
    inputRefs[0].current?.focus();
  }, [staffId, staffName]);

  const handleInputChange = async (index: number, value: string) => {
    if (isVerifying || isLocked) return;

    if (!/^\d*$/.test(value)) return;

    const newPin = [...pin];
    newPin[index] = value.slice(-1);
    setPin(newPin);
    setError('');

    if (value && index < 3) {
      inputRefs[index + 1].current?.focus();
    }

    const isComplete = newPin.every((digit) => digit !== '');
    if (isComplete) {
      await verifyPin(newPin.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();

    if (/^\d{4}$/.test(pastedData)) {
      const newPin = pastedData.split('');
      setPin(newPin);
      inputRefs[3].current?.focus();
      verifyPin(pastedData);
    }
  };

  const verifyPin = async (pinCode: string) => {
    setIsVerifying(true);
    setError('');

    try {
      const result = await onPinVerification(staffId, pinCode);

      if (result.success) {
        onSuccess();
      } else {
        if (result.attempts_remaining !== undefined) {
          setAttemptsRemaining(result.attempts_remaining);
        }

        if (result.attempts_remaining === 0) {
          setIsLocked(true);
          setError('تم قفل PIN لمدة 30 دقيقة');
        } else {
          setError(result.message);
          setPin(['', '', '', '']);
          inputRefs[0].current?.focus();
        }
      }
    } catch (err) {
      setError('حدث خطأ في التحقق');
      setPin(['', '', '', '']);
      inputRefs[0].current?.focus();
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl border border-white/10 shadow-2xl max-w-md w-full p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-600/20 border border-blue-500/30 mb-4">
            <Lock className="w-8 h-8 text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2" dir="rtl">
            أدخل رمز PIN
          </h2>
          <p className="text-gray-400 text-sm" dir="rtl">
            مرحباً {staffName}
          </p>
        </div>

        {isLocked ? (
          <div className="text-center py-8">
            <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <p className="text-red-400 font-bold text-lg mb-2" dir="rtl">
              تم قفل PIN
            </p>
            <p className="text-red-300 text-sm" dir="rtl">
              تم قفل PIN لمدة 30 دقيقة بعد 3 محاولات فاشلة
            </p>
            <button
              onClick={onCancel}
              className="mt-6 px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors"
            >
              إغلاق
            </button>
          </div>
        ) : (
          <>
            <div className="flex justify-center gap-3 mb-6" dir="ltr">
              {pin.map((digit, index) => (
                <input
                  key={index}
                  ref={inputRefs[index]}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleInputChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={handlePaste}
                  disabled={isVerifying || isLocked}
                  className="w-16 h-20 text-center text-3xl font-bold bg-white/5 border-2 border-white/10 rounded-xl text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all disabled:opacity-50"
                  autoComplete="off"
                />
              ))}
            </div>

            {isVerifying && (
              <div className="flex items-center justify-center gap-2 text-blue-400 mb-4">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm" dir="rtl">جاري التحقق...</span>
              </div>
            )}

            {error && (
              <div className="flex items-center justify-center gap-2 text-red-400 mb-4 bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm" dir="rtl">{error}</p>
              </div>
            )}

            <div className="flex items-center justify-center gap-2 mb-6">
              <div className="flex gap-1">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      i < attemptsRemaining ? 'bg-blue-500' : 'bg-red-500'
                    }`}
                  />
                ))}
              </div>
              <span className="text-gray-400 text-xs" dir="rtl">
                {attemptsRemaining} محاولات متبقية
              </span>
            </div>

            <div className="space-y-3">
              <button
                onClick={onCancel}
                disabled={isVerifying}
                className="w-full px-6 py-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl font-medium transition-colors disabled:opacity-50"
              >
                إلغاء
              </button>
            </div>

            <div className="mt-6 text-center">
              <p className="text-gray-500 text-xs" dir="rtl">
                أدخل رمز PIN المكون من 4 أرقام
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
