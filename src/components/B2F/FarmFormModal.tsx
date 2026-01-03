import { useState, useEffect } from 'react';
import { X, Save, MapPin, TreePine, Ruler, FileText, Image as ImageIcon } from 'lucide-react';
import { Farm } from '../../hooks/useFarms';

interface FarmFormModalProps {
  farm?: Farm | null;
  onClose: () => void;
  onSave: (farmData: any) => Promise<{ success: boolean; error?: string }>;
}

export default function FarmFormModal({ farm, onClose, onSave }: FarmFormModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    city: '',
    tree_type: 'نخيل' as 'نخيل' | 'زيتون' | 'أخرى',
    custom_tree_type: '',
    total_trees_available: 0,
    area_size: 0,
    area_unit: 'م²',
    internal_description: '',
    marketing_description: '',
    status: 'active' as 'active' | 'under_preparation' | 'inactive',
    images: [] as string[],
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (farm) {
      setFormData({
        name: farm.name,
        location: farm.location,
        city: farm.city || '',
        tree_type: farm.tree_type,
        custom_tree_type: farm.custom_tree_type || '',
        total_trees_available: farm.total_trees_available,
        area_size: farm.area_size,
        area_unit: farm.area_unit,
        internal_description: farm.internal_description || '',
        marketing_description: farm.marketing_description || '',
        status: farm.status,
        images: farm.images || [],
      });
    }
  }, [farm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('اسم المزرعة مطلوب');
      return;
    }

    if (!formData.location.trim()) {
      setError('المنطقة مطلوبة');
      return;
    }

    if (formData.tree_type === 'أخرى' && !formData.custom_tree_type.trim()) {
      setError('يرجى تحديد نوع الأشجار');
      return;
    }

    if (formData.total_trees_available <= 0) {
      setError('عدد الأشجار يجب أن يكون أكبر من صفر');
      return;
    }

    setSaving(true);

    const result = await onSave(formData);

    setSaving(false);

    if (result.success) {
      onClose();
    } else {
      setError(result.error || 'حدث خطأ أثناء الحفظ');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full my-8">
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-4 rounded-t-2xl flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">
            {farm ? 'تعديل المزرعة' : 'إضافة مزرعة جديدة'}
          </h2>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <FileText className="w-4 h-4" />
                اسم المزرعة الداخلي
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="مثال: مزرعة القصيم - نخيل سكري"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                  <MapPin className="w-4 h-4" />
                  المنطقة
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="مثال: القصيم"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  المدينة
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="مثال: بريدة"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <TreePine className="w-4 h-4" />
                نوع الأشجار الأساسية
              </label>
              <select
                value={formData.tree_type}
                onChange={(e) => setFormData({
                  ...formData,
                  tree_type: e.target.value as 'نخيل' | 'زيتون' | 'أخرى',
                  custom_tree_type: e.target.value !== 'أخرى' ? '' : formData.custom_tree_type
                })}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="نخيل">نخيل</option>
                <option value="زيتون">زيتون</option>
                <option value="أخرى">أخرى</option>
              </select>
            </div>

            {formData.tree_type === 'أخرى' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  حدد نوع الأشجار
                </label>
                <input
                  type="text"
                  value={formData.custom_tree_type}
                  onChange={(e) => setFormData({ ...formData, custom_tree_type: e.target.value })}
                  placeholder="مثال: مانجو، عنب، ليمون..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                عدد الأشجار المتاحة للاستثمار
              </label>
              <input
                type="number"
                min="1"
                value={formData.total_trees_available}
                onChange={(e) => setFormData({ ...formData, total_trees_available: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <Ruler className="w-4 h-4" />
                مساحة المزرعة
              </label>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.area_size}
                  onChange={(e) => setFormData({ ...formData, area_size: parseFloat(e.target.value) || 0 })}
                  placeholder="القيمة"
                  className="px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
                <select
                  value={formData.area_unit}
                  onChange={(e) => setFormData({ ...formData, area_unit: e.target.value })}
                  className="px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value="م²">م²</option>
                  <option value="هكتار">هكتار</option>
                  <option value="دونم">دونم</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                وصف داخلي (للموظفين فقط)
              </label>
              <textarea
                rows={3}
                value={formData.internal_description}
                onChange={(e) => setFormData({ ...formData, internal_description: e.target.value })}
                placeholder="ملاحظات عن التربة، نظام الري، جودة الإنتاج..."
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                وصف تسويقي (يظهر للعملاء)
              </label>
              <textarea
                rows={3}
                value={formData.marketing_description}
                onChange={(e) => setFormData({ ...formData, marketing_description: e.target.value })}
                placeholder="موقع استثماري خاص بمنطقة القصيم تحت إشراف فريق المنصة..."
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                حالة المزرعة
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="active">مفعلة للاستثمار</option>
                <option value="under_preparation">تحت التجهيز</option>
                <option value="inactive">موقوفة</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-xl border-2 border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-bold hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              <Save className="w-5 h-5" />
              {saving ? 'جاري الحفظ...' : 'حفظ المزرعة'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
