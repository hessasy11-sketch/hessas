import { useState } from 'react';
import { X, TreePine } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';

interface AddTreeTypeModalProps {
  farmId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const AddTreeTypeModal = ({ farmId, onClose, onSuccess }: AddTreeTypeModalProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    tree_type: 'olive',
    tree_type_ar: 'زيتون',
    count: 0,
    section: '',
    planting_year: new Date().getFullYear(),
    health_status: 'good',
    notes: ''
  });

  const treeTypes = [
    { value: 'olive', label: 'زيتون', en: 'Olive' },
    { value: 'palm', label: 'نخيل', en: 'Palm' },
    { value: 'date', label: 'تمر', en: 'Date Palm' },
    { value: 'citrus', label: 'حمضيات', en: 'Citrus' },
    { value: 'fig', label: 'تين', en: 'Fig' },
    { value: 'pomegranate', label: 'رمان', en: 'Pomegranate' },
    { value: 'apple', label: 'تفاح', en: 'Apple' },
    { value: 'other', label: 'أخرى', en: 'Other' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.count <= 0) {
      alert('يرجى إدخال عدد الأشجار');
      return;
    }

    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('farm_tree_inventory')
        .insert([{
          farm_id: farmId,
          tree_type: formData.tree_type,
          tree_type_ar: formData.tree_type_ar,
          count: formData.count,
          section: formData.section || null,
          planting_year: formData.planting_year,
          health_status: formData.health_status,
          notes: formData.notes || null,
          created_by: user?.id
        }]);

      if (error) throw error;

      alert('تم إضافة نوع الشجر بنجاح!');
      onSuccess();
    } catch (err: any) {
      console.error('Error adding tree type:', err);
      alert('فشل إضافة نوع الشجر: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTreeTypeChange = (value: string) => {
    const selected = treeTypes.find(t => t.value === value);
    setFormData({
      ...formData,
      tree_type: value,
      tree_type_ar: selected?.label || value
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <TreePine className="w-5 h-5 text-green-600" />
            إضافة نوع شجر
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              نوع الشجر *
            </label>
            <select
              value={formData.tree_type}
              onChange={(e) => handleTreeTypeChange(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              {treeTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label} ({type.en})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                العدد *
              </label>
              <input
                type="number"
                min="1"
                value={formData.count}
                onChange={(e) => setFormData({ ...formData, count: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                سنة الزراعة
              </label>
              <input
                type="number"
                min="1900"
                max={new Date().getFullYear()}
                value={formData.planting_year}
                onChange={(e) => setFormData({ ...formData, planting_year: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                القسم/البلوك (اختياري)
              </label>
              <input
                type="text"
                value={formData.section}
                onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="مثال: القسم A"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                الحالة الصحية *
              </label>
              <select
                value={formData.health_status}
                onChange={(e) => setFormData({ ...formData, health_status: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="excellent">ممتاز</option>
                <option value="good">جيد</option>
                <option value="fair">مقبول</option>
                <option value="poor">ضعيف</option>
                <option value="diseased">مريض</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ملاحظات (اختياري)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="أي ملاحظات إضافية..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold disabled:opacity-50"
            >
              {loading ? 'جاري الإضافة...' : 'إضافة'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTreeTypeModal;
