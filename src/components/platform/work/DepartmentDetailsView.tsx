import { useState, useEffect } from 'react';
import { ArrowLeft, Users, Plus, Trash2, Shield, Award, X } from 'lucide-react';
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

interface AvailableStaff {
  id: string;
  full_name: string;
  staff_code: string;
  role: string;
}

export function DepartmentDetailsView({ department, onBack }: Props) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [activeTab, setActiveTab] = useState<'staff' | 'permissions'>('staff');
  const [loading, setLoading] = useState(true);
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [showAddPermissionModal, setShowAddPermissionModal] = useState(false);
  const [availableStaff, setAvailableStaff] = useState<AvailableStaff[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [newPermissionKey, setNewPermissionKey] = useState('');
  const [newPermissionNameAr, setNewPermissionNameAr] = useState('');
  const [addStaffMode, setAddStaffMode] = useState<'existing' | 'new'>('new');
  const [newStaffData, setNewStaffData] = useState({
    full_name: '',
    staff_code: '',
    role: 'employee',
    phone: '',
    email: ''
  });

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

  const loadAvailableStaff = async () => {
    try {
      const assignedStaffIds = staff.map(s => s.staff_id);

      let query = supabase
        .from('platform_staff')
        .select('id, full_name, staff_code, role')
        .order('full_name');

      if (assignedStaffIds.length > 0) {
        query = query.not('id', 'in', `(${assignedStaffIds.join(',')})`);
      }

      const { data } = await query;
      if (data) setAvailableStaff(data);
    } catch (error) {
      console.error('Error loading available staff:', error);
    }
  };

  const handleAddStaff = async () => {
    if (addStaffMode === 'existing') {
      if (!selectedStaffId) {
        alert('الرجاء اختيار موظف');
        return;
      }

      try {
        const { error } = await supabase
          .from('department_staff_assignments')
          .insert({
            department_id: department.id,
            staff_id: selectedStaffId,
            role_id: null,
            start_date: new Date().toISOString()
          });

        if (error) throw error;

        setShowAddStaffModal(false);
        setSelectedStaffId('');
        loadData();
        alert('تم إضافة الموظف بنجاح');
      } catch (error: any) {
        alert('خطأ: ' + error.message);
      }
    } else {
      if (!newStaffData.full_name || !newStaffData.staff_code) {
        alert('الرجاء إدخال الاسم والرقم الوظيفي');
        return;
      }

      try {
        const { data: newStaff, error: staffError } = await supabase
          .from('platform_staff')
          .insert({
            full_name: newStaffData.full_name,
            staff_code: newStaffData.staff_code,
            role: newStaffData.role,
            phone: newStaffData.phone || null,
            email: newStaffData.email || null,
            department: department.code,
            is_active: true
          })
          .select()
          .single();

        if (staffError) throw staffError;

        const { error: assignError } = await supabase
          .from('department_staff_assignments')
          .insert({
            department_id: department.id,
            staff_id: newStaff.id,
            role_id: null,
            start_date: new Date().toISOString()
          });

        if (assignError) throw assignError;

        setShowAddStaffModal(false);
        setNewStaffData({
          full_name: '',
          staff_code: '',
          role: 'employee',
          phone: '',
          email: ''
        });
        loadData();
        alert('تم إنشاء الموظف وإضافته للقسم بنجاح');
      } catch (error: any) {
        alert('خطأ: ' + error.message);
      }
    }
  };

  const handleAddPermission = async () => {
    if (!newPermissionKey || !newPermissionNameAr) {
      alert('الرجاء إدخال جميع البيانات');
      return;
    }

    try {
      const { error } = await supabase
        .from('department_permissions')
        .insert({
          department_id: department.id,
          permission_key: newPermissionKey,
          permission_name_ar: newPermissionNameAr,
          is_granted: true,
          granted_at: new Date().toISOString()
        });

      if (error) throw error;

      setShowAddPermissionModal(false);
      setNewPermissionKey('');
      setNewPermissionNameAr('');
      loadData();
      alert('تم إضافة الصلاحية بنجاح');
    } catch (error: any) {
      alert('خطأ: ' + error.message);
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
              <button
                onClick={() => {
                  loadAvailableStaff();
                  setShowAddStaffModal(true);
                }}
                className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg font-bold transition-all flex items-center gap-2"
              >
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
              <button
                onClick={() => setShowAddPermissionModal(true)}
                className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg font-bold transition-all flex items-center gap-2"
              >
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

      {/* Add Staff Modal */}
      {showAddStaffModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-white/10 max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">إضافة موظف للقسم</h3>
              <button
                onClick={() => {
                  setShowAddStaffModal(false);
                  setSelectedStaffId('');
                  setAddStaffMode('new');
                  setNewStaffData({
                    full_name: '',
                    staff_code: '',
                    role: 'employee',
                    phone: '',
                    email: ''
                  });
                }}
                className="p-2 hover:bg-white/10 rounded-lg transition-all"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Mode Tabs */}
            <div className="bg-white/5 rounded-xl p-1 mb-6 flex gap-1">
              <button
                onClick={() => setAddStaffMode('new')}
                className={`flex-1 px-4 py-2 rounded-lg font-bold transition-all ${
                  addStaffMode === 'new'
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                إنشاء موظف جديد
              </button>
              <button
                onClick={() => {
                  setAddStaffMode('existing');
                  loadAvailableStaff();
                }}
                className={`flex-1 px-4 py-2 rounded-lg font-bold transition-all ${
                  addStaffMode === 'existing'
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                اختيار موظف موجود
              </button>
            </div>

            <div className="space-y-4">
              {addStaffMode === 'new' ? (
                <>
                  <div>
                    <label className="block text-sm font-bold text-gray-300 mb-2">
                      الاسم الكامل *
                    </label>
                    <input
                      type="text"
                      value={newStaffData.full_name}
                      onChange={(e) => setNewStaffData({ ...newStaffData, full_name: e.target.value })}
                      placeholder="أدخل الاسم الكامل"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-300 mb-2">
                      الرقم الوظيفي *
                    </label>
                    <input
                      type="text"
                      value={newStaffData.staff_code}
                      onChange={(e) => setNewStaffData({ ...newStaffData, staff_code: e.target.value })}
                      placeholder="مثال: EMP001"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-300 mb-2">
                      الدور الوظيفي
                    </label>
                    <select
                      value={newStaffData.role}
                      onChange={(e) => setNewStaffData({ ...newStaffData, role: e.target.value })}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500 transition-all"
                    >
                      <option value="employee">موظف</option>
                      <option value="supervisor">مشرف</option>
                      <option value="manager">مدير</option>
                      <option value="admin">مسؤول</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-300 mb-2">
                      رقم الجوال (اختياري)
                    </label>
                    <input
                      type="tel"
                      value={newStaffData.phone}
                      onChange={(e) => setNewStaffData({ ...newStaffData, phone: e.target.value })}
                      placeholder="05xxxxxxxx"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-300 mb-2">
                      البريد الإلكتروني (اختياري)
                    </label>
                    <input
                      type="email"
                      value={newStaffData.email}
                      onChange={(e) => setNewStaffData({ ...newStaffData, email: e.target.value })}
                      placeholder="example@domain.com"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500 transition-all"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-sm font-bold text-gray-300 mb-2">
                    اختر الموظف
                  </label>
                  <select
                    value={selectedStaffId}
                    onChange={(e) => setSelectedStaffId(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500 transition-all"
                  >
                    <option value="">-- اختر موظف --</option>
                    {availableStaff.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.full_name} - {s.staff_code} ({s.role})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleAddStaff}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white rounded-xl font-bold transition-all"
                >
                  {addStaffMode === 'new' ? 'إنشاء وإضافة' : 'إضافة'}
                </button>
                <button
                  onClick={() => {
                    setShowAddStaffModal(false);
                    setSelectedStaffId('');
                    setAddStaffMode('new');
                    setNewStaffData({
                      full_name: '',
                      staff_code: '',
                      role: 'employee',
                      phone: '',
                      email: ''
                    });
                  }}
                  className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl font-bold transition-all"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Permission Modal */}
      {showAddPermissionModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-white/10 max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">إضافة صلاحية جديدة</h3>
              <button
                onClick={() => {
                  setShowAddPermissionModal(false);
                  setNewPermissionKey('');
                  setNewPermissionNameAr('');
                }}
                className="p-2 hover:bg-white/10 rounded-lg transition-all"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2">
                  مفتاح الصلاحية (بالإنجليزية)
                </label>
                <input
                  type="text"
                  value={newPermissionKey}
                  onChange={(e) => setNewPermissionKey(e.target.value)}
                  placeholder="مثال: view_reports"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2">
                  اسم الصلاحية (بالعربية)
                </label>
                <input
                  type="text"
                  value={newPermissionNameAr}
                  onChange={(e) => setNewPermissionNameAr(e.target.value)}
                  placeholder="مثال: عرض التقارير"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500 transition-all"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleAddPermission}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white rounded-xl font-bold transition-all"
                >
                  إضافة
                </button>
                <button
                  onClick={() => {
                    setShowAddPermissionModal(false);
                    setNewPermissionKey('');
                    setNewPermissionNameAr('');
                  }}
                  className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl font-bold transition-all"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
