import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, UserPlus, Users } from 'lucide-react';

interface ReassignStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  staffId: string | null;
}

interface Manager {
  id: string;
  user_id: string;
  display_name: string;
  department: string;
  job_title?: string;
}

interface StaffInfo {
  display_name: string;
  department: string;
  current_manager_name?: string;
}

export default function ReassignStaffModal({ isOpen, onClose, onSuccess, staffId }: ReassignStaffModalProps) {
  const [loading, setLoading] = useState(false);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [staffInfo, setStaffInfo] = useState<StaffInfo | null>(null);
  const [selectedManagerId, setSelectedManagerId] = useState('');

  useEffect(() => {
    if (isOpen && staffId) {
      loadData();
    }
  }, [isOpen, staffId]);

  const loadData = async () => {
    if (!staffId) return;

    const { data: staff } = await supabase
      .from('platform_staff')
      .select(`
        id,
        user_id,
        department,
        manager_user_id,
        profiles:user_id (
          display_name
        )
      `)
      .eq('id', staffId)
      .maybeSingle();

    if (staff) {
      let currentManagerName = 'لا يوجد';
      if (staff.manager_user_id) {
        const { data: managerData } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', staff.manager_user_id)
          .maybeSingle();
        if (managerData) {
          currentManagerName = managerData.display_name;
        }
      }

      setStaffInfo({
        display_name: (staff.profiles as any)?.display_name || 'غير محدد',
        department: staff.department,
        current_manager_name: currentManagerName
      });

      loadManagers(staff.department, staff.user_id);
    }
  };

  const loadManagers = async (department: string, excludeUserId: string) => {
    const { data } = await supabase
      .from('platform_staff')
      .select(`
        id,
        user_id,
        department,
        job_title,
        profiles:user_id (
          display_name
        )
      `)
      .eq('department', department)
      .eq('is_active', true)
      .in('role', ['manager', 'supervisor'])
      .neq('user_id', excludeUserId);

    if (data) {
      setManagers(data.map((m: any) => ({
        id: m.id,
        user_id: m.user_id,
        display_name: m.profiles?.display_name || 'غير محدد',
        department: m.department,
        job_title: m.job_title
      })));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffId) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('platform_staff')
        .update({
          manager_user_id: selectedManagerId || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', staffId);

      if (error) throw error;

      await supabase.rpc('log_platform_action', {
        p_action_type: 'change_manager',
        p_target_type: 'staff',
        p_target_id: staffId,
        p_changes: {
          new_manager_id: selectedManagerId || null
        }
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error reassigning staff:', error);
      alert('حدث خطأ أثناء إعادة التعيين');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !staffId || !staffInfo) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <UserPlus className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold">إعادة تعيين موظف</h2>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="bg-slate-50 rounded-xl p-4">
            <h3 className="font-bold text-gray-900 mb-3">معلومات الموظف</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">الاسم:</span>
                <span className="font-semibold text-gray-900">{staffInfo.display_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">القسم:</span>
                <span className="font-semibold text-gray-900">{staffInfo.department}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">المدير الحالي:</span>
                <span className="font-semibold text-gray-900">{staffInfo.current_manager_name}</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <Users className="w-4 h-4" />
              المدير الجديد
            </label>
            <select
              value={selectedManagerId}
              onChange={(e) => setSelectedManagerId(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              required
            >
              <option value="">اختر المدير الجديد</option>
              {managers.map(manager => (
                <option key={manager.id} value={manager.user_id}>
                  {manager.display_name} - {manager.job_title || 'مدير'}
                </option>
              ))}
            </select>
            {managers.length === 0 && (
              <p className="text-xs text-amber-600 mt-2">
                لا يوجد مدراء متاحين في قسم {staffInfo.department}
              </p>
            )}
          </div>

          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-900">
              سيتم نقل هذا الموظف للمدير الجديد ويصبح تابعاً له مباشرة
            </p>
          </div>

          <div className="flex gap-3 pt-4 border-t-2 border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-all"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading || !selectedManagerId}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'جاري التعيين...' : 'تعيين المدير'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
