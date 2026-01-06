import { useState } from 'react';
import { X, Leaf, Loader } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminLoginModal({ isOpen, onClose }: AdminLoginModalProps) {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error: loginError } = await supabase.rpc('simplified_login', {
        p_phone: phone,
        p_password: password
      });

      if (loginError) throw loginError;

      if (!data) {
        setError('رقم الجوال أو كلمة المرور غير صحيحة');
        setLoading(false);
        return;
      }

      // حفظ الجلسة
      const sessionData = {
        staffId: data.staff_id,
        staffName: data.full_name,
        role: data.role,
        farmId: data.farm_id,
        farmName: data.farm_name,
        loginAt: new Date().toISOString()
      };

      localStorage.setItem('simplified_session', JSON.stringify(sessionData));

      // توجيه حسب الدور
      if (data.role === 'farms_manager') {
        navigate('/admin/farms-manager-dashboard');
      } else if (data.role === 'farm_manager') {
        navigate('/admin/farm-manager-dashboard');
      } else {
        navigate('/admin/b2f');
      }

      onClose();
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'حدث خطأ أثناء تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
      onClick={handleBackdropClick}
      dir="rtl"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative bg-gradient-to-r from-green-600 to-green-700 rounded-t-2xl p-6 text-white">
          <button
            onClick={onClose}
            className="absolute left-4 top-4 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="flex items-center justify-center gap-3 mb-2">
            <Leaf className="w-8 h-8" />
            <h2 className="text-2xl font-bold">دخول الموظفين</h2>
          </div>
          <p className="text-center text-green-100 text-sm">
            لوحة التحكم الإدارية
          </p>
        </div>

        {/* Body */}
        <form onSubmit={handleLogin} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              رقم الجوال
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="05xxxxxxxx"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
              required
              disabled={loading}
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              كلمة المرور
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-3 rounded-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                <span>جاري تسجيل الدخول...</span>
              </>
            ) : (
              <span>دخول</span>
            )}
          </button>

          <div className="text-center text-xs text-gray-500 mt-4">
            هذه الصفحة مخصصة للموظفين فقط
          </div>
        </form>
      </div>
    </div>
  );
}
