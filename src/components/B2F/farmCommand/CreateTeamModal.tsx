import { useState, useEffect } from 'react';
import { X, Users, Loader2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface CreateTeamModalProps {
  farmId: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface StaffMember {
  id: string;
  full_name: string;
  staff_code: string;
}

export default function CreateTeamModal({ farmId, onClose, onSuccess }: CreateTeamModalProps) {
  const [teamName, setTeamName] = useState('');
  const [teamType, setTeamType] = useState('operations');
  const [leaderId, setLeaderId] = useState('');
  const [availableStaff, setAvailableStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingStaff, setLoadingStaff] = useState(true);

  useEffect(() => {
    loadAvailableStaff();
  }, []);

  const loadAvailableStaff = async () => {
    try {
      const { data, error } = await supabase
        .from('platform_staff')
        .select('id, full_name, staff_code')
        .eq('is_active', true)
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

    if (!teamName.trim()) return;

    try {
      setLoading(true);

      const { data, error } = await supabase.rpc('create_farm_team', {
        p_farm_id: farmId,
        p_team_name: teamName.trim(),
        p_team_type: teamType,
        p_team_leader_id: leaderId || null
      });

      if (error) throw error;

      if (data?.success) {
        onSuccess();
        onClose();
      } else {
        alert(data?.message || 'حدث خطأ');
      }
    } catch (error) {
      console.error('Error creating team:', error);
      alert('حدث خطأ أثناء إنشاء الفريق');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">إنشاء فريق جديد</h2>
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
              اسم الفريق
            </label>
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="مثال: فريق الحصاد"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              نوع الفريق
            </label>
            <select
              value={teamType}
              onChange={(e) => setTeamType(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="operations">تشغيلي</option>
              <option value="maintenance">صيانة</option>
              <option value="harvest">حصاد</option>
              <option value="irrigation">ري</option>
              <option value="supervision">إشراف</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              قائد الفريق (اختياري)
            </label>
            {loadingStaff ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            ) : (
              <select
                value={leaderId}
                onChange={(e) => setLeaderId(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">بدون قائد</option>
                {availableStaff.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.full_name} ({staff.staff_code})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading || !teamName.trim()}
              className="flex-1 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  جاري الإنشاء...
                </>
              ) : (
                'إنشاء الفريق'
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
