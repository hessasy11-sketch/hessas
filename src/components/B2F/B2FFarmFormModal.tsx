import { useState, useEffect } from 'react';
import { X, Save, MapPin, TreePine, FileText } from 'lucide-react';
import { B2FFarm } from '../../hooks/useB2FFarms';

interface B2FFarmFormModalProps {
  farm?: B2FFarm | null;
  onClose: () => void;
  onSave: (farmData: any) => Promise<{ success: boolean; error?: string }>;
}

export default function B2FFarmFormModal({ farm, onClose, onSave }: B2FFarmFormModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '',
    city: '',
    total_trees_available: 0,
    is_active: true,
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (farm) {
      setFormData({
        name: farm.name,
        description: farm.description || '',
        location: farm.location,
        city: farm.city || '',
        total_trees_available: farm.total_trees_available,
        is_active: farm.is_active,
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
      setError('الموقع مطلوب');
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <MapPin className="w-4 h-4 inline-block ml-2" />
              اسم المزرعة
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
              placeholder="مثال: مزرعة الرياض النموذجية"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <FileText className="w-4 h-4 inline-block ml-2" />
              وصف المزرعة
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all resize-none"
              rows={3}
              placeholder="وصف مختصر عن المزرعة ومميزاتها"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <MapPin className="w-4 h-4 inline-block ml-2" />
                الموقع/المنطقة
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                placeholder="مثال: شمال الرياض"
                required
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
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                placeholder="مثال: الرياض"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <TreePine className="w-4 h-4 inline-block ml-2" />
              إجمالي عدد الأشجار
            </label>
            <input
              type="number"
              value={formData.total_trees_available}
              onChange={(e) => setFormData({ ...formData, total_trees_available: parseInt(e.target.value) || 0 })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
              placeholder="1000"
              min="1"
              required
            />
          </div>

          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-5 h-5 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-gray-700 cursor-pointer">
              مزرعة نشطة ومتاحة للعروض
            </label>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-6 py-3 rounded-xl font-bold hover:from-emerald-700 hover:to-emerald-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Save className="w-5 h-5" />
              {saving ? 'جاري الحفظ...' : 'حفظ'}
            </button>

            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
