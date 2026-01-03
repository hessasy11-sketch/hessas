import { useState } from 'react';
import { X, Check, User, Phone, MapPin, FileText, AlertCircle, Sparkles, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { TermsAndConditionsModal } from './TermsAndConditionsModal';

interface CompleteRegistrationModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function CompleteRegistrationModal({ onClose, onSuccess }: CompleteRegistrationModalProps) {
  const { user, profile, refreshProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showTermsModal, setShowTermsModal] = useState(false);

  const [formData, setFormData] = useState({
    displayName: profile?.display_name || '',
    phoneNumber: profile?.phone_number || '',
    city: profile?.city || '',
    bio: profile?.bio || '',
    agreedToTerms: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (step < 5) {
      setStep(step + 1);
      return;
    }

    if (!formData.agreedToTerms) {
      setError('يجب الموافقة على الشروط والعمولة للمتابعة');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          display_name: formData.displayName,
          phone_number: formData.phoneNumber,
          city: formData.city,
          bio: formData.bio || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user?.id);

      if (updateError) throw updateError;

      await refreshProfile();

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء حفظ البيانات');
    } finally {
      setLoading(false);
    }
  };

  const isStepValid = () => {
    switch (step) {
      case 1:
        return formData.displayName.trim().length >= 3;
      case 2:
        return formData.phoneNumber.trim().length >= 10;
      case 3:
        return formData.city.trim().length >= 2;
      case 4:
        return true;
      case 5:
        return formData.agreedToTerms;
      default:
        return false;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-emerald-500 to-teal-600 text-white p-6 rounded-t-2xl z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">
                  {profile?.display_name ? 'استكمال تسجيل حسابك' : 'فتح حساب جديد'}
                </h2>
                <p className="text-sm text-emerald-100">
                  الخطوة {step} من 5
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 p-2 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <div
                key={s}
                className={`h-2 flex-1 rounded-full transition-all ${
                  s <= step ? 'bg-white' : 'bg-white/30'
                }`}
              />
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right duration-300">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="w-8 h-8 text-emerald-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">ما هو اسمك الكامل؟</h3>
                <p className="text-sm text-gray-600">
                  سيظهر اسمك للمستخدمين الآخرين في المنصة
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الاسم الكامل <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="مثال: محمد أحمد العتيبي"
                  autoFocus
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  يجب أن يكون 3 أحرف على الأقل
                </p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right duration-300">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Phone className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">رقم الواتساب</h3>
                <p className="text-sm text-gray-600">
                  سيستخدم للتواصل معك عند المزايدات
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  رقم الجوال (واتساب) <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="05xxxxxxxx"
                  dir="ltr"
                  autoFocus
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  تأكد من أن الرقم صحيح وفعال على واتساب
                </p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right duration-300">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MapPin className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">أين تقع؟</h3>
                <p className="text-sm text-gray-600">
                  لعرض المزادات القريبة منك
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  المدينة / المنطقة <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="مثال: الرياض"
                  autoFocus
                  required
                />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right duration-300">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">وصف بسيط (اختياري)</h3>
                <p className="text-sm text-gray-600">
                  عرّف عن نفسك ونشاطك الزراعي
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الوصف
                </label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                  placeholder="مثال: مزارع متخصص في الخضروات والفواكه..."
                  rows={4}
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-1">
                  يمكنك تخطي هذه الخطوة
                </p>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right duration-300">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-amber-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">الموافقة على الشروط والأحكام</h3>
                <p className="text-sm text-gray-600">
                  خطوة أخيرة لإتمام التسجيل
                </p>
              </div>

              <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.agreedToTerms}
                    onChange={(e) => setFormData({ ...formData, agreedToTerms: e.target.checked })}
                    className="mt-1 w-5 h-5 text-emerald-600 rounded focus:ring-2 focus:ring-emerald-500 cursor-pointer"
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
                    className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-semibold text-sm transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    اعرف أكثر
                  </button>
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-emerald-800 leading-relaxed">
                    <p className="font-medium mb-1">ملاحظة هامة:</p>
                    <p>
                      عمولة المنصة <span className="font-bold">1% فقط</span> تُحسب من قيمة البيع النهائية،
                      وتُدفع بعد إتمام الصفقة بنجاح <span className="text-amber-600 font-medium">(بالذمة)</span>.
                      لا توجد رسوم مسبقة أو رسوم خفية.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2 mt-4">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="flex gap-3 mt-6">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                السابق
              </button>
            )}
            <button
              type="submit"
              disabled={!isStepValid() || loading}
              className="flex-1 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                'جاري الحفظ...'
              ) : step === 5 ? (
                <>
                  <Check className="w-5 h-5" />
                  إنهاء التسجيل
                </>
              ) : (
                'التالي'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Terms Modal */}
      {showTermsModal && (
        <TermsAndConditionsModal onClose={() => setShowTermsModal(false)} />
      )}
    </div>
  );
}
