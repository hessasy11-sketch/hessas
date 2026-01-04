import { useState, useEffect } from 'react';
import { ArrowLeft, Users, Plus, Trash2, Shield, Award } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface Department {
  id: string;
  name_ar: string;
  code: string;
  description: string;
}

interface Props {
  department: Department;
  onBack: () => void;
}

interface StaffMember {
  id: string;
  staff_id: string;
  staff: {
    full_name: string;
    staff_code: string;
    role: string;
  };
  role_id: string;
  start_date: string;
}

interface Permission {
  id: string;
  permission_key: string;
  permission_name_ar: string;
  is_granted: boolean;
  granted_at: string;
}

export function DepartmentDetailsView({ department, onBack }: Props) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [activeTab, setActiveTab] = useState<'staff' | 'permissions'>('staff');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [department.id]);

  const loadData = async () => {
    try {
      const [staffData, permData] = await Promise.all([
        supabase
          .from('department_staff_assignments')
          .select('*, staff:platform_staff!staff_id(full_name, staff_code, role)')
          .eq('department_id', department.id)
          .order('created_at', { ascending: false }),

        supabase
          .from('department_permissions')
          .select('*')
          .eq('department_id', department.id)
          .order('created_at', { ascending: false })
      ]);

      if (staffData.data) setStaff(staffData.data);
      if (permData.data) setPermissions(permData.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveStaff = async (assignmentId: string) => {
    if (!confirm('هل أنت متأكد من إزالة هذا الموظف من القسم؟')) return;

    try {
      const { error } = await supabase
        .from('department_staff_assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;
      loadData();
    } catch (error: any) {
      alert('خطأ: ' + error.message);
    }
  };

  const handleTogglePermission = async (permId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('department_permissions')
        .update({
          is_granted: !currentStatus,
          granted_at: !currentStatus ? new Date().toISOString() : null
        })
        .eq('id', permId);

      if (error) throw error;
      loadData();
    } catch (error: any) {
      alert('خطأ: ' + error.message);
    }
  };

  if (loading) {
    return <div className="text-white text-center py-8">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all"
        >
          <ArrowLeft className="w-5 h-5 text-gray-400" />
        </button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-white">{department.name_ar}</h2>
          <p className="text-gray-400 text-sm">{department.code}</p>
          <p className="text-gray-500 text-xs mt-1">{department.description}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-2">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('staff')}
            className={`flex-1 px-6 py-3 font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === 'staff'
                ? 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white'
                : 'text-gray-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Users className="w-5 h-5" />
            الموظفين ({staff.length})
          </button>
          <button
            onClick={() => setActiveTab('permissions')}
            className={`flex-1 px-6 py-3 font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === 'permissions'
                ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white'
                : 'text-gray-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Shield className="w-5 h-5" />
            الصلاحيات ({permissions.filter(p => p.is_granted).length})
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
        {activeTab === 'staff' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">موظفي القسم</h3>
              <button className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg font-bold transition-all flex items-center gap-2">
                <Plus className="w-4 h-4" />
                إضافة موظف
              </button>
            </div>

            {staff.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                لا يوجد موظفين في هذا القسم
              </div>
            ) : (
              <div className="space-y-2">
                {staff.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <Users className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <div className="text-white font-bold">{member.staff.full_name}</div>
                        <div className="text-gray-400 text-sm">{member.staff.staff_code}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-lg text-sm font-bold">
                        {member.staff.role}
                      </span>
                      <button
                        onClick={() => handleRemoveStaff(member.id)}
                        className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'permissions' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">صلاحيات القسم</h3>
              <button className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg font-bold transition-all flex items-center gap-2">
                <Plus className="w-4 h-4" />
                إضافة صلاحية
              </button>
            </div>

            {permissions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                لا توجد صلاحيات محددة لهذا القسم
              </div>
            ) : (
              <div className="space-y-2">
                {permissions.map((perm) => (
                  <div
                    key={perm.id}
                    className="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          perm.is_granted
                            ? 'bg-green-500/20'
                            : 'bg-gray-500/20'
                        }`}
                      >
                        <Shield
                          className={`w-5 h-5 ${
                            perm.is_granted ? 'text-green-400' : 'text-gray-400'
                          }`}
                        />
                      </div>
                      <div>
                        <div className="text-white font-bold">{perm.permission_name_ar}</div>
                        <div className="text-gray-400 text-sm">{perm.permission_key}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleTogglePermission(perm.id, perm.is_granted)}
                      className={`px-4 py-2 rounded-lg font-bold transition-all ${
                        perm.is_granted
                          ? 'bg-green-500/20 text-green-300 hover:bg-green-500/30'
                          : 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30'
                      }`}
                    >
                      {perm.is_granted ? 'ممنوحة' : 'معطلة'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
