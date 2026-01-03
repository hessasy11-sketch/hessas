import { useState } from 'react';
import { X, User, Phone, Lock, AlertCircle, Sparkles, CheckCircle, Shield, Loader2 } from 'lucide-react';
import { useInvestorAuth } from '../../contexts/InvestorAuthContext';

interface UnifiedRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  title?: string;
  subtitle?: string;
  context?: 'booking' | 'sidebar' | 'general';
  prefilledData?: {
    phone?: string;
    fullName?: string;
  };
}

type AuthMode = 'login' | 'register';

export function UnifiedRegistrationModal({
  isOpen,
  onClose,
  onSuccess,
  title,
  subtitle,
  context = 'general',
  prefilledData
}: UnifiedRegistrationModalProps) {
  const { signIn, signUp } = useInvestorAuth();
  const [authMode, setAuthMode] = useState<AuthMode>(prefilledData ? 'register' : 'login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const [authData, setAuthData] = useState({
    phone: prefilledData?.phone || '',
    password: '',
    fullName: prefilledData?.fullName || ''
  });

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const phoneNumber = authData.phone.startsWith('+966')
        ? authData.phone
        : `+966${authData.phone.replace(/^0+/, '')}`;

      if (!/^\+966\d{9}$/.test(phoneNumber)) {
        throw new Error('رقم الجوال غير صحيح');
      }

      if (!authData.password || authData.password.length < 6) {
        throw new Error('كلمة المرور يجب أن تكون 6 أرقام على الأقل');
      }

      if (authMode === 'register') {
        if (!authData.fullName.trim()) {
          throw new Error('الرجاء إدخال الاسم الكامل');
        }
        if (!/^\d+$/.test(authData.password)) {
          throw new Error('كلمة المرور يجب أن تحتوي على أرقام فقط');
        }
        await signUp(phoneNumber, authData.password, authData.fullName);
        console.log('✅ تم إنشاء الحساب بنجاح');
      } else {
        await signIn(phoneNumber, authData.password);
        console.log('✅ تم تسجيل الدخول بنجاح');
      }

      setShowSuccess(true);

      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        } else {
          setShowSuccess(false);
          onClose();
        }
      }, 1500);
    } catch (err: any) {
      console.error('❌ Auth error:', err);
      console.error('Error details:', {
        message: err.message,
        code: err.code,
        details: err.details
      });

      if (err.message?.includes('Invalid login credentials')) {
        setError('رقم الجوال أو كلمة المرور غير صحيحة');
      } else if (err.message?.includes('User already registered')) {
        setError('هذا الرقم مسجل مسبقاً. الرجاء تسجيل الدخول');
        setAuthMode('login');
      } else if (err.message?.includes('row-level security')) {
        setError('حدث خطأ في الأذونات. الرجاء المحاولة مرة أخرى.');
      } else if (err.message?.includes('فشل في إنشاء حساب المستثمر')) {
        setError('فشل في إنشاء الحساب. الرجاء المحاولة مرة أخرى.');
      } else {
        setError(err.message || 'حدث خطأ في العملية. الرجاء المحاولة مرة أخرى.');
      }
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  if (showSuccess) {
    const isBookingContext = context === 'booking';
    const isNewAccount = authMode === 'register';

    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[70] flex items-center justify-center p-4 animate-in fade-in">
        <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 animate-in fade-in zoom-in duration-300">
          <div className="text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-green-400 via-emerald-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce shadow-lg">
              <CheckCircle className="w-14 h-14 text-white" />
            </div>

            {isBookingContext && isNewAccount ? (
              <>
                <h3 className="text-2xl font-black text-gray-900 mb-3">
                  تهانينا! تم إنشاء حسابك وتسجيل حجزك بنجاح
                </h3>
                <p className="text-lg text-gray-600 mb-4">
                  شكراً لثقتك بنا. سيتم التواصل معك قريباً لاستكمال الإجراءات
                </p>
                <div className="bg-emerald-50 rounded-2xl p-4 mb-4">
                  <p className="text-sm text-emerald-800 font-medium">
                    يمكنك الآن متابعة حجزك وإدارة استثماراتك من خلال حسابك
                  </p>
                </div>
              </>
            ) : isBookingContext ? (
              <>
                <h3 className="text-2xl font-black text-gray-900 mb-3">
                  مرحباً بك مرة أخرى!
                </h3>
                <p className="text-lg text-gray-600 mb-4">
                  تم تسجيل دخولك وحجزك بنجاح
                </p>
              </>
            ) : isNewAccount ? (
              <>
                <h3 className="text-2xl font-black text-gray-900 mb-3">
                  تم إنشاء حسابك بنجاح!
                </h3>
                <p className="text-lg text-gray-600 mb-4">
                  يمكنك الآن الاستفادة من جميع خدماتنا الاستثمارية
                </p>
              </>
            ) : (
              <>
                <h3 className="text-2xl font-black text-gray-900 mb-3">
                  مرحباً بك مرة أخرى!
                </h3>
                <p className="text-lg text-gray-600 mb-4">
                  تم تسجيل دخولك بنجاح
                </p>
              </>
            )}

            <div className="flex items-center justify-center gap-2 text-emerald-600">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm font-bold">جاري فتح حسابك...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const contextMessages = {
    booking: {
      title: 'لإتمام الحجز',
      subtitle: 'سجل دخولك أو أنشئ حساباً جديداً لإكمال عملية الحجز',
      icon: '🌳'
    },
    sidebar: {
      title: 'الوصول لحسابك',
      subtitle: 'سجل دخولك للوصول إلى جميع خدماتك ومتابعة استثماراتك',
      icon: '🏆'
    },
    general: {
      title: 'مرحباً بك',
      subtitle: 'سجل دخولك أو أنشئ حساباً جديداً للبدء',
      icon: '✨'
    }
  };

  const currentContext = contextMessages[context];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in">
        <div className="relative bg-gradient-to-br from-emerald-500 via-green-500 to-emerald-600 p-8 rounded-t-3xl overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2"></div>

          <div className="relative z-10">
            <button
              onClick={onClose}
              className="absolute top-0 left-0 text-white/80 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="text-center mb-4">
              <div className="text-5xl mb-3 animate-bounce">{currentContext.icon}</div>
              <h2 className="text-2xl font-black text-white mb-2">
                {title || currentContext.title}
              </h2>
              <p className="text-white/90 text-sm leading-relaxed">
                {subtitle || currentContext.subtitle}
              </p>
            </div>

            {!prefilledData && (
              <div className="flex gap-2 bg-white/10 backdrop-blur-sm rounded-2xl p-1">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setError('');
                  }}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
                    authMode === 'login'
                      ? 'bg-white text-emerald-600 shadow-lg'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  تسجيل الدخول
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('register');
                    setError('');
                  }}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
                    authMode === 'register'
                      ? 'bg-white text-emerald-600 shadow-lg'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  حساب جديد
                </button>
              </div>
            )}

            {prefilledData && (
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 border border-white/30">
                <p className="text-white text-sm text-center font-semibold">
                  أكمل البيانات لإنشاء حسابك
                </p>
              </div>
            )}
          </div>
        </div>

        <form onSubmit={handleAuth} className="p-6">
          {error && (
            <div className="mb-4 bg-red-50 border-2 border-red-200 rounded-2xl p-4 flex items-start gap-3 animate-in fade-in">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-900 font-medium leading-relaxed">{error}</p>
            </div>
          )}

          {authMode === 'register' && !prefilledData?.fullName && (
            <div className="mb-4">
              <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                <User className="w-4 h-4 text-emerald-600" />
                الاسم الكامل
              </label>
              <div className="relative group">
                <input
                  type="text"
                  value={authData.fullName}
                  onChange={(e) => setAuthData({ ...authData, fullName: e.target.value })}
                  className="w-full px-4 py-4 border-2 border-gray-200 rounded-2xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all outline-none group-hover:border-gray-300"
                  placeholder="أدخل اسمك الكامل"
                  required={authMode === 'register'}
                />
              </div>
            </div>
          )}

          {prefilledData?.fullName && (
            <div className="mb-4">
              <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                <User className="w-4 h-4 text-emerald-600" />
                الاسم الكامل
              </label>
              <div className="relative group">
                <input
                  type="text"
                  value={authData.fullName}
                  readOnly
                  className="w-full px-4 py-4 border-2 border-emerald-200 bg-emerald-50 rounded-2xl outline-none text-gray-700 font-semibold"
                />
                <CheckCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-600" />
              </div>
            </div>
          )}

          {!prefilledData?.phone && (
            <div className="mb-4">
              <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                <Phone className="w-4 h-4 text-emerald-600" />
                رقم الجوال
              </label>
              <div className="relative group">
                <input
                  type="tel"
                  value={authData.phone}
                  onChange={(e) => setAuthData({ ...authData, phone: e.target.value })}
                  className="w-full px-4 py-4 border-2 border-gray-200 rounded-2xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all outline-none text-left group-hover:border-gray-300"
                  placeholder="05xxxxxxxx"
                  dir="ltr"
                  required
                />
              </div>
              <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                <Shield className="w-3 h-3" />
                مثال: 0512345678 أو +966512345678
              </p>
            </div>
          )}

          {prefilledData?.phone && (
            <div className="mb-4">
              <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                <Phone className="w-4 h-4 text-emerald-600" />
                رقم الجوال
              </label>
              <div className="relative group">
                <input
                  type="tel"
                  value={authData.phone}
                  readOnly
                  className="w-full px-4 py-4 border-2 border-emerald-200 bg-emerald-50 rounded-2xl outline-none text-left font-semibold text-gray-700"
                  dir="ltr"
                />
                <CheckCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-600" />
              </div>
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-600" />
              كلمة المرور
            </label>
            <div className="relative group">
              <input
                type="password"
                value={authData.password}
                onChange={(e) => setAuthData({ ...authData, password: e.target.value })}
                className="w-full px-4 py-4 border-2 border-gray-200 rounded-2xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all outline-none text-left group-hover:border-gray-300"
                placeholder="******"
                dir="ltr"
                minLength={6}
                required
              />
            </div>
            <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
              {authMode === 'register' && <Shield className="w-3 h-3" />}
              {authMode === 'register' ? 'كلمة المرور: 6 أرقام أو أكثر (مثال: 123456)' : 'أدخل كلمة المرور'}
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 hover:from-emerald-600 hover:via-green-600 hover:to-emerald-700 text-white font-black py-4 rounded-2xl transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>جاري العملية...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                <span>{authMode === 'login' ? 'تسجيل الدخول' : 'إنشاء الحساب'}</span>
              </>
            )}
          </button>

          <div className="mt-6 bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-4 border border-emerald-100">
            <p className="text-xs text-gray-700 leading-relaxed text-center">
              {authMode === 'login'
                ? 'بتسجيل دخولك، يمكنك الوصول إلى جميع خدماتك ومتابعة استثماراتك'
                : 'بإنشاء حساب، ستتمكن من حجز الفرص الاستثمارية ومتابعتها بسهولة'}
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
