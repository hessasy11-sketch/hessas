import { useState } from 'react';
import { X, User, Phone, UserCog, Building2, Eye, EyeOff, Copy, Check } from 'lucide-react';

interface CreateStaffModalProps {
  onClose: () => void;
  onCreate: (data: {
    name_ar: string;
    phone: string;
    role: string;
    department?: string;
  }) => Promise<{
    success: boolean;
    initial_password?: string;
    phone?: string;
    error?: string;
  }>;
}

export default function CreateStaffModal({ onClose, onCreate }: CreateStaffModalProps) {
  const [formData, setFormData] = useState({
    name_ar: '',
    phone: '',
    role: '',
    department: '',
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    initial_password?: string;
    phone?: string;
    error?: string;
  } | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name_ar || !formData.phone || !formData.role) {
      return;
    }

    setLoading(true);

    try {
      const response = await onCreate(formData);
      setResult(response);

      if (response.success) {
        setFormData({
          name_ar: '',
          phone: '',
          role: '',
          department: '',
        });
      }
    } catch (err) {
      console.error('Error creating staff:', err);
      setResult({
        success: false,
        error: err instanceof Error ? err.message : 'حدث خطأ',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPassword = () => {
    if (result?.initial_password) {
      navigator.clipboard.writeText(result.initial_password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyCredentials = () => {
    if (result?.phone && result?.initial_password) {
      const text = `رقم الجوال: ${result.phone}\nكلمة المرور: ${result.initial_password}`;
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDone = () => {
    setResult(null);
    onClose();
  };

  if (result?.success && result.initial_password) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white p-6 rounded-t-2xl">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Check className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">تم إنشاء الحساب بنجاح!</h2>
                <p className="text-green-100">بيانات الدخول جاهزة</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4">
              <p className="text-sm text-yellow-800 font-medium mb-3">
                ⚠️ تحذير: هذه البيانات ستُعرض مرة واحدة فقط
              </p>
              <p className="text-xs text-yellow-700">
                احفظ أو انسخ البيانات الآن. لن تستطيع رؤيتها مرة أخرى.
              </p>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  رقم الجوال
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={result.phone}
                    readOnly
                    className="flex-1 px-4 py-2 bg-white border border-gray-300 rounded-lg font-mono text-lg"
                  />
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  كلمة المرور المؤقتة
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={result.initial_password}
                    readOnly
                    className="flex-1 px-4 py-2 bg-white border border-gray-300 rounded-lg font-mono text-lg"
                  />
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5 text-gray-600" />
                    ) : (
                      <Eye className="w-5 h-5 text-gray-600" />
                    )}
                  </button>
                  <button
                    onClick={handleCopyPassword}
                    className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    {copied ? (
                      <Check className="w-5 h-5 text-green-600" />
                    ) : (
                      <Copy className="w-5 h-5 text-gray-600" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={handleCopyCredentials}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <Copy className="w-5 h-5" />
              <span>نسخ جميع البيانات</span>
            </button>

            <button
              onClick={handleDone}
              className="w-full px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:shadow-lg transition-all"
            >
              تم
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">إنشاء موظف جديد</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {result?.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">{result.error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>الاسم الكامل</span>
                <span className="text-red-500">*</span>
              </div>
            </label>
            <input
              type="text"
              value={formData.name_ar}
              onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="أحمد محمد"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                <span>رقم الجوال</span>
                <span className="text-red-500">*</span>
              </div>
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="05xxxxxxxx"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                <UserCog className="w-4 h-4" />
                <span>الدور</span>
                <span className="text-red-500">*</span>
              </div>
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">اختر الدور</option>
              <option value="finance_manager">مدير مالي</option>
              <option value="operations_manager">مدير عمليات</option>
              <option value="farm_manager">مدير مزرعة</option>
              <option value="supervisor">مشرف</option>
              <option value="employee">موظف</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                <span>القسم</span>
              </div>
            </label>
            <select
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">اختر القسم (اختياري)</option>
              <option value="B2F">B2F - المزارع</option>
              <option value="B2B">B2B - المزادات</option>
              <option value="Finance">المالية</option>
              <option value="Marketing">التسويق</option>
              <option value="Operations">العمليات</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>جاري الإنشاء...</span>
                </span>
              ) : (
                'إنشاء الحساب'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
