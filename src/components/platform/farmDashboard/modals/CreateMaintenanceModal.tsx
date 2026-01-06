import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';

interface CreateMaintenanceModalProps {
  farmId: string;
  assets: Array<{ id: string; name: string }>;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateMaintenanceModal = ({ farmId, assets, onClose, onSuccess }: CreateMaintenanceModalProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    asset_id: '',
    requires_proof: false,
    proof_url: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.description) {
      alert('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      const { data: staff } = await supabase
        .from('platform_staff')
        .select('full_name')
        .or(`user_id.eq.${user?.id},id.eq.${user?.id}`)
        .single();

      const { error } = await supabase
        .from('farm_maintenance')
        .insert([{
          farm_id: farmId,
          asset_id: formData.asset_id || null,
          title: formData.title,
          description: formData.description,
          priority: formData.priority,
          status: 'new',
          requires_proof: formData.requires_proof,
          proof_url: formData.proof_url || null,
          created_by: user?.id,
          created_by_name: staff?.full_name || 'غير محدد'
        }]);

      if (error) throw error;

      alert('تم إنشاء بلاغ الصيانة بنجاح!');
      onSuccess();
    } catch (err: any) {
      console.error('Error creating maintenance:', err);
      alert('فشل إنشاء البلاغ: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            بلاغ صيانة جديد
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              العنوان *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="مثال: عطل في نظام الري"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              الوصف *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="وصف تفصيلي للعطل أو المشكلة..."
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                الأولوية *
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="low">منخفض</option>
                <option value="medium">متوسط</option>
                <option value="high">عالي</option>
                <option value="urgent">عاجل</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                المعدة المتأثرة (اختياري)
              </label>
              <select
                value={formData.asset_id}
                onChange={(e) => setFormData({ ...formData, asset_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="">لا توجد</option>
                {assets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="requires_proof"
              checked={formData.requires_proof}
              onChange={(e) => setFormData({ ...formData, requires_proof: e.target.checked })}
              className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
            />
            <label htmlFor="requires_proof" className="text-sm text-gray-700">
              يتطلب إثبات (صورة/مستند)
            </label>
          </div>

          {formData.requires_proof && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                رابط الإثبات (مؤقت)
              </label>
              <input
                type="url"
                value={formData.proof_url}
                onChange={(e) => setFormData({ ...formData, proof_url: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="https://..."
              />
              <p className="text-xs text-gray-500 mt-1">
                مؤقتاً: أدخل رابط صورة أو مستند
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-semibold disabled:opacity-50"
            >
              {loading ? 'جاري الإنشاء...' : 'إنشاء البلاغ'}
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

export default CreateMaintenanceModal;
