import { useState, useEffect } from 'react';
import { X, UserPlus, Loader2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface AddMemberModalProps {
  teamId: string;
  teamName: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface StaffMember {
  id: string;
  full_name: string;
  staff_code: string;
}

export default function AddMemberModal({ teamId, teamName, onClose, onSuccess }: AddMemberModalProps) {
  const [staffId, setStaffId] = useState('');
  const [roleInTeam, setRoleInTeam] = useState('member');
  const [availableStaff, setAvailableStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingStaff, setLoadingStaff] = useState(true);

  useEffect(() => {
    loadAvailableStaff();
  }, []);

  const loadAvailableStaff = async () => {
    try {
      const { data: existingMembers } = await supabase
        .from('fc_team_members')
        .select('staff_id')
        .eq('team_id', teamId);

      const existingIds = existingMembers?.map(m => m.staff_id) || [];

      const { data, error } = await supabase
        .from('platform_staff')
        .select('id, full_name, staff_code')
        .eq('is_active', true)
        .not('id', 'in', `(${existingIds.join(',') || 'null'})`)
        .order('full_name');

      if (error) throw error;
      setAvailableStaff(data || []);
    } catch (error) {
      console.error('Error loading staff:', error);
    } finally {
      setLoadingStaff(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!staffId) return;

    try {
      setLoading(true);

      const { data, error } = await supabase.rpc('add_team_member', {
        p_team_id: teamId,
        p_staff_id: staffId,
        p_role_in_team: roleInTeam
      });

      if (error) throw error;

      if (data?.success) {
        onSuccess();
        onClose();
      } else {
        alert(data?.message || 'حدث خطأ');
      }
    } catch (error) {
      console.error('Error adding member:', error);
      alert('حدث خطأ أثناء إضافة العضو');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">إضافة عضو</h2>
              <p className="text-sm text-gray-500">{teamName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              اختر الموظف
            </label>
            {loadingStaff ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : availableStaff.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>لا يوجد موظفين متاحين للإضافة</p>
              </div>
            ) : (
              <select
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              >
                <option value="">اختر موظف</option>
                {availableStaff.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.full_name} ({staff.staff_code})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              الدور في الفريق
            </label>
            <select
              value={roleInTeam}
              onChange={(e) => setRoleInTeam(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="member">عضو</option>
              <option value="leader">قائد</option>
              <option value="assistant">مساعد</option>
              <option value="technician">فني</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading || !staffId || availableStaff.length === 0}
              className="flex-1 bg-green-600 text-white px-6 py-2.5 rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  جاري الإضافة...
                </>
              ) : (
                'إضافة العضو'
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-6 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
