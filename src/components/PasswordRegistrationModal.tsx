import { useState } from 'react';
import { X, Phone, Lock, Check, AlertCircle, Shield, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { TermsAndConditionsModal } from './TermsAndConditionsModal';

interface PasswordRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function PasswordRegistrationModal({ isOpen, onClose, onSuccess }: PasswordRegistrationModalProps) {
  const [step, setStep] = useState<'phone' | 'password'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  if (!isOpen) return null;

  const validatePhone = (phone: string): boolean => {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length >= 10;
  };

  const validatePassword = (pwd: string): boolean => {
    const cleaned = pwd.replace(/\D/g, '');
    return cleaned.length >= 4 && cleaned.length <= 10;
  };

  const handlePhoneSubmit = async () => {
    setError('');
    
    if (!validatePhone(phoneNumber)) {
      setError('رقم الجوال غير صحيح');
      return;
    }

    setLoading(true);
    try {
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('phone_number', phoneNumber)
        .maybeSingle();

      if (existing) {
        setError('رقم الجوال مسجل مسبقاً');
        setLoading(false);
        return;
      }

      setStep('password');
    } catch (err) {
      setError('حدث خطأ، يرجى المحاولة مرة أخرى');
    } finally {
      setLoading(false);
    }
  };

  const hashPassword = async (pwd: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(pwd);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handlePasswordSubmit = async () => {
    setError('');

    const cleanedPwd = password.replace(/\D/g, '');
    const cleanedConfirm = confirmPassword.replace(/\D/g, '');

    if (!validatePassword(cleanedPwd)) {
      setError('كلمة المرور يجب أن تكون من 4 إلى 10 أرقام');
      return;
    }

    if (cleanedPwd !== cleanedConfirm) {
      setError('كلمة المرور غير متطابقة');
      return;
    }

    if (!agreedToTerms) {
      setError('يرجى الموافقة على الشروط والأحكام لإكمال التسجيل');
      return;
    }

    setLoading(true);
    try {
      const passwordHash = await hashPassword(cleanedPwd);

      const { data: { user }, error: signUpError } = await supabase.auth.signUp({
        email: `${phoneNumber.replace(/\D/g, '')}@temp.mazadat.com`,
        password: Math.random().toString(36).substring(2, 15)
      });

      if (signUpError) throw signUpError;

      if (user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            phone_number: phoneNumber,
            display_name: phoneNumber,
            password_hash: passwordHash,
            phone_verified: true,
            registration_completed: true
          })
          .eq('id', user.id);

        if (profileError) throw profileError;

        alert('تم التسجيل بنجاح! يمكنك الآن تسجيل الدخول');
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ في التسجيل');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[10000] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {step === 'phone' && 'تسجيل حساب جديد'}
            {step === 'password' && 'إنشاء كلمة المرور'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border-2 border-red-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {step === 'phone' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                رقم الجوال
              </label>
              <div className="relative">
                <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="05xxxxxxxx"
                  className="w-full pr-12 pl-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none text-right"
                  dir="ltr"
                />
              </div>
            </div>

            <button
              onClick={handlePhoneSubmit}
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'جاري التحقق...' : 'التالي'}
            </button>
          </div>
        )}

        {step === 'password' && (
          <div className="space-y-4">
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-4">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-semibold mb-1">شروط كلمة المرور:</p>
                  <ul className="space-y-1">
                    <li>• أرقام فقط (0-9)</li>
                    <li>• من 4 إلى 10 أرقام</li>
                    <li>• يمكنك اختيار أي أرقام تحبها</li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                كلمة المرور
              </label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value.replace(/\D/g, ''))}
                  placeholder="أدخل 4 أرقام على الأقل"
                  maxLength={10}
                  className="w-full pr-12 pl-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none text-center text-2xl tracking-widest"
                  dir="ltr"
                  inputMode="numeric"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1 text-center">
                {password.length} / 10 أرقام
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                تأكيد كلمة المرور
              </label>
              <div className="relative">
                <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value.replace(/\D/g, ''))}
                  placeholder="أعد إدخال كلمة المرور"
                  maxLength={10}
                  className="w-full pr-12 pl-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none text-center text-2xl tracking-widest"
                  dir="ltr"
                  inputMode="numeric"
                />
              </div>
            </div>

            <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-1 w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                />
                <span className="text-sm text-gray-900 leading-relaxed">
                  أوافق على <span className="font-bold">شروط وأحكام المنصة</span> و<span className="font-bold">سياسة الخصوصية</span>
                </span>
              </label>

              <div className="bg-white border border-amber-300 rounded-lg p-3">
                <p className="text-xs text-gray-700 leading-relaxed mb-2">
                  بالمواصلة، أنت تقر بقراءة سياسة المنصة وتوافق على الشروط والأحكام وسياسة الخصوصية وآلية إدارة العمليات داخل النظام.
                </p>
                <button
                  type="button"
                  onClick={() => setShowTermsModal(true)}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold text-sm transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  اعرف أكثر
                </button>
              </div>
            </div>

            <button
              onClick={handlePasswordSubmit}
              disabled={loading || !password || !confirmPassword || !agreedToTerms}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'جاري الإنشاء...' : 'إنشاء الحساب'}
            </button>
          </div>
        )}

      </div>

      {/* Terms Modal */}
      {showTermsModal && (
        <TermsAndConditionsModal onClose={() => setShowTermsModal(false)} />
      )}
    </div>
  );
}
