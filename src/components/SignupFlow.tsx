import { useState, useEffect } from 'react';
import { X, User, Phone, Settings, Sparkles, Check, ArrowRight, ArrowLeft, Camera, MapPin, FileText, Eye, Moon, Bell, Grid, List, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface SignupFlowProps {
  onClose: () => void;
  onComplete: (userData: any) => void;
}

const SAUDI_CITIES = [
  'الرياض',
  'جدة',
  'مكة المكرمة',
  'المدينة المنورة',
  'الدمام',
  'الخبر',
  'الظهران',
  'الطائف',
  'تبوك',
  'بريدة',
  'خميس مشيط',
  'حائل',
  'نجران',
  'الجبيل',
  'ينبع',
  'الخرج',
  'الأحساء',
  'القطيف',
  'أبها',
  'عرعر',
  'الباحة',
  'جازان',
  'سكاكا',
  'القريات',
  'الدوادمي',
];

export function SignupFlow({ onClose, onComplete }: SignupFlowProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const [formData, setFormData] = useState({
    fullName: '',
    city: '',
    bio: '',
    avatarUrl: '',
    phoneNumber: '',
    viewMode: 'grid' as 'grid' | 'list',
    darkMode: false,
    notifications: true,
  });

  const [phoneVerified, setPhoneVerified] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');

  const progress = (currentStep / 4) * 100;

  const showSuccessToast = (message: string) => {
    setSuccessMessage(message);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleStep1Save = () => {
    if (!formData.fullName.trim()) {
      alert('الرجاء إدخال الاسم الكامل');
      return;
    }
    showSuccessToast('✅ تم حفظ معلوماتك الأساسية بنجاح');
    setTimeout(() => setCurrentStep(2), 1000);
  };

  const handleTestWhatsApp = () => {
    if (!formData.phoneNumber.trim()) {
      alert('الرجاء إدخال رقم الجوال أولاً');
      return;
    }
    const message = encodeURIComponent('مرحباً! أختبر رقم الواتساب من منصة حصص زراعية للاستثمار 🌾');
    window.open(`https://wa.me/${formData.phoneNumber}?text=${message}`, '_blank');
  };

  const handleSendOTP = () => {
    if (!formData.phoneNumber.trim()) {
      alert('الرجاء إدخال رقم الجوال');
      return;
    }
    setOtpSent(true);
    showSuccessToast('تم إرسال رمز التحقق عبر الواتساب');
  };

  const handleVerifyOTP = () => {
    if (otp === '1234') {
      setPhoneVerified(true);
      showSuccessToast('✅ تم توثيق رقمك بنجاح');
      setTimeout(() => setCurrentStep(3), 1500);
    } else {
      alert('رمز التحقق غير صحيح. جرب: 1234');
    }
  };

  const handleStep3Complete = () => {
    setCurrentStep(4);
  };

  const handleFinalSubmit = async () => {
    setLoading(true);
    try {
      const phoneClean = formData.phoneNumber.replace(/[^0-9]/g, '');
      const email = `${phoneClean}@agriauction.local`;
      const password = `AgriPass${phoneClean}${Math.random().toString(36).slice(-4)}`;

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          emailRedirectTo: undefined,
          data: {
            phone_number: formData.phoneNumber,
            display_name: formData.fullName,
            city: formData.city || '',
            bio: formData.bio || '',
          }
        }
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          throw new Error('هذا الرقم مسجل مسبقاً. الرجاء تسجيل الدخول.');
        }
        console.error('Auth error:', authError);
        throw new Error(`خطأ في التسجيل: ${authError.message}`);
      }

      if (authData.user) {
        showSuccessToast('✅ تم إنشاء حسابك بنجاح! مرحباً بك');

        await new Promise(resolve => setTimeout(resolve, 2000));

        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            phone_verified: phoneVerified,
          })
          .eq('id', authData.user.id);

        if (profileError) {
          console.error('Profile update error:', profileError);
        }

        onComplete({
          id: authData.user.id,
          email: email,
          ...formData,
        });
      }
    } catch (error: any) {
      console.error('Error:', error);
      const errorMsg = error.message || 'حدث خطأ أثناء إنشاء الحساب. الرجاء المحاولة مرة أخرى.';
      alert(errorMsg);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute left-4 top-4 p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">فتح حساب جديد</h2>
              <p className="text-emerald-50 text-sm">في حصص زراعية للاستثمار 🌿</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4 bg-white/20 rounded-full h-2 overflow-hidden">
            <div
              className="bg-white h-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-xs text-emerald-50 mt-1">
            الخطوة {currentStep} من 4
          </div>
        </div>

        {/* Success Toast */}
        {showSuccess && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-6 py-3 rounded-lg shadow-lg z-10 animate-fade-in">
            {successMessage}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: المعلومات الأساسية */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-slide-in">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <User className="w-8 h-8 text-emerald-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">المعلومات الأساسية</h3>
                <p className="text-sm text-gray-600">أدخل بياناتك لتكوين هويتك الزراعية</p>
              </div>

              <div className="space-y-4">
                {/* Avatar Upload */}
                <div className="flex justify-center mb-4">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-3xl font-bold">
                      {formData.fullName.charAt(0) || '👤'}
                    </div>
                    <button className="absolute bottom-0 right-0 bg-emerald-500 text-white p-2 rounded-full hover:bg-emerald-600 shadow-lg transition-colors">
                      <Camera className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Full Name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <User className="w-4 h-4 text-emerald-600" />
                    الاسم الكامل <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                    placeholder="مثال: محمد أحمد الزهراني"
                  />
                </div>

                {/* City */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    المدينة / المنطقة
                  </label>
                  <select
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  >
                    <option value="">اختر المدينة</option>
                    {SAUDI_CITIES.map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>

                {/* Bio */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-600" />
                    وصف بسيط (اختياري)
                  </label>
                  <textarea
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all resize-none"
                    placeholder="عرّف عن نفسك ونشاطك الزراعي..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: رقم التواصل */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-slide-in">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Phone className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">رقم التواصل (واتساب)</h3>
                <p className="text-sm text-gray-600">لأن التواصل في المزادات يتم عبر واتساب</p>
              </div>

              <div className="space-y-4">
                {/* Phone Number */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    رقم الجوال (واتساب) <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="tel"
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                      className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                      placeholder="05xxxxxxxx"
                      dir="ltr"
                      disabled={phoneVerified}
                    />
                    <button
                      onClick={handleTestWhatsApp}
                      className="px-4 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors text-sm whitespace-nowrap font-medium"
                    >
                      اختبار
                    </button>
                  </div>
                </div>

                {/* OTP Section */}
                {!phoneVerified && (
                  <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <Shield className="w-5 h-5 text-emerald-600 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-1">التحقق من الرقم</h4>
                        <p className="text-sm text-gray-600 mb-3">
                          سنرسل لك رمز تحقق عبر الواتساب لتأكيد الرقم
                        </p>

                        {!otpSent ? (
                          <button
                            onClick={handleSendOTP}
                            className="w-full bg-emerald-500 text-white py-2 rounded-lg hover:bg-emerald-600 transition-colors font-medium"
                          >
                            إرسال رمز التحقق
                          </button>
                        ) : (
                          <div className="space-y-3">
                            <input
                              type="text"
                              value={otp}
                              onChange={(e) => setOtp(e.target.value)}
                              className="w-full px-4 py-2 border-2 border-emerald-300 rounded-lg text-center text-2xl font-bold tracking-widest"
                              placeholder="----"
                              maxLength={4}
                              dir="ltr"
                            />
                            <button
                              onClick={handleVerifyOTP}
                              className="w-full bg-emerald-500 text-white py-2 rounded-lg hover:bg-emerald-600 transition-colors font-medium"
                            >
                              تأكيد الرمز
                            </button>
                            <button
                              onClick={handleSendOTP}
                              className="w-full text-emerald-600 text-sm hover:underline"
                            >
                              إعادة إرسال الرمز
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Verified Badge */}
                {phoneVerified && (
                  <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <div>
                      <h4 className="font-semibold text-green-900">تم توثيق رقمك بنجاح ✅</h4>
                      <p className="text-sm text-green-700">يمكنك الآن متابعة إنشاء الحساب</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: إعدادات الاستخدام */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-slide-in">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Settings className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">إعدادات الاستخدام المبدئية</h3>
                <p className="text-sm text-gray-600">خيارات خفيفة لتخصيص تجربتك</p>
              </div>

              <div className="space-y-4">
                {/* View Mode */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    طريقة عرض المزادات
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setFormData({ ...formData, viewMode: 'grid' })}
                      className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                        formData.viewMode === 'grid'
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Grid className="w-6 h-6" />
                      <span className="font-medium">بطاقات شبكية</span>
                    </button>
                    <button
                      onClick={() => setFormData({ ...formData, viewMode: 'list' })}
                      className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                        formData.viewMode === 'list'
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <List className="w-6 h-6" />
                      <span className="font-medium">قائمة</span>
                    </button>
                  </div>
                </div>

                {/* Dark Mode */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-3">
                      <Moon className="w-5 h-5 text-gray-600" />
                      <div>
                        <div className="font-medium text-gray-900">الوضع الليلي 🌙</div>
                        <div className="text-xs text-gray-500">راحة أكبر للعينين</div>
                      </div>
                    </div>
                    <button
                      onClick={() => setFormData({ ...formData, darkMode: !formData.darkMode })}
                      className={`relative w-14 h-7 rounded-full transition-colors ${
                        formData.darkMode ? 'bg-emerald-500' : 'bg-gray-300'
                      }`}
                    >
                      <div
                        className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-transform ${
                          formData.darkMode ? 'translate-x-7' : 'translate-x-0.5'
                        }`}
                        style={{ right: formData.darkMode ? 'auto' : '0.125rem' }}
                      />
                    </button>
                  </label>
                </div>

                {/* Notifications */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-3">
                      <Bell className="w-5 h-5 text-gray-600" />
                      <div>
                        <div className="font-medium text-gray-900">استقبال الإشعارات 🔔</div>
                        <div className="text-xs text-gray-500">المزايدات والعروض الجديدة</div>
                      </div>
                    </div>
                    <button
                      onClick={() => setFormData({ ...formData, notifications: !formData.notifications })}
                      className={`relative w-14 h-7 rounded-full transition-colors ${
                        formData.notifications ? 'bg-emerald-500' : 'bg-gray-300'
                      }`}
                    >
                      <div
                        className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-transform ${
                          formData.notifications ? 'translate-x-7' : 'translate-x-0.5'
                        }`}
                        style={{ right: formData.notifications ? 'auto' : '0.125rem' }}
                      />
                    </button>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: الموافقة الذكية */}
          {currentStep === 4 && (
            <div className="space-y-6 animate-slide-in">
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">مرحباً بك 🌿</h3>
                <p className="text-lg text-gray-700 font-medium">في حصص زراعية للاستثمار!</p>
              </div>

              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-2xl p-6">
                <div className="space-y-4 text-center">
                  <div className="text-gray-700 leading-relaxed">
                    <p className="mb-3">
                      نذكّرك أن <span className="font-bold text-emerald-600">عمولة المنصة (1%)</span> تكون في الذمّة عند نجاح البيع فقط.
                    </p>
                    <p>
                      بالضغط على <span className="font-bold">"موافق"</span>، يتم تفعيل حسابك فورًا.
                    </p>
                  </div>

                  <div className="bg-white rounded-xl p-4 space-y-2 text-sm text-right">
                    <div className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                      <span>الاسم: <strong>{formData.fullName}</strong></span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                      <span>المدينة: <strong>{formData.city || 'غير محدد'}</strong></span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                      <span>الجوال: <strong>{formData.phoneNumber}</strong> {phoneVerified && '✅'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="flex gap-3">
            {currentStep > 1 && currentStep < 4 && (
              <button
                onClick={() => setCurrentStep(currentStep - 1)}
                className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 transition-colors font-medium flex items-center gap-2"
              >
                <ArrowRight className="w-5 h-5" />
                رجوع
              </button>
            )}

            {currentStep === 1 && (
              <button
                onClick={handleStep1Save}
                className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white py-3 rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all font-bold flex items-center justify-center gap-2"
              >
                التالي
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}

            {currentStep === 2 && phoneVerified && (
              <button
                onClick={() => setCurrentStep(3)}
                className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white py-3 rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all font-bold flex items-center justify-center gap-2"
              >
                التالي
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}

            {currentStep === 3 && (
              <button
                onClick={handleStep3Complete}
                className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white py-3 rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all font-bold flex items-center justify-center gap-2"
              >
                التالي
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}

            {currentStep === 4 && (
              <>
                <button
                  onClick={onClose}
                  className="flex-1 border-2 border-gray-300 text-gray-700 py-3 rounded-xl hover:bg-gray-100 transition-colors font-bold"
                >
                  ❌ إلغاء
                </button>
                <button
                  onClick={handleFinalSubmit}
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white py-3 rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? 'جاري الإنشاء...' : '✅ موافق'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Shield({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}
