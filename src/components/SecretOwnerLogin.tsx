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
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.97) 0%, rgba(5, 150, 105, 0.97) 100%)',
        backdropFilter: 'blur(20px)',
      }}
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="bg-white rounded-3xl shadow-2xl overflow-hidden"
          style={{
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3), 0 0 100px rgba(16, 185, 129, 0.5)',
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
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm mb-4">
                <Crown className="w-10 h-10 text-yellow-300" strokeWidth={2.5} />
              </div>

              <h2 className="text-2xl font-bold text-white mb-2" style={{
                textShadow: '2px 2px 4px rgba(0, 0, 0, 0.3)',
              }}>
                دخول خاص
              </h2>

              <p className="text-emerald-50 text-sm">
                الوصول الحصري لإدارة استثمار المزارع
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2" dir="rtl">
                رقم الجوال
              </label>
              <div className="relative">
                <Phone className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-600" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setError('');
                  }}
                  placeholder="0544433244"
                  className="w-full pr-12 pl-4 py-4 border-2 border-gray-200 rounded-xl text-lg focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 transition-all outline-none text-center font-medium"
                  dir="ltr"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2" dir="rtl">
                الرقم السري
              </label>
              <div className="relative">
                <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-600" />
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => {
                    setPin(e.target.value);
                    setError('');
                  }}
                  placeholder="••••"
                  maxLength={4}
                  className="w-full pr-12 pl-4 py-4 border-2 border-gray-200 rounded-xl text-2xl tracking-widest focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 transition-all outline-none text-center font-bold"
                  dir="ltr"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-4 bg-red-50 border-2 border-red-200 rounded-xl">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <p className="text-sm font-bold text-red-700" dir="rtl">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 rounded-xl font-bold text-lg text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: isLoading
                  ? 'linear-gradient(135deg, #9CA3AF 0%, #6B7280 100%)'
                  : 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                boxShadow: isLoading
                  ? 'none'
                  : '0 6px 20px rgba(16, 185, 129, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
              }}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  جاري التحقق...
                </span>
              ) : (
                'دخول'
              )}
            </button>

            <button
              type="button"
              onClick={handleClose}
              className="w-full py-3 rounded-xl font-medium text-gray-600 hover:bg-gray-100 transition-all"
            >
              إلغاء
            </button>
          </form>
        </div>

        <p className="text-center text-white/70 text-xs mt-4" dir="rtl">
          هذا المدخل مخصص للإدارة التنفيذية فقط
        </p>
      </div>
    </div>
  );
}
