import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Leaf, Lock, Phone, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface LoginResponse {
  staff_id: string;
  full_name: string;
  role: 'farms_manager' | 'farm_manager' | 'super_admin';
  farm_id?: string;
  farm_name?: string;
}

export default function SimplifiedLogin() {
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
      // تنظيف الجلسات القديمة
      localStorage.removeItem('simplified_session');
      localStorage.removeItem('staff_session');

      // استدعاء دالة تسجيل الدخول
      const { data, error: loginError } = await supabase
        .rpc('simplified_login', {
          p_phone: phone,
          p_password: password
        });

      if (loginError) throw loginError;
      if (!data) throw new Error('بيانات تسجيل الدخول غير صحيحة');

      const loginData = data as LoginResponse;

      // حفظ الجلسة
      const session = {
        staffId: loginData.staff_id,
        staffName: loginData.full_name,
        role: loginData.role,
        farmId: loginData.farm_id,
        farmName: loginData.farm_name,
        loginAt: new Date().toISOString(),
      };

      localStorage.setItem('staff_session', JSON.stringify(session));

      // التوجيه بناءً على الدور
      if (loginData.role === 'farms_manager') {
        navigate('/admin/farms-manager-dashboard');
      } else if (loginData.role === 'farm_manager') {
        navigate('/admin/farm-manager-dashboard');
      } else if (loginData.role === 'super_admin') {
        navigate('/admin/b2b-operations');
      }

    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'حدث خطأ في تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-green-600 to-emerald-700 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Leaf className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">نظام إدارة المزارع</h1>
          <p className="text-gray-600 text-lg">تسجيل الدخول</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
          {error && (
            <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            {/* Phone Input */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                رقم الجوال
              </label>
              <div className="relative">
                <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="05xxxxxxxx"
                  className="w-full pr-12 pl-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all outline-none text-lg"
                  required
                  dir="ltr"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                كلمة المرور
              </label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pr-12 pl-12 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all outline-none text-lg"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-700 text-white rounded-xl font-bold text-lg hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>جاري تسجيل الدخول...</span>
                </div>
              ) : (
                'تسجيل الدخول'
              )}
            </button>
          </form>

          {/* Info */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="bg-blue-50 rounded-xl p-4">
              <p className="text-sm text-blue-800 text-center">
                <strong>ملاحظة:</strong> يتم إنشاء الحسابات من قبل مدير النظام فقط
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-gray-500 text-sm">
            نظام إدارة المزارع والاستثمار الزراعي
          </p>
        </div>
      </div>
    </div>
  );
}
