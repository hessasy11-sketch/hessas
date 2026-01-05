import { useState, useEffect } from 'react';
import {
  Shield,
  UserPlus,
  UserMinus,
  Clock,
  Ban,
  CheckCircle2,
  AlertTriangle,
  X,
  Users,
  Crown,
  Leaf,
  Gavel,
  Calculator,
  TrendingUp,
  Send,
  Copy,
  Mail
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import InviteAssignModal from './InviteAssignModal';

interface Authority {
  id: string;
  staff_id: string;
  staff_code: string;
  staff_name: string;
  authority_role: string;
  is_active: boolean;
  is_suspended: boolean;
  is_temporary: boolean;
  temporary_until: string | null;
  assigned_at: string;
  assigned_by: string;
  suspension_reason: string | null;
  notes: string | null;
}

interface StaffMember {
  id: string;
  staff_code: string;
  name: string;
  role: string;
  department: string;
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

interface Invitation {
  id: string;
  invite_code: string;
  invitee_name: string;
  invitee_phone: string;
  authority_role: string;
  role_name_ar: string;
  role_name_en: string;
  scope_type: string;
  scope_farm_id: string | null;
  farm_name: string | null;
  status: string;
  notes: string | null;
  invited_by: string;
  invited_at: string;
  expires_at: string;
  is_expired: boolean;
}

interface AuthorityPanelProps {
  isOpen: boolean;
  onClose: () => void;
  department?: 'b2f' | 'b2b' | 'finance' | 'marketing' | 'all';
}

export default function AuthorityPanel({ isOpen, onClose, department = 'all' }: AuthorityPanelProps) {
  const [authorities, setAuthorities] = useState<Authority[]>([]);
  const [availableStaff, setAvailableStaff] = useState<StaffMember[]>([]);
  const [rolesFromCatalog, setRolesFromCatalog] = useState<RoleFromCatalog[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleFromCatalog | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    try {
      const departmentParam = department === 'all' ? null : department;

      const [authoritiesRes, staffRes, rolesRes, invitationsRes] = await Promise.all([
        supabase.rpc('get_current_authorities'),
        supabase.rpc('get_available_staff_for_authority'),
        supabase.rpc('get_active_authority_roles', { p_department: departmentParam }),
        supabase.rpc('get_active_invitations', { p_include_expired: false })
      ]);

      if (authoritiesRes.data) setAuthorities(authoritiesRes.data);
      if (staffRes.data) setAvailableStaff(staffRes.data);
      if (rolesRes.data) setRolesFromCatalog(rolesRes.data);
      if (invitationsRes.data) setInvitations(invitationsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (staffId: string, roleCode: string, isTemporary: boolean, temporaryDays?: number) => {
    const role = rolesFromCatalog.find(r => r.role_code === roleCode);

    const { data, error } = await supabase.rpc('exec_assign_authority', {
      p_staff_id: staffId,
      p_authority_role: roleCode,
      p_assigned_by: 'system',
      p_is_temporary: isTemporary,
      p_temporary_days: temporaryDays,
      p_notes: `تعيين ${role?.role_name_ar || roleCode}`
    });

    if (!error && data?.success) {
      loadData();
      setShowAssignModal(false);
      setSelectedRole(null);
    }
  };

  const handleRevoke = async (assignmentId: string) => {
    if (!confirm('هل أنت متأكد من سحب هذه الصلاحية؟')) return;

    const { data, error } = await supabase.rpc('exec_revoke_authority', {
      p_assignment_id: assignmentId,
      p_revoked_by: 'system',
      p_notes: 'سحب الصلاحية'
    });

    if (!error && data?.success) {
      loadData();
    }
  };

  const handleSuspend = async (assignmentId: string, reason: string) => {
    const { data, error } = await supabase.rpc('exec_suspend_authority', {
      p_assignment_id: assignmentId,
      p_suspended_by: 'system',
      p_suspension_reason: reason,
      p_notes: 'تعليق مؤقت'
    });

    if (!error && data?.success) {
      loadData();
    }
  };

  const handleUnsuspend = async (assignmentId: string) => {
    const { data, error } = await supabase.rpc('exec_unsuspend_authority', {
      p_assignment_id: assignmentId,
      p_unsuspended_by: 'system',
      p_notes: 'إلغاء التعليق'
    });

    if (!error && data?.success) {
      loadData();
    }
  };

  const getRoleIcon = (roleCode: string) => {
    const icons: Record<string, any> = {
      GM: Crown,
      B2F_ASSISTANT: Leaf,
      NATIONAL_FARM_DIRECTOR: Crown,
      FARM_MANAGER: Users,
      AGRONOMIST_ENGINEER: Leaf,
      FIELD_SUPERVISOR: Users,
      TECHNICIAN: Users,
      WORKER: Users,
      B2B_ASSISTANT: Gavel,
      FINANCE_MANAGER: Calculator,
      MARKETING_LEAD: TrendingUp,
      FACTORY_SUPERVISOR: Users
    };
    return icons[roleCode] || Shield;
  };

  const getRoleColor = (roleCode: string) => {
    const colors: Record<string, string> = {
      GM: 'bg-amber-100 text-amber-700 border-amber-300',
      B2F_ASSISTANT: 'bg-emerald-100 text-emerald-700 border-emerald-300',
      NATIONAL_FARM_DIRECTOR: 'bg-teal-100 text-teal-700 border-teal-300',
      FARM_MANAGER: 'bg-green-100 text-green-700 border-green-300',
      AGRONOMIST_ENGINEER: 'bg-lime-100 text-lime-700 border-lime-300',
      FIELD_SUPERVISOR: 'bg-emerald-100 text-emerald-700 border-emerald-300',
      TECHNICIAN: 'bg-cyan-100 text-cyan-700 border-cyan-300',
      WORKER: 'bg-slate-100 text-slate-700 border-slate-300',
      B2B_ASSISTANT: 'bg-blue-100 text-blue-700 border-blue-300',
      FINANCE_MANAGER: 'bg-amber-100 text-amber-700 border-amber-300',
      MARKETING_LEAD: 'bg-pink-100 text-pink-700 border-pink-300',
      FACTORY_SUPERVISOR: 'bg-orange-100 text-orange-700 border-orange-300'
    };
    return colors[roleCode] || 'bg-slate-100 text-slate-700 border-slate-300';
  };

  const handleCopyInviteCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleCancelInvitation = async (invitationId: string) => {
    if (!confirm('هل أنت متأكد من إلغاء هذه الدعوة؟')) return;

    const { data, error } = await supabase.rpc('cancel_invitation', {
      p_invitation_id: invitationId,
      p_cancelled_by: 'GM',
      p_reason: 'إلغاء من Authority Panel'
    });

    if (!error && data?.success) {
      loadData();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center shadow-lg">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">لوحة الصلاحيات الإدارية</h2>
              <p className="text-slate-300 text-sm">Authority Panel - إدارة GM فقط</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowInviteModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-bold hover:shadow-lg transition-all"
            >
              <Send className="w-4 h-4" />
              دعوة وتعيين
            </button>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-slate-600">جاري التحميل...</p>
            </div>
          ) : rolesFromCatalog.length === 0 ? (
            <div className="text-center py-12">
              <AlertTriangle className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600">لا توجد أدوار متاحة في الكتالوج</p>
            </div>
          ) : (
            <div className="space-y-6">
              {invitations.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Mail className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-bold text-slate-900">الدعوات المعلقة</h3>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
                      {invitations.length}
                    </span>
                  </div>
                  <div className="grid gap-3 mb-6">
                    {invitations.map((invitation) => {
                      const Icon = getRoleIcon(invitation.authority_role);
                      return (
                        <div
                          key={invitation.id}
                          className="border-2 border-blue-200 bg-blue-50 rounded-xl p-4"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3 flex-1">
                              <div className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center flex-shrink-0 ${getRoleColor(invitation.authority_role)}`}>
                                <Icon className="w-5 h-5" />
                              </div>

                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <h4 className="text-base font-bold text-slate-900">{invitation.invitee_name}</h4>
                                  <span className="text-xs text-slate-500">({invitation.invitee_phone})</span>
                                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold flex items-center gap-1">
                                    <Mail className="w-3 h-3" />
                                    مدعو
                                  </span>
                                </div>

                                <div className="text-sm text-slate-700 mb-2">
                                  <span className="font-bold">{invitation.role_name_ar}</span>
                                  <span className="text-slate-500 mx-2">•</span>
                                  <span className="text-slate-600">النطاق: {invitation.scope_type}</span>
                                  {invitation.farm_name && (
                                    <>
                                      <span className="text-slate-500 mx-2">•</span>
                                      <span className="text-slate-600">{invitation.farm_name}</span>
                                    </>
                                  )}
                                </div>

                                <div className="flex items-center gap-3">
                                  <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                                    <span className="text-xs text-slate-600">كود الدعوة:</span>
                                    <span className="text-sm font-bold text-slate-900 font-mono tracking-wider">
                                      {invitation.invite_code}
                                    </span>
                                    <button
                                      onClick={() => handleCopyInviteCode(invitation.invite_code)}
                                      className="p-1 hover:bg-slate-100 rounded transition-colors"
                                      title="نسخ الكود"
                                    >
                                      {copiedCode === invitation.invite_code ? (
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                      ) : (
                                        <Copy className="w-4 h-4 text-slate-500" />
                                      )}
                                    </button>
                                  </div>

                                  <div className="text-xs text-slate-500 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    ينتهي: {new Date(invitation.expires_at).toLocaleDateString('ar-SA')}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <button
                              onClick={() => handleCancelInvitation(invitation.id)}
                              className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-bold hover:bg-red-600 transition-colors flex items-center gap-1"
                            >
                              <X className="w-3 h-3" />
                              إلغاء
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-5 h-5 text-slate-600" />
                  <h3 className="text-lg font-bold text-slate-900">الصلاحيات الحالية</h3>
                </div>
                <div className="grid gap-4">
              {rolesFromCatalog.map((role) => {
                const authority = authorities.find((a) => a.authority_role === role.role_code);
                const Icon = getRoleIcon(role.role_code);
                const isMaxed = role.max_assignments !== null && role.current_assignments >= role.max_assignments;

                return (
                  <div
                    key={role.role_code}
                    className={`border-2 rounded-xl p-4 ${
                      authority
                        ? authority.is_suspended
                          ? 'bg-red-50 border-red-200'
                          : 'bg-slate-50 border-slate-200'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center flex-shrink-0 ${getRoleColor(role.role_code)}`}>
                          <Icon className="w-6 h-6" />
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="text-lg font-bold text-slate-900">{role.role_name_ar}</h3>
                            <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{role.role_name_en}</span>

                            {role.requires_invitation && (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-bold flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                يتطلب دعوة
                              </span>
                            )}

                            {authority && (
                              <>
                                {authority.is_suspended && (
                                  <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-bold flex items-center gap-1">
                                    <Ban className="w-3 h-3" />
                                    معلق
                                  </span>
                                )}
                                {authority.is_temporary && (
                                  <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-bold flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    مؤقت
                                  </span>
                                )}
                              </>
                            )}
                          </div>

                          {role.description_ar && (
                            <p className="text-xs text-slate-600 mb-2">{role.description_ar}</p>
                          )}

                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-xs text-slate-500">
                              المستوى: <span className="font-bold">{role.level}</span>
                            </span>
                            <span className="text-xs text-slate-500">
                              القسم: <span className="font-bold">{role.department}</span>
                            </span>
                            {role.max_assignments !== null && (
                              <span className={`text-xs font-bold ${isMaxed ? 'text-red-600' : 'text-slate-600'}`}>
                                التعيينات: {role.current_assignments}/{role.max_assignments}
                              </span>
                            )}
                          </div>

                          {authority ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-slate-700">{authority.staff_name}</span>
                                <span className="text-xs text-slate-500">({authority.staff_code})</span>
                              </div>
                              <div className="text-xs text-slate-500">
                                تم التعيين: {new Date(authority.assigned_at).toLocaleDateString('ar-SA')}
                              </div>
                              {authority.is_temporary && authority.temporary_until && (
                                <div className="text-xs text-amber-600 font-bold flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  ينتهي: {new Date(authority.temporary_until).toLocaleDateString('ar-SA')}
                                </div>
                              )}
                              {authority.is_suspended && authority.suspension_reason && (
                                <div className="text-xs text-red-600 mt-2 bg-red-50 p-2 rounded-lg">
                                  <span className="font-bold">سبب التعليق:</span> {authority.suspension_reason}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-sm text-slate-500">لا يوجد تعيين حالياً</div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 flex-shrink-0">
                        {authority ? (
                          <>
                            {authority.is_suspended ? (
                              <button
                                onClick={() => handleUnsuspend(authority.id)}
                                className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-bold hover:bg-emerald-600 transition-colors flex items-center gap-1"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                إلغاء التعليق
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  const reason = prompt('سبب التعليق:');
                                  if (reason) handleSuspend(authority.id, reason);
                                }}
                                className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-bold hover:bg-amber-600 transition-colors flex items-center gap-1"
                              >
                                <Ban className="w-3 h-3" />
                                تعليق
                              </button>
                            )}
                            <button
                              onClick={() => handleRevoke(authority.id)}
                              className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-bold hover:bg-red-600 transition-colors flex items-center gap-1"
                            >
                              <UserMinus className="w-3 h-3" />
                              سحب
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => {
                              if (isMaxed) {
                                alert(`تم الوصول إلى الحد الأقصى للتعيينات (${role.max_assignments})`);
                                return;
                              }
                              if (role.requires_invitation) {
                                alert('هذا الدور يتطلب دعوة خاصة لتفعيله');
                                return;
                              }
                              setSelectedRole(role);
                              setShowAssignModal(true);
                            }}
                            disabled={isMaxed}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${
                              isMaxed
                                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                                : 'bg-blue-500 text-white hover:bg-blue-600'
                            }`}
                          >
                            <UserPlus className="w-3 h-3" />
                            تعيين
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showAssignModal && selectedRole && (
        <AssignModal
          role={selectedRole}
          availableStaff={availableStaff}
          onAssign={handleAssign}
          onClose={() => {
            setShowAssignModal(false);
            setSelectedRole(null);
          }}
          getRoleIcon={getRoleIcon}
          getRoleColor={getRoleColor}
        />
      )}

      <InviteAssignModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        roles={rolesFromCatalog}
        onSuccess={loadData}
      />
    </div>
  );
}

interface AssignModalProps {
  role: RoleFromCatalog;
  availableStaff: StaffMember[];
  onAssign: (staffId: string, roleCode: string, isTemporary: boolean, temporaryDays?: number) => void;
  onClose: () => void;
  getRoleIcon: (roleCode: string) => any;
  getRoleColor: (roleCode: string) => string;
}

function AssignModal({
  role,
  availableStaff,
  onAssign,
  onClose,
  getRoleIcon,
  getRoleColor
}: AssignModalProps) {
  const [selectedStaff, setSelectedStaff] = useState<string>('');
  const [isTemporary, setIsTemporary] = useState(false);
  const [temporaryDays, setTemporaryDays] = useState(30);
  const Icon = getRoleIcon(role.role_code);

  const handleSubmit = () => {
    if (!selectedStaff) {
      alert('الرجاء اختيار موظف');
      return;
    }

    onAssign(selectedStaff, role.role_code, isTemporary, isTemporary ? temporaryDays : undefined);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        <div className={`p-6 border-b-2 ${getRoleColor(role.role_code)}`}>
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center ${getRoleColor(role.role_code)}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-slate-900">تعيين {role.role_name_ar}</h3>
              <p className="text-xs text-slate-500">{role.role_name_en}</p>
            </div>
          </div>
          {role.description_ar && (
            <p className="text-sm text-slate-600 mt-2">{role.description_ar}</p>
          )}
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">اختر الموظف</label>
            <select
              value={selectedStaff}
              onChange={(e) => setSelectedStaff(e.target.value)}
              className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
            >
              <option value="">-- اختر موظف --</option>
              {availableStaff.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.name} - {staff.staff_code} ({staff.role})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl">
            <input
              type="checkbox"
              id="isTemporary"
              checked={isTemporary}
              onChange={(e) => setIsTemporary(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <label htmlFor="isTemporary" className="text-sm font-bold text-slate-700 flex items-center gap-1">
              <Clock className="w-4 h-4 text-amber-600" />
              صلاحية مؤقتة
            </label>
          </div>

          {isTemporary && (
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">عدد الأيام</label>
              <input
                type="number"
                value={temporaryDays}
                onChange={(e) => setTemporaryDays(parseInt(e.target.value) || 1)}
                min="1"
                max="365"
                className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
              />
              <p className="text-xs text-slate-500 mt-1">
                ستنتهي الصلاحية تلقائياً بعد {temporaryDays} يوم
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSubmit}
              className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              تعيين الآن
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-300 transition-colors"
            >
              إلغاء
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
