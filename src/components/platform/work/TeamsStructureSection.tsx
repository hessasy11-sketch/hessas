import { useState, useEffect } from 'react';
import { Network, Plus, Users as UsersIcon, ChevronRight, ChevronDown, UserPlus, X, CheckCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface Team {
  id: string;
  name: string;
  description: string;
  department: string;
  is_active: boolean;
  team_leader_id: string;
  team_leader?: { full_name: string };
  members?: TeamMember[];
}

interface TeamMember {
  id: string;
  staff_id: string;
  role_in_team: string;
  staff?: {
    full_name: string;
    role_title: string;
  };
}

interface Staff {
  id: string;
  full_name: string;
  role_title: string;
  department: string;
  reports_to_staff_id: string;
}

export function TeamsStructureSection() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [allStaff, setAllStaff] = useState<Staff[]>([]);
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [showAddMemberModal, setShowAddMemberModal] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [teamsData, staffData] = await Promise.all([
        supabase
          .from('staff_teams')
          .select(`
            *,
            team_leader:platform_staff!team_leader_id(full_name),
            members:team_members(
              id,
              staff_id,
              role_in_team,
              staff:platform_staff(full_name, role_title)
            )
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('platform_staff')
          .select('id, full_name, role_title, department, reports_to_staff_id')
          .eq('is_active', true)
          .order('full_name')
      ]);

      if (teamsData.error) throw teamsData.error;
      if (staffData.error) throw staffData.error;

      setTeams(teamsData.data || []);
      setAllStaff(staffData.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const buildHierarchy = (staffId: string, level = 0): any[] => {
    const subordinates = allStaff.filter(s => s.reports_to_staff_id === staffId);
    return subordinates.map(sub => ({
      ...sub,
      level,
      children: buildHierarchy(sub.id, level + 1)
    }));
  };

  const rootStaff = allStaff.filter(s => !s.reports_to_staff_id);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-white">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <UsersIcon className="w-6 h-6 text-orange-400" />
              <h2 className="text-xl font-bold text-white">فرق العمل</h2>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold transition-all flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              إنشاء فريق
            </button>
          </div>

          <div className="space-y-3">
            {teams.map((team) => (
              <div
                key={team.id}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden"
              >
                <div
                  onClick={() => setExpandedTeam(expandedTeam === team.id ? null : team.id)}
                  className="p-4 cursor-pointer hover:bg-white/10 transition-all flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    {expandedTeam === team.id ? (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                    <div>
                      <h3 className="text-white font-bold">{team.name}</h3>
                      <p className="text-gray-400 text-sm">
                        قائد الفريق: {team.team_leader?.full_name || 'غير محدد'}
                      </p>
                    </div>
                  </div>
                  <div className="text-gray-400 text-sm">
                    {team.members?.length || 0} عضو
                  </div>
                </div>

                {expandedTeam === team.id && (
                  <div className="border-t border-white/10 p-4 bg-white/5">
                    <div className="space-y-2 mb-4">
                      {team.members?.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center gap-3 p-3 bg-white/5 rounded-lg"
                        >
                          <UsersIcon className="w-4 h-4 text-gray-400" />
                          <div className="flex-1">
                            <div className="text-white font-bold text-sm">
                              {member.staff?.full_name}
                            </div>
                            <div className="text-gray-400 text-xs">
                              {member.role_in_team || member.staff?.role_title}
                            </div>
                          </div>
                        </div>
                      ))}
                      {(!team.members || team.members.length === 0) && (
                        <div className="text-center py-4 text-gray-500 text-sm">
                          لا يوجد أعضاء في الفريق
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => setShowAddMemberModal(team.id)}
                      className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition-all flex items-center justify-center gap-2"
                    >
                      <UserPlus className="w-4 h-4" />
                      إضافة عضو
                    </button>
                  </div>
                )}
              </div>
            ))}

            {teams.length === 0 && (
              <div className="text-center py-12 bg-white/5 rounded-xl">
                <UsersIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">لا توجد فرق</p>
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-3 mb-4">
            <Network className="w-6 h-6 text-teal-400" />
            <h2 className="text-xl font-bold text-white">الهيكل الإداري</h2>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
            {rootStaff.length > 0 ? (
              <div className="space-y-2">
                {rootStaff.map(root => (
                  <HierarchyNode key={root.id} staff={root} children={buildHierarchy(root.id)} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Network className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">لا يوجد هيكل إداري</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showCreateModal && (
        <CreateTeamModal
          team={selectedTeam}
          allStaff={allStaff}
          onClose={() => {
            setShowCreateModal(false);
            setSelectedTeam(null);
          }}
          onSuccess={() => {
            loadData();
            setShowCreateModal(false);
            setSelectedTeam(null);
          }}
        />
      )}

      {showAddMemberModal && (
        <AddMemberModal
          teamId={showAddMemberModal}
          allStaff={allStaff}
          currentMembers={teams.find(t => t.id === showAddMemberModal)?.members || []}
          onClose={() => setShowAddMemberModal(null)}
          onSuccess={() => {
            loadData();
            setShowAddMemberModal(null);
          }}
        />
      )}
    </div>
  );
}

function HierarchyNode({ staff, children }: any) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <div
        onClick={() => children.length > 0 && setExpanded(!expanded)}
        className={`flex items-center gap-2 p-3 bg-white/5 rounded-lg ${children.length > 0 ? 'cursor-pointer hover:bg-white/10' : ''}`}
      >
        {children.length > 0 ? (
          expanded ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )
        ) : (
          <div className="w-4"></div>
        )}
        <UsersIcon className="w-4 h-4 text-teal-400" />
        <div className="flex-1">
          <div className="text-white font-bold text-sm">{staff.full_name}</div>
          <div className="text-gray-400 text-xs">{staff.role_title}</div>
        </div>
        {children.length > 0 && (
          <span className="text-xs text-gray-500 px-2 py-1 bg-white/5 rounded">
            {children.length}
          </span>
        )}
      </div>
      {expanded && children.length > 0 && (
        <div className="mr-6 mt-2 space-y-2 border-r-2 border-teal-500/30 pr-2">
          {children.map((child: any) => (
            <HierarchyNode key={child.id} staff={child} children={child.children} />
          ))}
        </div>
      )}
    </div>
  );
}

interface CreateTeamModalProps {
  team: Team | null;
  allStaff: Staff[];
  onClose: () => void;
  onSuccess: () => void;
}

function CreateTeamModal({ team, allStaff, onClose, onSuccess }: CreateTeamModalProps) {
  const [formData, setFormData] = useState({
    name: team?.name || '',
    description: team?.description || '',
    department: team?.department || '',
    team_leader_id: team?.team_leader_id || '',
    is_active: team?.is_active ?? true
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('يرجى إدخال اسم الفريق');
      return;
    }

    setSaving(true);
    try {
      if (team) {
        const { error } = await supabase
          .from('staff_teams')
          .update(formData)
          .eq('id', team.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('staff_teams')
          .insert([formData]);
        if (error) throw error;
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving team:', error);
      alert('حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" dir="rtl">
      <div className="bg-slate-800 rounded-2xl border border-white/10 w-full max-w-lg">
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">
            {team ? 'تعديل الفريق' : 'إنشاء فريق جديد'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-white font-bold mb-2">اسم الفريق</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white"
              placeholder="مثال: فريق المزادات"
            />
          </div>

          <div>
            <label className="block text-white font-bold mb-2">الوصف</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-white font-bold mb-2">القسم</label>
            <input
              type="text"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white"
              placeholder="مثال: b2b"
            />
          </div>

          <div>
            <label className="block text-white font-bold mb-2">قائد الفريق</label>
            <select
              value={formData.team_leader_id}
              onChange={(e) => setFormData({ ...formData, team_leader_id: e.target.value })}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white"
            >
              <option value="">اختر قائد الفريق</option>
              {allStaff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name} - {s.role_title}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="p-6 border-t border-white/10 flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-6 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 text-white rounded-lg font-bold transition-all"
          >
            {saving ? 'جاري الحفظ...' : (team ? 'حفظ' : 'إنشاء')}
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold transition-all"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}

interface AddMemberModalProps {
  teamId: string;
  allStaff: Staff[];
  currentMembers: TeamMember[];
  onClose: () => void;
  onSuccess: () => void;
}

function AddMemberModal({ teamId, allStaff, currentMembers, onClose, onSuccess }: AddMemberModalProps) {
  const [selectedStaff, setSelectedStaff] = useState('');
  const [roleInTeam, setRoleInTeam] = useState('');
  const [saving, setSaving] = useState(false);

  const currentMemberIds = currentMembers.map(m => m.staff_id);
  const availableStaff = allStaff.filter(s => !currentMemberIds.includes(s.id));

  const handleAdd = async () => {
    if (!selectedStaff) {
      alert('يرجى اختيار موظف');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('team_members')
        .insert([{
          team_id: teamId,
          staff_id: selectedStaff,
          role_in_team: roleInTeam
        }]);

      if (error) throw error;
      onSuccess();
    } catch (error) {
      console.error('Error adding member:', error);
      alert('حدث خطأ أثناء الإضافة');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" dir="rtl">
      <div className="bg-slate-800 rounded-2xl border border-white/10 w-full max-w-md">
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">إضافة عضو للفريق</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-white font-bold mb-2">الموظف</label>
            <select
              value={selectedStaff}
              onChange={(e) => setSelectedStaff(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white"
            >
              <option value="">اختر موظف</option>
              {availableStaff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name} - {s.role_title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-white font-bold mb-2">الدور في الفريق (اختياري)</label>
            <input
              type="text"
              value={roleInTeam}
              onChange={(e) => setRoleInTeam(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white"
              placeholder="مثال: نائب القائد"
            />
          </div>
        </div>

        <div className="p-6 border-t border-white/10 flex gap-3">
          <button
            onClick={handleAdd}
            disabled={saving}
            className="flex-1 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 text-white rounded-lg font-bold transition-all flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-5 h-5" />
            {saving ? 'جاري الإضافة...' : 'إضافة'}
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold transition-all"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}
