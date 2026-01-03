import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { LogIn, X, AlertCircle } from 'lucide-react';

interface StaffAccessProps {
  onNavigate: (page: string) => void;
}

export function HiddenStaffAccess({ onNavigate }: StaffAccessProps) {
  const [tapCount, setTapCount] = useState(0);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showUnauthorized, setShowUnauthorized] = useState(false);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (tapCount > 0 && tapCount < 7) {
      const timer = setTimeout(() => {
        setTapCount(0);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [tapCount]);

  const handleOliveTap = async () => {
    const newCount = tapCount + 1;
    setTapCount(newCount);

    if (newCount === 7) {
      setTapCount(0);
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        await verifyStaffAccess(user.id);
      } else {
        setShowLoginModal(true);
      }
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      console.log('Attempting login with phone:', phone);

      // محاولة تسجيل الدخول باستخدام نظام password_hash الجديد
      const { data: verifyResult, error: verifyError } = await supabase
        .rpc('verify_login', {
          p_phone_number: phone,
          p_password: password
        });

      console.log('Verify login result:', { verifyResult, verifyError });

      if (!verifyError && verifyResult && verifyResult.length > 0 && verifyResult[0].success) {
        const loginResult = verifyResult[0];
        console.log('User authenticated successfully via verify_login:', loginResult.user_id);
        await verifyStaffAccess(loginResult.user_id);
        setShowLoginModal(false);
        setPhone('');
        setPassword('');
        setIsLoading(false);
        return;
      }

      // إذا فشل النظام الجديد، نحاول النظام القديم (auth.users)
      console.log('Trying legacy auth system...');

      const { data: authUserData, error: authError } = await supabase
        .rpc('get_email_by_phone', { phone_param: phone });

      console.log('Email lookup result:', { authUserData, authError });

      if (authError) {
        console.error('Email lookup error:', authError);
        setError(`خطأ في البحث: ${authError.message}`);
        setIsLoading(false);
        return;
      }

      if (!authUserData) {
        setError('رقم الجوال أو كلمة المرور غير صحيحة');
        setIsLoading(false);
        return;
      }

      console.log('Attempting sign in with email:', authUserData);

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: authUserData,
        password,
      });

      console.log('Sign in result:', { data, signInError });

      if (signInError) {
        console.error('Sign in error:', signInError);
        setError('رقم الجوال أو كلمة المرور غير صحيحة');
        setIsLoading(false);
        return;
      }

      if (data.user) {
        console.log('User authenticated successfully:', data.user.id);
        await verifyStaffAccess(data.user.id);
        setShowLoginModal(false);
        setPhone('');
        setPassword('');
      }
    } catch (err) {
      console.error('Login exception:', err);
      setError(`حدث خطأ: ${err instanceof Error ? err.message : 'خطأ غير معروف'}`);
      setIsLoading(false);
    }
  };

  const verifyStaffAccess = async (userId: string) => {
    try {
      const { data: platformRole } = await supabase.rpc('get_platform_role', {
        check_user_id: userId
      });

      if (platformRole) {
        onNavigate('platformCommand');
        return;
      }

      const { data: isB2FAdmin } = await supabase.rpc('is_b2f_admin', {
        user_id_param: userId
      });

      if (isB2FAdmin) {
        onNavigate('adminDashboard');
        return;
      }

      const { data: farmTeamMember } = await supabase
        .from('farm_team')
        .select('farm_id, role')
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle();

      if (farmTeamMember) {
        onNavigate('adminDashboard');
        return;
      }

      setShowUnauthorized(true);
      setTimeout(() => setShowUnauthorized(false), 3000);

    } catch (error) {
      console.error('Error verifying staff access:', error);
      setShowUnauthorized(true);
      setTimeout(() => setShowUnauthorized(false), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleOliveTap}
        className={`fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg hover:shadow-xl z-40 ${
          tapCount > 0
            ? 'opacity-90 scale-125 bg-emerald-500/30 ring-4 ring-emerald-400/50'
            : 'opacity-60 hover:opacity-90 bg-emerald-500/20 hover:bg-emerald-500/30'
        }`}
        aria-label="Staff Access"
        style={{
          backdropFilter: 'blur(8px)',
        }}
      >
        <span className="text-3xl">🫒</span>
      </button>

      {showLoginModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fadeIn" dir="rtl">
          {/* Background with animated gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/95 via-teal-800/95 to-emerald-900/95 backdrop-blur-xl" />

          {/* Animated circles background */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-20 left-20 w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-20 right-20 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-400/10 rounded-full blur-3xl animate-pulse delay-500" />
          </div>

          {/* Login Card */}
          <div className="relative w-full max-w-md transform transition-all animate-slideUp">
            <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/20">
              {/* Header with close button */}
              <button
                onClick={() => {
                  setShowLoginModal(false);
                  setError('');
                  setPhone('');
                  setPassword('');
                }}
                className="absolute top-6 left-6 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-emerald-700 hover:text-emerald-900 transition-all backdrop-blur-sm border border-emerald-200/30"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Decorative top section */}
              <div className="relative h-48 bg-gradient-to-br from-emerald-500 via-teal-500 to-emerald-600 overflow-hidden">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30" />

                <div className="relative h-full flex flex-col items-center justify-center text-center px-6">
                  <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-md border border-white/30 shadow-xl transform hover:scale-110 transition-transform">
                    <LogIn className="w-10 h-10 text-white" />
                  </div>
                  <h2 className="text-3xl font-bold text-white mb-2 drop-shadow-lg">
                    دخول الموظفين
                  </h2>
                  <p className="text-emerald-50/90 text-sm">
                    نظام متقدم للموظفين المصرح لهم فقط
                  </p>
                </div>
              </div>

              {/* Form Section */}
              <form onSubmit={handleLogin} className="p-8 space-y-5">
                {error && (
                  <div className="bg-gradient-to-r from-red-50 to-rose-50 border-r-4 border-red-500 rounded-xl p-4 flex items-start gap-3 animate-shake">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    </div>
                    <p className="text-sm text-red-800 font-medium">{error}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700 mr-1">
                    رقم الجوال
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-4 py-3.5 bg-gray-50/50 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none text-gray-700 font-medium"
                      placeholder="05XXXXXXXX"
                      required
                      disabled={isLoading}
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700 mr-1">
                    كلمة المرور
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3.5 bg-gray-50/50 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none text-gray-700 font-medium"
                      placeholder="••••••••"
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-6 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white py-4 rounded-xl font-bold text-lg hover:from-emerald-600 hover:via-teal-600 hover:to-emerald-700 transition-all shadow-xl hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-3">
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>جاري التحقق من البيانات...</span>
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <span>دخول</span>
                      <LogIn className="w-5 h-5" />
                    </span>
                  )}
                </button>

                <div className="text-center pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500 flex items-center justify-center gap-2">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <span>نظام آمن ومشفر للموظفين المصرح لهم</span>
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  </p>
                </div>
              </form>
            </div>
          </div>

          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes slideUp {
              from {
                opacity: 0;
                transform: translateY(30px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
            @keyframes shake {
              0%, 100% { transform: translateX(0); }
              25% { transform: translateX(-5px); }
              75% { transform: translateX(5px); }
            }
            .animate-fadeIn {
              animation: fadeIn 0.3s ease-out;
            }
            .animate-slideUp {
              animation: slideUp 0.4s ease-out;
            }
            .animate-shake {
              animation: shake 0.3s ease-in-out;
            }
            .delay-500 {
              animation-delay: 500ms;
            }
            .delay-1000 {
              animation-delay: 1000ms;
            }
          `}</style>
        </div>
      )}

      {showUnauthorized && (
        <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center backdrop-blur-sm" dir="rtl">
          <div className="bg-white rounded-2xl p-8 max-w-sm mx-4 text-center shadow-2xl">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🚫</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">غير مصرح</h3>
            <p className="text-gray-600">
              حسابك غير مصرح للوصول إلى هذا القسم
            </p>
          </div>
        </div>
      )}
    </>
  );
}
