import { useState, useEffect } from 'react';
import { Users, UserPlus, UserMinus, Shield, AlertCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface TeamMember {
  id: string;
  user_id: string;
  role: string;
  is_active: boolean;
  created_at: string;
  staff_info?: {
    full_name: string;
    phone: string;
    role: string;
  };
}

interface FarmTeamTabProps {
  farmId: string;
  canManage: boolean;
  onRefresh: () => void;
}

const TEAM_ROLES = [
  { value: 'farm_manager', label: 'مدير مزرعة', color: 'purple' },
  { value: 'field_supervisor', label: 'مشرف ميداني', color: 'blue' },
  { value: 'agricultural_engineer', label: 'مهندس زراعي', color: 'green' },
  { value: 'technician', label: 'فني', color: 'yellow' },
  { value: 'worker', label: 'عامل', color: 'gray' },
  { value: 'factory_supervisor', label: 'مشرف مصنع', color: 'orange' }
];

const FarmTeamTab = ({ farmId, canManage, onRefresh }: FarmTeamTabProps) => {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    loadTeam();
  }, [farmId]);

  const loadTeam = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('farm_team')
        .select(`
          *,
          staff_info:platform_staff!farm_team_user_id_fkey(
            full_name,
            phone,
            role
          )
        `)
        .eq('farm_id', farmId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setTeam(data || []);
    } catch (err: any) {
      console.error('Error loading team:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleMemberStatus = async (memberId: string, currentStatus: boolean) => {
    if (!canManage) return;

    try {
      const { error } = await supabase
        .from('farm_team')
        .update({ is_active: !currentStatus, updated_at: new Date().toISOString() })
        .eq('id', memberId);

      if (error) throw error;

      await loadTeam();
      onRefresh();
    } catch (err: any) {
      console.error('Error updating member:', err);
      alert('فشل تحديث حالة العضو');
    }
  };

  const getRoleInfo = (roleValue: string) => {
    return TEAM_ROLES.find(r => r.value === roleValue) || { label: roleValue, color: 'gray' };
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  const activeMembers = team.filter(m => m.is_active);
  const inactiveMembers = team.filter(m => !m.is_active);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">فريق المزرعة</h2>
          <p className="text-sm text-gray-600 mt-1">
            {activeMembers.length} عضو نشط • {inactiveMembers.length} غير نشط
          </p>
        </div>

        {canManage && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            إضافة عضو
          </button>
        )}
      </div>

      {/* Active Members */}
      {activeMembers.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-green-600" />
              الأعضاء النشطون ({activeMembers.length})
            </h3>
          </div>
          <div className="divide-y divide-gray-100">
            {activeMembers.map((member) => {
              const roleInfo = getRoleInfo(member.role);
              const colorClasses = {
                purple: 'bg-purple-100 text-purple-700',
                blue: 'bg-blue-100 text-blue-700',
                green: 'bg-green-100 text-green-700',
                yellow: 'bg-yellow-100 text-yellow-700',
                orange: 'bg-orange-100 text-orange-700',
                gray: 'bg-gray-100 text-gray-700'
              };

              return (
                <div key={member.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`
                        w-12 h-12 rounded-full flex items-center justify-center text-white font-bold
                        bg-gradient-to-br from-green-400 to-green-600
                      `}>
                        {member.staff_info?.full_name?.charAt(0) || '؟'}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">
                          {member.staff_info?.full_name || 'غير محدد'}
                        </h4>
                        <p className="text-sm text-gray-600">{member.staff_info?.phone}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`
                            text-xs px-2 py-1 rounded
                            ${colorClasses[roleInfo.color as keyof typeof colorClasses]}
                          `}>
                            {roleInfo.label}
                          </span>
                          {member.role === 'farm_manager' && (
                            <span className="flex items-center gap-1 text-xs text-purple-600">
                              <Shield className="w-3 h-3" />
                              مدير
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {canManage && member.role !== 'farm_manager' && (
                      <button
                        onClick={() => toggleMemberStatus(member.id, member.is_active)}
                        className="px-3 py-1.5 text-sm border border-red-300 text-red-600 rounded hover:bg-red-50 transition-colors flex items-center gap-1"
                      >
                        <UserMinus className="w-3.5 h-3.5" />
                        إيقاف
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Inactive Members */}
      {inactiveMembers.length > 0 && (
        <div className="bg-gray-50 rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-700 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              الأعضاء غير النشطون ({inactiveMembers.length})
            </h3>
          </div>
          <div className="divide-y divide-gray-200">
            {inactiveMembers.map((member) => {
              const roleInfo = getRoleInfo(member.role);

              return (
                <div key={member.id} className="px-6 py-4 opacity-60">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center text-white font-bold">
                        {member.staff_info?.full_name?.charAt(0) || '؟'}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-700">
                          {member.staff_info?.full_name || 'غير محدد'}
                        </h4>
                        <p className="text-sm text-gray-500">{member.staff_info?.phone}</p>
                        <span className="text-xs px-2 py-1 bg-gray-200 text-gray-600 rounded mt-1 inline-block">
                          {roleInfo.label}
                        </span>
                      </div>
                    </div>

                    {canManage && (
                      <button
                        onClick={() => toggleMemberStatus(member.id, member.is_active)}
                        className="px-3 py-1.5 text-sm border border-green-300 text-green-600 rounded hover:bg-green-50 transition-colors flex items-center gap-1"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        تفعيل
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {team.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
          <Users className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-900 mb-1">لا يوجد أعضاء في الفريق</h3>
          <p className="text-sm text-gray-600 mb-4">ابدأ بإضافة أعضاء فريق المزرعة</p>
          {canManage && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors inline-flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              إضافة عضو
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default FarmTeamTab;
