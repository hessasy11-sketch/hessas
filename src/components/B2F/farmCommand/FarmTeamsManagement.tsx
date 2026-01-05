import { useState, useEffect } from 'react';
import { Users, Plus, UserPlus, Shield, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useFarmPermissions } from '../../../hooks/useFarmPermissions';

interface Team {
  id: string;
  team_name: string;
  team_type: string;
  team_leader_id: string | null;
  is_active: boolean;
  leader: {
    name_ar: string;
  } | null;
  members_count: number;
}

interface FarmRole {
  id: string;
  role_code: string;
  role_name_ar: string;
  role_name_en: string;
  hierarchy_level: number;
}

interface StaffMember {
  id: string;
  name_ar: string;
  staff_code: string;
}

export default function FarmTeamsManagement({ farmId }: { farmId: string }) {
  const { hasPermission, loading: permLoading } = useFarmPermissions(farmId);
  const [teams, setTeams] = useState<Team[]>([]);
  const [roles, setRoles] = useState<FarmRole[]>([]);
  const [availableStaff, setAvailableStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showAddMember, setShowAddMember] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [farmId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // جلب الفرق
      const { data: teamsData, error: teamsError } = await supabase
        .from('fc_teams')
        .select(`
          *,
          leader:platform_staff!team_leader_id(name_ar),
          members:fc_team_members(count)
        `)
        .eq('operational_farm_id', farmId)
        .eq('is_active', true);

      if (teamsError) throw teamsError;

      const teamsWithCount = teamsData?.map(team => ({
        ...team,
        members_count: team.members?.[0]?.count || 0
      })) || [];

      setTeams(teamsWithCount);

      // جلب الأدوار
      const { data: rolesData } = await supabase
        .from('fc_farm_roles')
        .select('*')
        .eq('is_active', true)
        .order('hierarchy_level');

      setRoles(rolesData || []);

      // جلب الموظفين المتاحين
      const { data: staffData } = await supabase
        .from('platform_staff')
        .select('id, name_ar, staff_code')
        .eq('is_active', true)
        .limit(50);

      setAvailableStaff(staffData || []);
    } catch (error) {
      console.error('Error loading teams data:', error);
    } finally {
      setLoading(false);
    }
  };

  const canManageTeams = hasPermission('manage_teams');

  if (permLoading || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!canManageTeams) {
    return (
      <div className="text-center py-12">
        <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          لا توجد صلاحية
        </h3>
        <p className="text-gray-600">
          ليس لديك صلاحية لإدارة الفرق في هذه المزرعة
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">إدارة الفرق</h2>
          <p className="text-sm text-gray-600 mt-1">
            بناء وإدارة فرق العمل في المزرعة
          </p>
        </div>
        <button
          onClick={() => setShowCreateTeam(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors"
        >
          <Plus className="w-5 h-5" />
          إنشاء فريق جديد
        </button>
      </div>

      {/* إحصائيات */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-6 h-6 opacity-80" />
            <span className="text-3xl font-bold">{teams.length}</span>
          </div>
          <p className="text-sm opacity-90">إجمالي الفرق</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <UserPlus className="w-6 h-6 opacity-80" />
            <span className="text-3xl font-bold">
              {teams.reduce((sum, t) => sum + t.members_count, 0)}
            </span>
          </div>
          <p className="text-sm opacity-90">إجمالي الأعضاء</p>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <Shield className="w-6 h-6 opacity-80" />
            <span className="text-3xl font-bold">{roles.length}</span>
          </div>
          <p className="text-sm opacity-90">الأدوار المتاحة</p>
        </div>
      </div>

      {/* قائمة الفرق */}
      {teams.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            لا توجد فرق بعد
          </h3>
          <p className="text-gray-600 mb-6">
            ابدأ بإنشاء أول فريق للعمل في المزرعة
          </p>
          <button
            onClick={() => setShowCreateTeam(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors"
          >
            <Plus className="w-5 h-5" />
            إنشاء فريق جديد
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {teams.map((team) => (
            <div
              key={team.id}
              className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">
                    {team.team_name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {team.team_type === 'operations' && 'فريق تشغيل'}
                    {team.team_type === 'maintenance' && 'فريق صيانة'}
                    {team.team_type === 'harvesting' && 'فريق حصاد'}
                    {team.team_type === 'irrigation' && 'فريق ري'}
                    {team.team_type === 'security' && 'فريق أمن'}
                    {team.team_type === 'custom' && 'فريق مخصص'}
                  </p>
                  {team.leader && (
                    <p className="text-sm text-emerald-600 mt-2">
                      القائد: {team.leader.name_ar}
                    </p>
                  )}
                </div>
                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
                  {team.members_count} عضو
                </span>
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowAddMember(team.id)}
                  className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  إضافة عضو
                </button>
                <button className="p-2 hover:bg-gray-100 text-gray-600 rounded-lg transition-colors">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* عرض الأدوار */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          الأدوار المتاحة في المزرعة
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {roles.map((role) => (
            <div
              key={role.id}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 text-sm">
                  {role.role_name_ar}
                </h4>
                <p className="text-xs text-gray-500">
                  المستوى {role.hierarchy_level}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
