import { useState } from 'react';
import { X, UserPlus, CheckCircle, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { TermsAndConditionsModal } from './TermsAndConditionsModal';

interface GuestRegistrationModalProps {
  onSuccess: (userId: string) => void;
  onCancel: () => void;
  actionMessage?: string;
}

export function GuestRegistrationModal({
  onSuccess,
  onCancel,
  actionMessage = "للمتابعة وإكمال العملية"
}: GuestRegistrationModalProps) {
  const [step, setStep] = useState<'register' | 'reminder'>('register');
  const [loading, setLoading] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    phone_number: '',
    agreed: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.agreed) return;

    setLoading(true);
    try {
      const email = `${formData.phone_number.replace(/^0/, '966')}@temp.auction`;
      const password = 'temp123456';

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: formData.full_name,
            phone_number: formData.phone_number,
          }
        }
      });

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (signInError) {
            alert('حدث خطأ في تسجيل الدخول. يرجى المحاولة مرة أخرى');
            return;
          }

          if (signInData.user) {
            setStep('reminder');
          }
        } else {
          throw signUpError;
        }
      } else if (signUpData.user) {
        setStep('reminder');
      }
    } catch (error) {
      console.error('Error during registration:', error);
      alert('حدث خطأ أثناء التسجيل. يرجى المحاولة مرة أخرى');
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      onSuccess(data.user.id);
    }
  };

  if (step === 'reminder') {
    return (
      <div className="flex items-center justify-center p-4 min-h-full w-full overflow-y-auto" dir="rtl">
        <div className="bg-white rounded-2xl max-w-md w-full p-6 sm:p-8 text-center shadow-lg animate-in fade-in zoom-in duration-300">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12 text-emerald-600" />
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">
            ✅ مرحباً بك!
          </h2>

          <p className="text-sm sm:text-base text-gray-600 mb-6 leading-relaxed">
            تم إنشاء حسابك بنجاح. يمكنك الآن المتابعة والاستمتاع بجميع المزايا.
          </p>

          <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-3 sm:p-4 mb-6">
            <p className="text-xs sm:text-sm text-gray-900 leading-relaxed">
              💡 <strong>تذكير:</strong> لا تنسى تعبئة بياناتك الكاملة في الملف الشخصي من الصفحة الجانبية لتحصل على تجربة أفضل.
            </p>
          </div>

          <button
            onClick={handleContinue}
            className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white py-3 sm:py-4 rounded-xl font-bold text-sm sm:text-base hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg"
          >
            متابعة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-2 sm:p-4 min-h-full w-full overflow-y-auto" dir="rtl">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-lg animate-in fade-in zoom-in duration-300 my-auto">
        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-4 sm:p-6 rounded-t-2xl">
          <div className="flex justify-between items-center">
            <h2 className="text-lg sm:text-2xl font-bold text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5 sm:w-7 sm:h-7" />
              مرحباً بك في حصص زراعية للاستثمار
            </h2>
            <button
              onClick={onCancel}
              className="text-white hover:bg-white/20 p-2 rounded-full transition-all"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-gray-900 leading-relaxed text-center">
              🎉 <strong>{actionMessage}</strong>، يُرجى تسجيل بياناتك الأساسية أولاً
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            <div>
              <label className="block text-xs sm:text-sm font-bold text-gray-900 mb-2">
                🧍‍♂️ الاسم الكامل *
              </label>
              <input
                type="text"
                required
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full px-3 py-2 sm:px-4 sm:py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-right text-sm sm:text-base"
                placeholder="أدخل اسمك الكامل"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-bold text-gray-900 mb-2">
                📱 رقم الجوال *
              </label>
              <input
                type="tel"
                required
                value={formData.phone_number}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                className="w-full px-3 py-2 sm:px-4 sm:py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-right text-sm sm:text-base"
                placeholder="مثال: 0501234567"
                dir="ltr"
              />
              <p className="text-xs text-gray-500 mt-1">
                سيُستخدم لإنشاء حسابك
              </p>
            </div>

            <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-3 sm:p-4 space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.agreed}
                  onChange={(e) => setFormData({ ...formData, agreed: e.target.checked })}
                  className="mt-1 w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 rounded focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  required
                />
                <span className="text-xs sm:text-sm text-gray-900 leading-relaxed">
                  أوافق على <span className="font-bold">شروط وأحكام المنصة</span> و<span className="font-bold">سياسة الخصوصية</span>
                </span>
              </label>

              <div className="bg-white border border-amber-300 rounded-lg p-2 sm:p-3">
                <p className="text-xs text-gray-700 leading-relaxed mb-2">
                  بالمواصلة، أنت تقر بقراءة سياسة المنصة وتوافق على الشروط والأحكام وسياسة الخصوصية وآلية إدارة العمليات داخل النظام.
                </p>
                <button
                  type="button"
                  onClick={() => setShowTermsModal(true)}
                  className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-semibold text-xs sm:text-sm transition-colors"
                >
                  <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                  اعرف أكثر
                </button>
              </div>
            </div>

            <div className="flex gap-2 sm:gap-3 pt-2">
              <button
                type="submit"
                disabled={loading || !formData.agreed}
                className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white py-3 sm:py-4 rounded-xl font-bold text-sm sm:text-base hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
              >
                {loading ? 'جاري التسجيل...' : 'إنشاء حساب والمتابعة'}
              </button>
            </div>

            <button
              type="button"
              onClick={onCancel}
              className="w-full bg-gray-100 text-gray-700 py-2 sm:py-3 rounded-xl font-medium text-sm sm:text-base hover:bg-gray-200 transition-all"
            >
              إلغاء
            </button>
          </form>
        </div>
      </div>

      {/* Terms Modal */}
      {showTermsModal && (
        <TermsAndConditionsModal onClose={() => setShowTermsModal(false)} />
      )}
    </div>
  );
}
