import { useState } from 'react';
import { Crown, Phone, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SecretOwnerLoginProps {
  isOpen: boolean;
  onClose: () => void;
}

const AUTHORIZED_PHONE = '0544433244';
const AUTHORIZED_PIN = '2931';

export default function SecretOwnerLogin({ isOpen, onClose }: SecretOwnerLoginProps) {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const normalizePhone = (phoneNumber: string): string => {
    let normalized = phoneNumber.replace(/[\s\-\(\)]/g, '');

    if (normalized.startsWith('+966')) {
      normalized = '0' + normalized.substring(4);
    } else if (normalized.startsWith('966')) {
      normalized = '0' + normalized.substring(3);
    }

    return normalized;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    await new Promise(resolve => setTimeout(resolve, 800));

    const normalizedPhone = normalizePhone(phone);

    if (normalizedPhone !== AUTHORIZED_PHONE) {
      setError('رقم الجوال غير مصرح به');
      setIsLoading(false);
      return;
    }

    if (pin !== AUTHORIZED_PIN) {
      setError('الرقم السري غير صحيح');
      setIsLoading(false);
      return;
    }

    setIsLoading(false);

    sessionStorage.setItem('owner_session', 'true');
    sessionStorage.setItem('owner_access_time', new Date().toISOString());

    onClose();

    navigate('/admin/b2f');
  };

  const handleClose = () => {
    setPhone('');
    setPin('');
    setError('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{
        background: 'linear-gradient(135deg, #10B981 0%, #059669 50%, #047857 100%)',
      }}
    >
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
          backgroundSize: '40px 40px',
        }} />
      </div>

      <div
        className="relative w-full max-w-2xl mx-4"
        style={{
          animation: 'fadeInScale 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        <div
          className="bg-white rounded-[2rem] shadow-2xl overflow-hidden"
          style={{
            boxShadow: '0 30px 90px rgba(0, 0, 0, 0.4), 0 0 120px rgba(16, 185, 129, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
          }}
        >
          <div
            className="relative pt-12 pb-8 px-8 text-center"
            style={{
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
            }}
          >
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0" style={{
                backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
                backgroundSize: '32px 32px',
              }} />
            </div>

            <div className="relative">
              <div className="inline-flex items-center justify-center w-28 h-28 rounded-full bg-white/20 backdrop-blur-sm mb-6 shadow-lg">
                <Crown className="w-16 h-16 text-yellow-300" strokeWidth={2.5} />
              </div>

              <h2 className="text-4xl font-bold text-white mb-3" style={{
                textShadow: '3px 3px 6px rgba(0, 0, 0, 0.4)',
                letterSpacing: '0.5px',
              }}>
                دخول خاص
              </h2>

              <p className="text-emerald-50 text-lg font-medium">
                الوصول الحصري لإدارة استثمار المزارع
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-10 space-y-8">
            <div>
              <label className="block text-base font-bold text-gray-700 mb-3" dir="rtl">
                رقم الجوال
              </label>
              <div className="relative">
                <Phone className="absolute right-5 top-1/2 -translate-y-1/2 w-6 h-6 text-emerald-600" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setError('');
                  }}
                  placeholder="0544433244"
                  className="w-full pr-14 pl-6 py-5 border-2 border-gray-200 rounded-2xl text-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 transition-all outline-none text-center font-semibold"
                  dir="ltr"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-base font-bold text-gray-700 mb-3" dir="rtl">
                الرقم السري
              </label>
              <div className="relative">
                <Lock className="absolute right-5 top-1/2 -translate-y-1/2 w-6 h-6 text-emerald-600" />
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => {
                    setPin(e.target.value);
                    setError('');
                  }}
                  placeholder="••••"
                  maxLength={4}
                  className="w-full pr-14 pl-6 py-5 border-2 border-gray-200 rounded-2xl text-3xl tracking-widest focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 transition-all outline-none text-center font-bold"
                  dir="ltr"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-3 p-5 bg-red-50 border-2 border-red-200 rounded-2xl">
                <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                <p className="text-base font-bold text-red-700" dir="rtl">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-5 rounded-2xl font-bold text-xl text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: isLoading
                  ? 'linear-gradient(135deg, #9CA3AF 0%, #6B7280 100%)'
                  : 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                boxShadow: isLoading
                  ? 'none'
                  : '0 8px 24px rgba(16, 185, 129, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.4)',
              }}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-3">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  جاري التحقق...
                </span>
              ) : (
                'دخول'
              )}
            </button>

            <button
              type="button"
              onClick={handleClose}
              className="w-full py-4 rounded-2xl font-semibold text-base text-gray-600 hover:bg-gray-100 transition-all"
            >
              إلغاء
            </button>
          </form>
        </div>

        <p className="text-center text-white/80 text-sm mt-6 font-medium" dir="rtl">
          هذا المدخل مخصص للإدارة التنفيذية فقط
        </p>
      </div>

      <style>{`
        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: scale(0.9) translateY(20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
