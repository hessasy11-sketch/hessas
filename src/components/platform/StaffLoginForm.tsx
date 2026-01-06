import { useState } from 'react';
import { Phone, Key, Eye, EyeOff, Crown, Shield } from 'lucide-react';
import { useStaffManagement } from '../../hooks/useStaffManagement';

interface StaffLoginFormProps {
  onLoginSuccess: (staffId: string, staffName: string, role: string) => void;
}

export default function StaffLoginForm({ onLoginSuccess }: StaffLoginFormProps) {
  const { verifyLogin } = useStaffManagement('');

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!phone || !password) {
      setError('يرجى إدخال رقم الجوال وكلمة المرور');
      return;
    }

    setLoading(true);

    try {
      const result = await verifyLogin(phone, password);

      if (result.success && result.staff_id && result.name_ar && result.role) {
        localStorage.setItem('staff_session', JSON.stringify({
          staffId: result.staff_id,
          staffName: result.name_ar,
          role: result.role,
          department: result.department,
          loginAt: new Date().toISOString(),
        }));

        onLoginSuccess(result.staff_id, result.name_ar, result.role);
      } else {
        setError(result.error || 'فشل تسجيل الدخول');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('حدث خطأ في تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white rounded-t-2xl p-8 text-center">
          <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-4 border-2 border-white/20">
            <Crown className="w-10 h-10 text-yellow-300" />
          </div>
          <h1 className="text-3xl font-bold mb-2">بوابة الدخول الذكية</h1>
          <p className="text-purple-100">Crown Smart Gateway</p>
        </div>

        <div className="bg-white rounded-b-2xl shadow-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                <p className="text-sm text-red-800 font-medium">{error}</p>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-blue-900 mb-1">نظام أمان متقدم</h3>
                  <p className="text-sm text-blue-700">
                    تسجيل الدخول للموظفين فقط. الحسابات تُنشأ من المدير العام.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  <span>رقم الجوال</span>
                </div>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="05xxxxxxxx"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  <span>كلمة المرور</span>
                </div>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all pl-12"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-lg transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5 text-gray-600" />
                  ) : (
                    <Eye className="w-5 h-5 text-gray-600" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold text-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-3">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>جاري التحقق...</span>
                </span>
              ) : (
                'دخول'
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-center text-gray-600">
              لا تملك حساباً؟ تواصل مع المدير العام
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
