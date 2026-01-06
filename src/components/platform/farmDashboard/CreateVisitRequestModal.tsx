import { useState } from 'react';
import { X, Calendar, User, Phone, FileText } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface CreateVisitRequestModalProps {
  farmId: string;
  farmName: string;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateVisitRequestModal = ({ farmId, farmName, onClose, onSuccess }: CreateVisitRequestModalProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    requester_name: '',
    requester_phone: '',
    requester_type: 'investor',
    visit_purpose: '',
    preferred_date: '',
    preferred_time: '',
    visitor_count: 1,
    notes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.requester_name || !formData.requester_phone || !formData.visit_purpose || !formData.preferred_date) {
      alert('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('farm_visit_requests')
        .insert([{
          farm_id: farmId,
          requester_id: user?.id,
          requester_name: formData.requester_name,
          requester_phone: formData.requester_phone,
          requester_type: formData.requester_type,
          visit_purpose: formData.visit_purpose,
          preferred_date: formData.preferred_date,
          preferred_time: formData.preferred_time || null,
          visitor_count: formData.visitor_count,
          notes: formData.notes || null,
          status: 'pending'
        }]);

      if (error) throw error;

      alert('تم إرسال طلب الزيارة بنجاح! سيتم التواصل معك قريباً.');
      onSuccess();
    } catch (err: any) {
      console.error('Error creating visit request:', err);
      alert('فشل إنشاء طلب الزيارة: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">طلب زيارة المزرعة</h2>
            <p className="text-sm text-gray-600 mt-1">{farmName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Requester Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <User className="w-4 h-4 inline-block ml-1" />
              الاسم *
            </label>
            <input
              type="text"
              value={formData.requester_name}
              onChange={(e) => setFormData({ ...formData, requester_name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
            />
          </div>

          {/* Requester Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Phone className="w-4 h-4 inline-block ml-1" />
              رقم الجوال *
            </label>
            <input
              type="tel"
              value={formData.requester_phone}
              onChange={(e) => setFormData({ ...formData, requester_phone: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="05xxxxxxxx"
              required
            />
          </div>

          {/* Requester Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              نوع الزائر *
            </label>
            <select
              value={formData.requester_type}
              onChange={(e) => setFormData({ ...formData, requester_type: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="investor">مستثمر</option>
              <option value="manager">مدير</option>
              <option value="technician">فني</option>
              <option value="auditor">مدقق</option>
              <option value="guest">ضيف</option>
            </select>
          </div>

          {/* Visit Purpose */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <FileText className="w-4 h-4 inline-block ml-1" />
              الغرض من الزيارة *
            </label>
            <textarea
              value={formData.visit_purpose}
              onChange={(e) => setFormData({ ...formData, visit_purpose: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="مثال: الاطلاع على سير العمل، فحص الأشجار، إلخ..."
              required
            />
          </div>

          {/* Preferred Date and Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="w-4 h-4 inline-block ml-1" />
                التاريخ المفضل *
              </label>
              <input
                type="date"
                value={formData.preferred_date}
                onChange={(e) => setFormData({ ...formData, preferred_date: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                الوقت المفضل
              </label>
              <input
                type="time"
                value={formData.preferred_time}
                onChange={(e) => setFormData({ ...formData, preferred_time: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Visitor Count */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              عدد الزوار
            </label>
            <input
              type="number"
              min="1"
              max="20"
              value={formData.visitor_count}
              onChange={(e) => setFormData({ ...formData, visitor_count: parseInt(e.target.value) })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ملاحظات إضافية
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="أي ملاحظات أخرى..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'جاري الإرسال...' : 'إرسال الطلب'}
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

export default CreateVisitRequestModal;
