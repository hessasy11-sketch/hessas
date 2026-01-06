import { useState } from 'react';
import { X, Wheat } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';

interface AddCropModalProps {
  farmId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const AddCropModal = ({ farmId, onClose, onSuccess }: AddCropModalProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    season_year: new Date().getFullYear(),
    season_name: '',
    crop_type: 'wheat',
    crop_type_ar: 'قمح',
    status: 'planned',
    estimated_quantity: 0,
    unit: 'kg',
    notes: ''
  });

  const cropTypes = [
    { value: 'wheat', label: 'قمح', en: 'Wheat' },
    { value: 'barley', label: 'شعير', en: 'Barley' },
    { value: 'corn', label: 'ذرة', en: 'Corn' },
    { value: 'vegetables', label: 'خضروات', en: 'Vegetables' },
    { value: 'alfalfa', label: 'برسيم', en: 'Alfalfa' },
    { value: 'fruits', label: 'فواكه موسمية', en: 'Seasonal Fruits' },
    { value: 'other', label: 'أخرى', en: 'Other' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('farm_crops')
        .insert([{
          farm_id: farmId,
          season_year: formData.season_year,
          season_name: formData.season_name || null,
          crop_type: formData.crop_type,
          crop_type_ar: formData.crop_type_ar,
          status: formData.status,
          estimated_quantity: formData.estimated_quantity > 0 ? formData.estimated_quantity : null,
          unit: formData.unit,
          notes: formData.notes || null,
          created_by: user?.id
        }]);

      if (error) throw error;

      alert('تم إضافة المحصول بنجاح!');
      onSuccess();
    } catch (err: any) {
      console.error('Error adding crop:', err);
      alert('فشل إضافة المحصول: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCropTypeChange = (value: string) => {
    const selected = cropTypes.find(c => c.value === value);
    setFormData({
      ...formData,
      crop_type: value,
      crop_type_ar: selected?.label || value
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Wheat className="w-5 h-5 text-yellow-600" />
            إضافة محصول موسمي
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                السنة *
              </label>
              <input
                type="number"
                min="2020"
                max={new Date().getFullYear() + 2}
                value={formData.season_year}
                onChange={(e) => setFormData({ ...formData, season_year: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                الحالة *
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              >
                <option value="planned">مخطط</option>
                <option value="in_progress">قيد التنفيذ</option>
                <option value="harvested">تم الحصاد</option>
                <option value="sold">تم البيع</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              اسم الموسم (اختياري)
            </label>
            <input
              type="text"
              value={formData.season_name}
              onChange={(e) => setFormData({ ...formData, season_name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              placeholder="مثال: موسم ربيع 2026"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              نوع المحصول *
            </label>
            <select
              value={formData.crop_type}
              onChange={(e) => handleCropTypeChange(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            >
              {cropTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label} ({type.en})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                الكمية المتوقعة (اختياري)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.estimated_quantity}
                onChange={(e) => setFormData({ ...formData, estimated_quantity: parseFloat(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                الوحدة *
              </label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              >
                <option value="kg">كيلوجرام</option>
                <option value="ton">طن</option>
                <option value="box">صندوق</option>
                <option value="bag">كيس</option>
                <option value="unit">وحدة</option>
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              placeholder="أي ملاحظات إضافية..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-semibold disabled:opacity-50"
            >
              {loading ? 'جاري الإضافة...' : 'إضافة المحصول'}
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

export default AddCropModal;
