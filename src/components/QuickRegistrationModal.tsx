import { useState } from 'react';
import { X, Phone, Lock, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface QuickRegistrationModalProps {
  onClose: () => void;
  onSuccess: (userId: string) => void;
}

export function QuickRegistrationModal({ onClose, onSuccess }: QuickRegistrationModalProps) {
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'phone' | 'pin'>('phone');

  const validatePhone = (phoneNumber: string): boolean => {
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    return cleanPhone.length >= 9 && cleanPhone.length <= 12;
  };

  const validatePin = (pinValue: string): boolean => {
    return /^\d{4}$/.test(pinValue);
  };

  const formatPhone = (value: string): string => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.startsWith('966')) {
      return '+' + cleaned;
    } else if (cleaned.startsWith('0')) {
      return '+966' + cleaned.substring(1);
    } else if (cleaned.length > 0 && !cleaned.startsWith('+')) {
      return '+966' + cleaned;
    }
    return value;
  };

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validatePhone(phone)) {
      setError('الرجاء إدخال رقم جوال صحيح');
      return;
    }

    const formattedPhone = formatPhone(phone);
    setPhone(formattedPhone);
    setStep('pin');
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validatePin(pin)) {
      setError('الرقم السري يجب أن يكون 4 أرقام');
      return;
    }

    if (pin !== confirmPin) {
      setError('الرقم السري غير متطابق');
      return;
    }

    setLoading(true);

    try {
      const formattedPhone = formatPhone(phone);
      const email = `${formattedPhone.replace(/\D/g, '')}@temp.99hassas.com`;
      const password = `${formattedPhone}-${pin}`;

      // التحقق من وجود المستخدم أولاً
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, phone_number')
        .eq('phone_number', formattedPhone)
        .maybeSingle();

      let userId: string;

      if (existingProfile) {
        // المستخدم موجود - محاولة تسجيل الدخول
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (signInError) {
          // إذا فشل تسجيل الدخول، ربما الرقم السري خاطئ
          setError('هذا الرقم مسجل مسبقاً. الرجاء التحقق من الرقم السري');
          setLoading(false);
          return;
        }

        if (!signInData.user) {
          throw new Error('فشل تسجيل الدخول');
        }

        userId = signInData.user.id;
      } else {
        // مستخدم جديد - إنشاء حساب
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              phone: formattedPhone,
              display_name: formattedPhone,
              registration_completed: false,
            }
          }
        });

        if (signUpError) throw signUpError;
        if (!authData.user) throw new Error('فشل إنشاء الحساب');

        const simplePin = btoa(pin);

        // تحديث البروفايل
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            phone_number: formattedPhone,
            pin_hash: simplePin,
            has_pin: true,
            pin_created_at: new Date().toISOString(),
            registration_completed: true
          })
          .eq('id', authData.user.id);

        if (updateError) {
          console.error('Profile update error:', updateError);
        }

        userId = authData.user.id;
      }

      onSuccess(userId);
    } catch (err: any) {
      console.error('Registration error:', err);
      if (err.message?.includes('already registered') || err.message?.includes('User already registered')) {
        setError('رقم الجوال مسجل مسبقاً. يرجى استخدام رقم آخر أو تسجيل الدخول');
      } else {
        setError('حدث خطأ أثناء التسجيل. الرجاء المحاولة مرة أخرى');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep('phone');
    setPin('');
    setConfirmPin('');
    setError(null);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full relative animate-in fade-in duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 left-4 z-10 bg-gray-100 hover:bg-gray-200 rounded-full p-2 transition-colors"
          disabled={loading}
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>

        <div className="p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg">
              <span className="text-3xl">🌾</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              مرحباً بك في حصص زراعية 99
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              {step === 'phone'
                ? 'قبل إرسال طلبك، نحتاج إنشاء حساب بسيط لك برقم الجوال فقط'
                : 'اختر رقم سري من 4 أرقام لحماية حسابك'
              }
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl flex items-start gap-3 mb-6">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {step === 'phone' ? (
            <form onSubmit={handlePhoneSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  رقم الجوال
                </label>
                <div className="relative">
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <Phone className="w-5 h-5" />
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="05xxxxxxxx"
                    className="w-full pr-12 pl-4 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-right"
                    dir="ltr"
                    maxLength={12}
                    required
                    disabled={loading}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2 text-right">
                  سيتم إضافة +966 تلقائياً
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || !phone}
                className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white py-4 rounded-xl font-bold hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    جاري المعالجة...
                  </>
                ) : (
                  'متابعة'
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handlePinSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  الرقم السري (4 أرقام)
                </label>
                <div className="relative">
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    type="password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="• • • •"
                    className="w-full pr-12 pl-4 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-center text-2xl tracking-widest"
                    maxLength={4}
                    inputMode="numeric"
                    pattern="\d{4}"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  تأكيد الرقم السري
                </label>
                <div className="relative">
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    type="password"
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="• • • •"
                    className="w-full pr-12 pl-4 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-center text-2xl tracking-widest"
                    maxLength={4}
                    inputMode="numeric"
                    pattern="\d{4}"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={loading}
                  className="flex-1 bg-gray-100 text-gray-700 py-4 rounded-xl font-bold hover:bg-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  رجوع
                </button>
                <button
                  type="submit"
                  disabled={loading || pin.length !== 4 || confirmPin.length !== 4}
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white py-4 rounded-xl font-bold hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      جاري التسجيل...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      إنشاء الحساب
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-xs text-gray-500 text-center leading-relaxed">
              بالمتابعة، أنت توافق على شروط وأحكام المنصة وسياسة الخصوصية
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
