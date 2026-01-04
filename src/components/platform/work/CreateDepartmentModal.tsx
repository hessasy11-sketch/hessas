import { useState, useEffect } from 'react';
import { X, Building2, Check, Hash } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateDepartmentModal({ onClose, onSuccess }: Props) {
  const [formData, setFormData] = useState({
    name_ar: '',
    name_en: '',
    code: '',
    description: '',
    linked_system: 'none',
    system_access_level: 'read',
    color: '#3b82f6'
  });
  const [loading, setLoading] = useState(false);
  const [suggestedCode, setSuggestedCode] = useState<string>('');

  useEffect(() => {
    fetchNextCode();
  }, []);

  const fetchNextCode = async () => {
    try {
      const { data, error } = await supabase.rpc('get_next_available_department_code');
      if (!error && data) {
        setSuggestedCode(data);
        setFormData(prev => ({ ...prev, code: data }));
      }
    } catch (err) {
      console.error('Error fetching next code:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: staffData } = await supabase
        .from('platform_staff')
        .select('id')
        .eq('role', 'super_admin')
        .maybeSingle();

      console.log('Creating department with data:', {
        p_name_ar: formData.name_ar,
        p_name_en: formData.name_en,
        p_code: formData.code.toUpperCase(),
        p_description: formData.description || null,
        p_linked_system: formData.linked_system,
        p_system_access_level: formData.system_access_level,
        p_color: formData.color,
        p_created_by: staffData?.id || null
      });

      const { data: rawData, error } = await supabase.rpc('create_department', {
        p_name_ar: formData.name_ar,
        p_name_en: formData.name_en,
        p_code: formData.code.toUpperCase(),
        p_description: formData.description || null,
        p_linked_system: formData.linked_system,
        p_system_access_level: formData.system_access_level,
        p_color: formData.color,
        p_created_by: staffData?.id || null
      });

      console.log('Department creation result:', { rawData, error });

      if (error) {
        console.error('RPC Error:', error);
        throw error;
      }

      if (!rawData) {
        throw new Error('فشل إنشاء القسم - لا توجد نتيجة');
      }

      const resultData = (rawData as any);

      if (!resultData.success) {
        const errorMsg = resultData.message || 'فشل إنشاء القسم';

        if (errorMsg.includes('الرمز موجود بالفعل')) {
          alert('❌ الرمز المدخل موجود بالفعل!\n\nالرجاء:\n• استخدام الرمز المقترح\n• أو إدخال رمز فريد آخر');
          await fetchNextCode();
        } else {
          alert('❌ خطأ: ' + errorMsg);
        }
        return;
      }

      console.log('Department created successfully:', resultData);
      alert('✅ تم إنشاء القسم بنجاح مع ربط الأنظمة تلقائياً!');

      setTimeout(() => {
        onSuccess();
      }, 500);

    } catch (error: any) {
      console.error('Error creating department:', error);
      alert('❌ خطأ في إنشاء القسم: ' + (error.message || 'خطأ غير معروف'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-gray-900 to-black border border-white/20 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gray-900/95 backdrop-blur-sm border-b border-white/10 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">إنشاء قسم جديد</h2>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white">المعلومات الأساسية</h3>

            <div>
              <label className="block text-sm font-bold text-gray-300 mb-2">
                الاسم بالعربية
              </label>
              <input
                type="text"
                required
                value={formData.name_ar}
                onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                placeholder="مثال: إدارة المبيعات"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-300 mb-2 flex items-center gap-2">
                الاسم بالإنجليزية
                <span className="text-gray-500 text-xs">(اختياري)</span>
              </label>
              <input
                type="text"
                value={formData.name_en}
                onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                placeholder="Example: Sales Department"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-300 mb-2">
                الرمز
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  placeholder="SALES"
                />
                <button
                  type="button"
                  onClick={fetchNextCode}
                  className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors flex items-center gap-2"
                  title="اقتراح رمز جديد"
                >
                  <Hash className="w-4 h-4" />
                </button>
              </div>
              {suggestedCode && (
                <p className="text-xs text-green-400 mt-1">
                  ✓ الرمز المقترح التالي: {suggestedCode}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">رمز فريد للقسم (سيتم تحويله لأحرف كبيرة)</p>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-300 mb-2">
                الوصف
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
                placeholder="وصف مختصر للقسم ومهامه..."
              />
            </div>
          </div>

          {/* System Integration */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white">الربط مع الأنظمة</h3>

            <div>
              <label className="block text-sm font-bold text-gray-300 mb-2">
                النظام المرتبط
              </label>
              <select
                value={formData.linked_system}
                onChange={(e) => setFormData({ ...formData, linked_system: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500"
              >
                <option value="none">لا يوجد - قسم عام</option>
                <option value="b2b">مزادات الشركات (B2B)</option>
                <option value="b2f">استثمار المزارع (B2F)</option>
                <option value="both">كلا النظامين</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-300 mb-2">
                مستوى الوصول
              </label>
              <select
                value={formData.system_access_level}
                onChange={(e) => setFormData({ ...formData, system_access_level: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500"
              >
                <option value="none">بدون وصول</option>
                <option value="read">قراءة فقط</option>
                <option value="write">قراءة وكتابة</option>
                <option value="full">صلاحيات كاملة</option>
              </select>
            </div>
          </div>

          {/* Appearance */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white">المظهر</h3>

            <div>
              <label className="block text-sm font-bold text-gray-300 mb-2">
                اللون
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-16 h-12 rounded-xl cursor-pointer"
                />
                <div className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white">
                  {formData.color}
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-all"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>جاري الإنشاء...</>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  إنشاء القسم
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
