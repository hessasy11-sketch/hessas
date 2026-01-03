import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { X, Plus } from 'lucide-react';

interface Supervisor {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
}

interface Props {
  farmId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateTaskModal({ farmId, onClose, onSuccess }: Props) {
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [loading, setLoading] = useState(false);

  const [selectedSupervisor, setSelectedSupervisor] = useState('');
  const [type, setType] = useState('irrigation');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');

  useEffect(() => {
    loadSupervisors();
  }, [farmId]);

  const loadSupervisors = async () => {
    try {
      const { data, error } = await supabase
        .from('farm_team_members')
        .select('*')
        .eq('farm_id', farmId)
        .eq('role', 'farm_supervisor')
        .eq('is_active', true);

      if (error) throw error;
      setSupervisors(data || []);
    } catch (error) {
      console.error('Error loading supervisors:', error);
      alert('حدث خطأ في تحميل المشرفين');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedSupervisor || !title || !description) {
      alert('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // الحصول على معلومات المشرف
      const supervisor = supervisors.find(s => s.user_id === selectedSupervisor);
      if (!supervisor) return;

      // الحصول على معلومات المدير
      const { data: managerData } = await supabase
        .from('farm_team_members')
        .select('full_name')
        .eq('user_id', user.id)
        .eq('farm_id', farmId)
        .single();

      // إنشاء المهمة
      const { error } = await supabase
        .from('farm_tasks')
        .insert({
          farm_id: farmId,
          assigned_to_user_id: supervisor.user_id,
          assigned_to_name: supervisor.full_name,
          created_by_user_id: user.id,
          created_by_name: managerData?.full_name || 'مدير المزرعة',
          type,
          title,
          description,
          due_date: dueDate || null,
          status: 'new'
        });

      if (error) throw error;

      alert('تم إنشاء المهمة بنجاح');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating task:', error);
      alert('حدث خطأ في إنشاء المهمة');
    } finally {
      setLoading(false);
    }
  };

  const taskTypes = [
    { value: 'irrigation', label: 'ري', icon: '💧' },
    { value: 'fertilization', label: 'تسميد', icon: '🌱' },
    { value: 'pest_control', label: 'مكافحة آفات', icon: '🐛' },
    { value: 'maintenance', label: 'صيانة', icon: '🔧' },
    { value: 'harvest', label: 'حصاد', icon: '🌾' },
    { value: 'pruning', label: 'تقليم', icon: '✂️' },
    { value: 'general', label: 'عام', icon: '📋' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-800">إنشاء مهمة جديدة</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* اختيار المشرف */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              المشرف المُكلّف *
            </label>
            {supervisors.length === 0 ? (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                لا يوجد مشرفون مُضافون لهذه المزرعة. يرجى إضافة مشرف أولاً.
              </div>
            ) : (
              <select
                value={selectedSupervisor}
                onChange={(e) => setSelectedSupervisor(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              >
                <option value="">اختر المشرف...</option>
                {supervisors.map((supervisor) => (
                  <option key={supervisor.id} value={supervisor.user_id}>
                    {supervisor.full_name} ({supervisor.phone})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* نوع المهمة */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              نوع المهمة *
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {taskTypes.map((taskType) => (
                <button
                  key={taskType.value}
                  type="button"
                  onClick={() => setType(taskType.value)}
                  className={`p-3 border-2 rounded-lg text-center transition-all ${
                    type === taskType.value
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-green-300'
                  }`}
                >
                  <div className="text-2xl mb-1">{taskType.icon}</div>
                  <div className="text-sm font-medium">{taskType.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* عنوان المهمة */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              عنوان المهمة *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: ري المزرعة - القطاع الشرقي"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
            />
          </div>

          {/* وصف المهمة */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              وصف المهمة *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="اشرح تفاصيل المهمة والمطلوب تنفيذه..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
            />
          </div>

          {/* تاريخ التسليم */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              تاريخ التسليم (اختياري)
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* الأزرار */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading || supervisors.length === 0}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors"
            >
              <Plus className="w-5 h-5" />
              {loading ? 'جاري الإنشاء...' : 'إنشاء المهمة'}
            </button>

            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 font-medium transition-colors"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
