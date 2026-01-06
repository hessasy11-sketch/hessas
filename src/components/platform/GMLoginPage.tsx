import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Smartphone, Lock, Crown, AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { adminSessionManager } from '../../utils/adminSessionManager';

export default function GMLoginPage() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Normalize phone number
      const normalizedPhone = phone.replace(/\s+/g, '');

      // Validate input
      if (!normalizedPhone || !password) {
        setError('الرجاء إدخال رقم الجوال وكلمة المرور');
        setLoading(false);
        return;
      }

      // Call GM login Edge Function
      const { data, error: functionError } = await supabase.functions.invoke('gm-login', {
        body: {
          phone: normalizedPhone,
          password: password,
        },
      });

      if (functionError) {
        console.error('Edge Function Error:', functionError);
        setError('حدث خطأ في الاتصال بالخادم');
        setLoading(false);
        return;
      }

      if (!data.success) {
        setError(data.message || 'فشل تسجيل الدخول');
        setLoading(false);
        return;
      }

      // Create admin session
      const sessionData = {
        staffId: data.data.staffId,
        staffName: data.data.fullName,
        role: data.data.role,
        scopeType: data.data.scopeType,
        staffCode: data.data.staffCode,
        loginMethod: 'password',
        landingRoute: data.data.landingRoute,
      };

      // Use adminSessionManager to create persistent session
      adminSessionManager.createSession(sessionData);

      // Save to localStorage for persistence
      localStorage.setItem('admin_session', JSON.stringify(sessionData));
      localStorage.setItem('current_staff_id', data.data.staffId);
      sessionStorage.setItem('current_staff_id', data.data.staffId);

      // Navigate to HQ dashboard
      navigate('/hq');
    } catch (err: any) {
      console.error('Login error:', err);
      setError('حدث خطأ غير متوقع. الرجاء المحاولة مرة أخرى');
      setLoading(false);
    }
  };

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');

    // Format as 05XX XXX XXX
    if (digits.length <= 3) {
      return digits;
    } else if (digits.length <= 6) {
      return `${digits.slice(0, 3)} ${digits.slice(3)}`;
    } else {
      return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 10)}`;
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhone(formatted);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNnoiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLW9wYWNpdHk9Ii4wNSIgc3Ryb2tlLXdpZHRoPSIyIi8+PC9nPjwvc3ZnPg==')] opacity-30"></div>

      <div className="relative w-full max-w-md">
        <div className="absolute -top-20 left-1/2 transform -translate-x-1/2">
          <div className="w-32 h-32 bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 rounded-3xl shadow-2xl flex items-center justify-center transform rotate-12 hover:rotate-0 transition-transform duration-500">
            <Crown className="w-16 h-16 text-white" />
          </div>
        </div>

        <div className="mt-20 bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
          <div className="p-8 bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 border-b border-white/10">
            <h1 className="text-3xl font-bold text-white text-center mb-2">
              دخول المدير العام
            </h1>
            <p className="text-yellow-200 text-center text-sm">
              لوحة التحكم العليا للمنصة
            </p>
          </div>

          <form onSubmit={handleLogin} className="p-8 space-y-6">
            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-200 text-sm">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-white text-sm font-medium mb-2">
                رقم الجوال
              </label>
              <div className="relative">
                <Smartphone className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={handlePhoneChange}
                  placeholder="05XX XXX XXX"
                  maxLength={12}
                  className="w-full pr-12 pl-4 py-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all"
                  required
                  disabled={loading}
                  dir="ltr"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-white text-sm font-medium mb-2">
                كلمة المرور
              </label>
              <div className="relative">
                <Lock className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pr-12 pl-12 py-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl hover:from-yellow-600 hover:to-yellow-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>جاري تسجيل الدخول...</span>
                </>
              ) : (
                <>
                  <Crown className="w-5 h-5" />
                  <span>دخول</span>
                </>
              )}
            </button>

            <div className="pt-6 border-t border-white/10">
              <button
                type="button"
                onClick={() => navigate('/admin')}
                className="w-full text-gray-300 hover:text-white text-sm transition-colors"
              >
                ← العودة إلى بوابة التاج
              </button>
            </div>
          </form>
        </div>

        <div className="mt-6 text-center">
          <p className="text-gray-400 text-xs">
            للدخول الأول استخدم كلمة المرور: GM@2026
          </p>
        </div>
      </div>
    </div>
  );
}
