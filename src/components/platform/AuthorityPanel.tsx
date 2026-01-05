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
  TrendingUp
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

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

interface AuthorityPanelProps {
  isOpen: boolean;
  onClose: () => void;
  department?: 'b2f' | 'b2b' | 'finance' | 'marketing' | 'all';
}

export default function AuthorityPanel({ isOpen, onClose, department = 'all' }: AuthorityPanelProps) {
  const [authorities, setAuthorities] = useState<Authority[]>([]);
  const [availableStaff, setAvailableStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    try {
      const [authoritiesRes, staffRes] = await Promise.all([
        supabase.rpc('get_current_authorities'),
        supabase.rpc('get_available_staff_for_authority')
      ]);

      if (authoritiesRes.data) setAuthorities(authoritiesRes.data);
      if (staffRes.data) setAvailableStaff(staffRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (staffId: string, role: string, isTemporary: boolean, temporaryDays?: number) => {
    const { data, error } = await supabase.rpc('exec_assign_authority', {
      p_staff_id: staffId,
      p_authority_role: role,
      p_assigned_by: 'system',
      p_is_temporary: isTemporary,
      p_temporary_days: temporaryDays,
      p_notes: `تعيين ${getRoleLabel(role)}`
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

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      b2f_assistant: 'مساعد B2F',
      national_farms_manager: 'مدير المزارع الوطني',
      b2b_assistant: 'مساعد B2B',
      b2b_supervisor: 'مشرف المزادات',
      accountant: 'المحاسب',
      marketing_manager: 'مدير التسويق'
    };
    return labels[role] || role;
  };

  const getRoleIcon = (role: string) => {
    const icons: Record<string, any> = {
      b2f_assistant: Leaf,
      national_farms_manager: Crown,
      b2b_assistant: Gavel,
      b2b_supervisor: Users,
      accountant: Calculator,
      marketing_manager: TrendingUp
    };
    return icons[role] || Shield;
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      b2f_assistant: 'bg-emerald-100 text-emerald-700 border-emerald-300',
      national_farms_manager: 'bg-purple-100 text-purple-700 border-purple-300',
      b2b_assistant: 'bg-blue-100 text-blue-700 border-blue-300',
      b2b_supervisor: 'bg-cyan-100 text-cyan-700 border-cyan-300',
      accountant: 'bg-amber-100 text-amber-700 border-amber-300',
      marketing_manager: 'bg-pink-100 text-pink-700 border-pink-300'
    };
    return colors[role] || 'bg-slate-100 text-slate-700 border-slate-300';
  };

  // تحديد الأدوار بناءً على القسم
  const getRolesForDepartment = () => {
    if (department === 'b2f') {
      return ['b2f_assistant', 'national_farms_manager'];
    }
    if (department === 'b2b') {
      return ['b2b_assistant', 'b2b_supervisor'];
    }
    if (department === 'finance') {
      return ['accountant'];
    }
    if (department === 'marketing') {
      return ['marketing_manager'];
    }
    // إذا كان 'all' يعرض كل الأدوار
    return [
      'b2f_assistant',
      'national_farms_manager',
      'b2b_assistant',
      'b2b_supervisor',
      'accountant',
      'marketing_manager'
    ];
  };

  const roles = getRolesForDepartment();

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
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="grid gap-4">
            {roles.map((role) => {
              const authority = authorities.find((a) => a.authority_role === role);
              const Icon = getRoleIcon(role);

              return (
                <div
                  key={role}
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
                      <div className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center flex-shrink-0 ${getRoleColor(role)}`}>
                        <Icon className="w-6 h-6" />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-bold text-slate-900">{getRoleLabel(role)}</h3>
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
                            setSelectedRole(role);
                            setShowAssignModal(true);
                          }}
                          className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs font-bold hover:bg-blue-600 transition-colors flex items-center gap-1"
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

      {showAssignModal && selectedRole && (
        <AssignModal
          role={selectedRole}
          availableStaff={availableStaff}
          onAssign={handleAssign}
          onClose={() => {
            setShowAssignModal(false);
            setSelectedRole(null);
          }}
          getRoleLabel={getRoleLabel}
          getRoleIcon={getRoleIcon}
          getRoleColor={getRoleColor}
        />
      )}
    </div>
  );
}

interface AssignModalProps {
  role: string;
  availableStaff: StaffMember[];
  onAssign: (staffId: string, role: string, isTemporary: boolean, temporaryDays?: number) => void;
  onClose: () => void;
  getRoleLabel: (role: string) => string;
  getRoleIcon: (role: string) => any;
  getRoleColor: (role: string) => string;
}

function AssignModal({
  role,
  availableStaff,
  onAssign,
  onClose,
  getRoleLabel,
  getRoleIcon,
  getRoleColor
}: AssignModalProps) {
  const [selectedStaff, setSelectedStaff] = useState<string>('');
  const [isTemporary, setIsTemporary] = useState(false);
  const [temporaryDays, setTemporaryDays] = useState(30);
  const Icon = getRoleIcon(role);

  const handleSubmit = () => {
    if (!selectedStaff) {
      alert('الرجاء اختيار موظف');
      return;
    }

    onAssign(selectedStaff, role, isTemporary, isTemporary ? temporaryDays : undefined);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        <div className={`p-6 border-b-2 ${getRoleColor(role)}`}>
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center ${getRoleColor(role)}`}>
              <Icon className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">تعيين {getRoleLabel(role)}</h3>
          </div>
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
