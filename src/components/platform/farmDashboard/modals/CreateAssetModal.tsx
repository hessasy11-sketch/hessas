import { useState } from 'react';
import { X, Truck } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';

interface CreateAssetModalProps {
  farmId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateAssetModal = ({ farmId, onClose, onSuccess }: CreateAssetModalProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    asset_type: 'tractor',
    status: 'active',
    ownership: 'owned',
    notes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      alert('يرجى إدخال اسم المعدة');
      return;
    }

    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('farm_assets')
        .insert([{
          farm_id: farmId,
          name: formData.name,
          type: formData.asset_type,
          status: formData.status,
          ownership: formData.ownership,
          notes: formData.notes || null,
          created_by: user?.id
        }]);

      if (error) throw error;

      alert('تم إضافة المعدة بنجاح!');
      onSuccess();
    } catch (err: any) {
      console.error('Error creating asset:', err);
      alert('فشل إضافة المعدة: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Truck className="w-5 h-5 text-green-600" />
            إضافة معدة جديدة
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              اسم المعدة *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="مثال: جرار جون ديير 2024"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                النوع *
              </label>
              <select
                value={formData.asset_type}
                onChange={(e) => setFormData({ ...formData, asset_type: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="tractor">جرار</option>
                <option value="irrigation_system">نظام ري</option>
                <option value="vehicle">مركبة</option>
                <option value="pump">مضخة</option>
                <option value="generator">مولد</option>
                <option value="tools">أدوات</option>
                <option value="other">أخرى</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                الملكية *
              </label>
              <select
                value={formData.ownership}
                onChange={(e) => setFormData({ ...formData, ownership: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="owned">مملوك</option>
                <option value="rented">مؤجر</option>
                <option value="leased">إيجار طويل</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              الحالة *
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="active">نشط</option>
              <option value="under_maintenance">تحت الصيانة</option>
              <option value="broken">معطل</option>
              <option value="retired">متوقف</option>
            </select>
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
              {loading ? 'جاري الإضافة...' : 'إضافة المعدة'}
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

export default CreateAssetModal;
