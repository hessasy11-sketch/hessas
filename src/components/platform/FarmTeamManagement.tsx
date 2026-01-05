import { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Mail,
  Phone,
  CheckCircle2,
  Clock,
  XCircle,
  Trash2,
  AlertCircle,
  Shield,
  Briefcase
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import InviteAssignModal from './InviteAssignModal';

interface FarmTeamMember {
  staff_id: string;
  staff_name: string;
  staff_code: string;
  role: string;
  role_name_ar: string;
  department: string;
  status: string;
  assigned_at: string;
  phone: string | null;
  email: string | null;
}

interface Invitation {
  id: string;
  invitee_name: string;
  invitee_phone: string;
  authority_role: string;
  role_name_ar: string;
  status: string;
  created_at: string;
  expires_at: string;
  invite_code: string;
}

interface RoleFromCatalog {
  role_code: string;
  role_name_ar: string;
  role_name_en: string;
  department: string;
  level: number;
  description_ar: string;
  requires_invitation: boolean;
  current_assignments: number;
  max_assignments: number | null;
}

interface FarmTeamManagementProps {
  farmId: string;
  farmName: string;
}

export default function FarmTeamManagement({ farmId, farmName }: FarmTeamManagementProps) {
  const [teamMembers, setTeamMembers] = useState<FarmTeamMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [farmRoles, setFarmRoles] = useState<RoleFromCatalog[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadTeamData();
    loadFarmRoles();
  }, [farmId]);

  const loadTeamData = async () => {
    try {
      setLoading(true);

      // Load team members
      const { data: membersData } = await supabase
        .from('platform_staff')
        .select(`
          id,
          staff_code,
          name,
          role,
          department,
          phone,
          email,
          authority_assignments!inner(
            status,
            assigned_at,
            scope_farm_id
          )
        `)
        .eq('authority_assignments.scope_farm_id', farmId);

      if (membersData) {
        const members = await Promise.all(
          membersData.map(async (member: any) => {
            const { data: roleData } = await supabase
              .from('authority_roles_catalog')
              .select('role_name_ar')
              .eq('role_code', member.role)
              .maybeSingle();

            return {
              staff_id: member.id,
              staff_name: member.name,
              staff_code: member.staff_code,
              role: member.role,
              role_name_ar: roleData?.role_name_ar || member.role,
              department: member.department,
              status: member.authority_assignments[0]?.status || 'active',
              assigned_at: member.authority_assignments[0]?.assigned_at || '',
              phone: member.phone,
              email: member.email
            };
          })
        );
        setTeamMembers(members);
      }

      // Load pending invitations
      const { data: invitesData } = await supabase
        .from('authority_invitations')
        .select(`
          id,
          invitee_name,
          invitee_phone,
          authority_role,
          status,
          created_at,
          expires_at,
          invite_code
        `)
        .eq('scope_farm_id', farmId)
        .eq('status', 'invited');

      if (invitesData) {
        const invites = await Promise.all(
          invitesData.map(async (invite: any) => {
            const { data: roleData } = await supabase
              .from('authority_roles_catalog')
              .select('role_name_ar')
              .eq('role_code', invite.authority_role)
              .maybeSingle();

            return {
              ...invite,
              role_name_ar: roleData?.role_name_ar || invite.authority_role
            };
          })
        );
        setInvitations(invites);
      }
    } catch (error) {
      console.error('Error loading team data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFarmRoles = async () => {
    try {
      const { data } = await supabase
        .from('authority_roles_catalog')
        .select('*')
        .in('role_code', [
          'FIELD_SUPERVISOR',
          'AGRONOMIST_ENGINEER',
          'TECHNICIAN',
          'WORKER',
          'FACTORY_SUPERVISOR'
        ])
        .eq('is_active', true);

      if (data) {
        setFarmRoles(data);
      }
    } catch (error) {
      console.error('Error loading farm roles:', error);
    }
  };

  const handleRemoveMember = async (staffId: string, staffName: string) => {
    if (!confirm(`هل أنت متأكد من إزالة ${staffName} من فريق المزرعة؟`)) {
      return;
    }

    setActionLoading(staffId);
    try {
      const { error } = await supabase.rpc('exec_revoke_authority', {
        p_staff_id: staffId,
        p_revoked_by: 'system',
        p_notes: `إزالة من فريق مزرعة ${farmName}`
      });

      if (error) throw error;

      alert('تم إزالة العضو بنجاح');
      loadTeamData();
    } catch (error: any) {
      console.error('Error removing member:', error);
      alert('حدث خطأ: ' + error.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelInvitation = async (inviteId: string, inviteeName: string) => {
    if (!confirm(`هل أنت متأكد من إلغاء دعوة ${inviteeName}؟`)) {
      return;
    }

    setActionLoading(inviteId);
    try {
      const { error } = await supabase
        .from('authority_invitations')
        .update({ status: 'cancelled' })
        .eq('id', inviteId);

      if (error) throw error;

      alert('تم إلغاء الدعوة بنجاح');
      loadTeamData();
    } catch (error: any) {
      console.error('Error cancelling invitation:', error);
      alert('حدث خطأ: ' + error.message);
    } finally {
      setActionLoading(null);
    }
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      FIELD_SUPERVISOR: 'bg-blue-100 text-blue-700 border-blue-200',
      AGRONOMIST_ENGINEER: 'bg-purple-100 text-purple-700 border-purple-200',
      TECHNICIAN: 'bg-orange-100 text-orange-700 border-orange-200',
      WORKER: 'bg-slate-100 text-slate-700 border-slate-200',
      FACTORY_SUPERVISOR: 'bg-emerald-100 text-emerald-700 border-emerald-200'
    };
    return colors[role] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, any> = {
      active: {
        label: 'نشط',
        icon: CheckCircle2,
        color: 'bg-emerald-100 text-emerald-700 border-emerald-200'
      },
      suspended: {
        label: 'معلق',
        icon: Clock,
        color: 'bg-amber-100 text-amber-700 border-amber-200'
      },
      revoked: {
        label: 'محذوف',
        icon: XCircle,
        color: 'bg-red-100 text-red-700 border-red-200'
      }
    };
    return badges[status] || badges.active;
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-slate-600">جاري تحميل بيانات الفريق...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
            <Users className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">فريق المزرعة</h2>
            <p className="text-slate-600 text-sm">{farmName}</p>
          </div>
        </div>

        <button
          onClick={() => setShowInviteModal(true)}
          className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-bold hover:shadow-lg transition-all"
        >
          <UserPlus className="w-5 h-5" />
          إضافة عضو للفريق
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-bold mb-1">عن فريق المزرعة:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>يمكن لمدير المزرعة إضافة أعضاء فريقه</li>
              <li>الأدوار المتاحة: مشرف ميداني، مهندس زراعي، فني، عامل، مشرف مصنع</li>
              <li>كل عضو يعمل في مزرعته المحددة فقط</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg border-2 border-amber-200">
          <div className="p-4 bg-amber-50 border-b border-amber-200 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-600" />
              دعوات معلقة
            </h3>
            <span className="px-3 py-1 bg-amber-500 text-white rounded-full text-sm font-bold">
              {invitations.length}
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {invitations.map((invite) => (
              <div key={invite.id} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-bold text-slate-900">{invite.invitee_name}</h4>
                      <span
                        className={`px-2 py-1 rounded-lg text-xs font-bold border ${getRoleColor(
                          invite.authority_role
                        )}`}
                      >
                        {invite.role_name_ar}
                      </span>
                    </div>

                    <div className="space-y-1 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        {invite.invitee_phone}
                      </div>
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        كود الدعوة: <code className="bg-slate-100 px-2 py-0.5 rounded font-mono">{invite.invite_code}</code>
                      </div>
                      <div className="flex items-center gap-2 text-amber-600">
                        <Clock className="w-4 h-4" />
                        تنتهي في: {new Date(invite.expires_at).toLocaleDateString('ar-SA')}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleCancelInvitation(invite.id, invite.invitee_name)}
                    disabled={actionLoading === invite.id}
                    className="px-3 py-2 bg-red-500 text-white rounded-lg text-sm font-bold hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actionLoading === invite.id ? 'جاري...' : 'إلغاء الدعوة'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Team Members */}
      <div className="bg-white rounded-xl shadow-lg border-2 border-slate-200">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-slate-600" />
            أعضاء الفريق
          </h3>
          <span className="px-3 py-1 bg-slate-600 text-white rounded-full text-sm font-bold">
            {teamMembers.length}
          </span>
        </div>

        {teamMembers.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 font-medium mb-2">لا يوجد أعضاء في الفريق حالياً</p>
            <p className="text-slate-500 text-sm mb-4">ابدأ ببناء فريقك بإضافة أعضاء جدد</p>
            <button
              onClick={() => setShowInviteModal(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg font-bold hover:bg-blue-600 transition-colors"
            >
              إضافة أول عضو
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {teamMembers.map((member) => {
              const statusBadge = getStatusBadge(member.status);
              const StatusIcon = statusBadge.icon;

              return (
                <div key={member.staff_id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-bold text-slate-900">{member.staff_name}</h4>
                        <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-mono">
                          {member.staff_code}
                        </span>
                        <span
                          className={`px-2 py-1 rounded-lg text-xs font-bold border ${getRoleColor(
                            member.role
                          )}`}
                        >
                          {member.role_name_ar}
                        </span>
                        <span
                          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold border ${statusBadge.color}`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {statusBadge.label}
                        </span>
                      </div>

                      <div className="space-y-1 text-sm text-slate-600">
                        {member.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4" />
                            {member.phone}
                          </div>
                        )}
                        {member.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4" />
                            {member.email}
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Briefcase className="w-4 h-4" />
                          القسم: {member.department}
                        </div>
                        <div className="flex items-center gap-2 text-slate-500">
                          <Clock className="w-4 h-4" />
                          انضم في: {new Date(member.assigned_at).toLocaleDateString('ar-SA')}
                        </div>
                      </div>
                    </div>

                    {member.status === 'active' && (
                      <button
                        onClick={() => handleRemoveMember(member.staff_id, member.staff_name)}
                        disabled={actionLoading === member.staff_id}
                        className="flex items-center gap-2 px-3 py-2 bg-red-500 text-white rounded-lg text-sm font-bold hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-4 h-4" />
                        {actionLoading === member.staff_id ? 'جاري...' : 'إزالة'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <InviteAssignModal
          isOpen={true}
          onClose={() => {
            setShowInviteModal(false);
            loadTeamData();
          }}
          roles={farmRoles}
          onSuccess={() => {
            setShowInviteModal(false);
            loadTeamData();
          }}
          scopeType="farm"
          selectedFarmId={farmId}
        />
      )}
    </div>
  );
}
