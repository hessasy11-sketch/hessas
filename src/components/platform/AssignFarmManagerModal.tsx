import { useState, useEffect } from 'react';
import {
  X,
  UserPlus,
  Send,
  Users,
  CheckCircle2,
  AlertCircle,
  Leaf
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import InviteAssignModal from './InviteAssignModal';

interface FarmRadar {
  id: string;
  name: string;
  location: string;
  status: string;
  bookings_enabled: boolean;
  farm_manager_id: string | null;
  farm_manager_name: string | null;
  total_visits: number;
  total_bookings: number;
  pending_bookings: number;
  last_booking_at: string | null;
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

interface AssignFarmManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  farm: FarmRadar;
}

export default function AssignFarmManagerModal({
  isOpen,
  onClose,
  farm
}: AssignFarmManagerModalProps) {
  const [mode, setMode] = useState<'choose' | 'invite' | 'assign'>('choose');
  const [availableStaff, setAvailableStaff] = useState<StaffMember[]>([]);
  const [rolesFromCatalog, setRolesFromCatalog] = useState<RoleFromCatalog[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [assignSuccess, setAssignSuccess] = useState(false);

  useEffect(() => {
    if (isOpen && mode === 'assign') {
      loadAvailableStaff();
    }
    if (isOpen && mode === 'invite') {
      loadRoles();
    }
  }, [isOpen, mode]);

  const loadAvailableStaff = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .rpc('get_available_staff_for_authority');

      if (data) {
        setAvailableStaff(data);
      }
    } catch (error) {
      console.error('Error loading staff:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      const { data } = await supabase
        .rpc('get_active_authority_roles', { p_department: 'operations' });

      if (data) {
        const farmManagerRole = data.find((r: RoleFromCatalog) => r.role_code === 'FARM_MANAGER');
        setRolesFromCatalog(farmManagerRole ? [farmManagerRole] : []);
      }
    } catch (error) {
      console.error('Error loading roles:', error);
    }
  };

  const handleAssignExistingStaff = async () => {
    if (!selectedStaffId) {
      alert('الرجاء اختيار موظف');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('exec_assign_authority', {
        p_staff_id: selectedStaffId,
        p_authority_role: 'FARM_MANAGER',
        p_assigned_by: 'system',
        p_is_temporary: false,
        p_temporary_days: null,
        p_notes: `تعيين مدير لمزرعة ${farm.name}`
      });

      if (error) throw error;

      if (data?.success) {
        setAssignSuccess(true);
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        alert(data?.message || 'فشل التعيين');
      }
    } catch (error) {
      console.error('Error assigning staff:', error);
      alert('حدث خطأ أثناء التعيين');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setMode('choose');
    setSelectedStaffId('');
    setAssignSuccess(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  if (!isOpen) return null;

  if (assignSuccess) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4" dir="rtl">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-6 rounded-t-2xl">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-white" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-white text-center mb-2">تم التعيين بنجاح</h3>
            <p className="text-emerald-100 text-center text-sm">تم تعيين مدير المزرعة بنجاح</p>
          </div>

          <div className="p-6">
            <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200 text-center">
              <p className="text-emerald-900 font-bold mb-1">{farm.name}</p>
              <p className="text-emerald-700 text-sm">{farm.location}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'invite') {
    return (
      <InviteAssignModal
        isOpen={true}
        onClose={handleClose}
        roles={rolesFromCatalog}
        onSuccess={handleClose}
        preselectedRole="FARM_MANAGER"
      />
    );
  }

  if (mode === 'assign') {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4" dir="rtl">
        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 p-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white">تعيين موظف موجود</h3>
                <p className="text-emerald-200 text-sm">{farm.name}</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-slate-600">جاري تحميل الموظفين...</p>
              </div>
            ) : availableStaff.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600 mb-4">لا يوجد موظفين متاحين</p>
                <button
                  onClick={() => setMode('invite')}
                  className="px-4 py-2 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 transition-colors"
                >
                  دعوة موظف جديد
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <Leaf className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-emerald-900">
                      <p className="font-bold mb-1">المزرعة:</p>
                      <p>{farm.name} - {farm.location}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    اختر الموظف <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedStaffId}
                    onChange={(e) => setSelectedStaffId(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
                  >
                    <option value="">-- اختر موظف --</option>
                    {availableStaff.map((staff) => (
                      <option key={staff.id} value={staff.id}>
                        {staff.name} - {staff.staff_code} ({staff.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-900">
                      <p className="font-bold mb-1">ملاحظة:</p>
                      <p>سيتم تعيين الموظف كمدير لهذه المزرعة وستُمنح له الصلاحيات الكاملة لإدارتها.</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleAssignExistingStaff}
                    disabled={loading || !selectedStaffId}
                    className="flex-1 px-4 py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <UserPlus className="w-5 h-5" />
                    {loading ? 'جاري التعيين...' : 'تعيين الآن'}
                  </button>
                  <button
                    onClick={() => setMode('choose')}
                    className="px-6 py-3 bg-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-300 transition-colors"
                  >
                    رجوع
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <UserPlus className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white">تعيين مدير مزرعة</h3>
              <p className="text-emerald-200 text-sm">{farm.name}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="p-6">
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Leaf className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-emerald-900">
                  <p className="font-bold mb-1">المزرعة:</p>
                  <p>{farm.name}</p>
                  <p className="text-emerald-700 text-xs mt-1">{farm.location}</p>
                </div>
              </div>
            </div>

            {farm.farm_manager_name && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-900">
                    <p className="font-bold mb-1">تنبيه:</p>
                    <p>المزرعة لديها مدير حالياً: <span className="font-bold">{farm.farm_manager_name}</span></p>
                    <p className="text-xs mt-1">التعيين الجديد سيحل محل المدير الحالي.</p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={() => setMode('invite')}
                className="w-full px-4 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-bold hover:shadow-lg transition-all flex items-center justify-center gap-3"
              >
                <Send className="w-5 h-5" />
                <div className="text-right">
                  <div>دعوة موظف جديد</div>
                  <div className="text-xs text-blue-100">إرسال دعوة لموظف غير مسجل</div>
                </div>
              </button>

              <button
                onClick={() => setMode('assign')}
                className="w-full px-4 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-bold hover:shadow-lg transition-all flex items-center justify-center gap-3"
              >
                <Users className="w-5 h-5" />
                <div className="text-right">
                  <div>تعيين موظف موجود</div>
                  <div className="text-xs text-emerald-100">اختيار من الموظفين المسجلين</div>
                </div>
              </button>
            </div>

            <button
              onClick={handleClose}
              className="w-full px-4 py-3 bg-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-300 transition-colors"
            >
              إلغاء
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
