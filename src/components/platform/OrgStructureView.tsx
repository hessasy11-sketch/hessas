import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, Briefcase, Network, Plus, Search, Filter, Eye, Edit2, Power, PowerOff, ChevronDown, Save, X, AlertCircle, UserPlus, Activity } from 'lucide-react';
import AddEmployeeModal from './AddEmployeeModal';
import EditEmployeeModal from './EditEmployeeModal';
import CreateRoleModal from './CreateRoleModal';
import CreateTeamModal from './CreateTeamModal';
import PlatformToast, { ToastMessage } from './PlatformToast';
import OrgTreeView from './OrgTreeView';
import ReassignStaffModal from './ReassignStaffModal';
import { AuditLogsView } from './AuditLogsView';
import { TemporaryQRAlert } from './TemporaryQRAlert';

interface Staff {
  id: string;
  user_id: string;
  display_name?: string;
  phone_number?: string;
  role: string;
  role_id?: string;
  department: string;
  job_title?: string;
  job_description?: string;
  manager_user_id?: string;
  scope_farms?: string[];
  is_active: boolean;
  created_at: string;
}

interface Role {
  id: string;
  role_name: string;
  department: string;
  permission_level: string;
  description?: string;
  permissions: any;
  is_active: boolean;
}

interface AuditLog {
  id: string;
  action_type: string;
  target_type: string;
  performed_by: string;
  changes: any;
  created_at: string;
}

type Tab = 'staff' | 'roles' | 'tree' | 'audit';

export default function OrgStructureView() {
  const [activeTab, setActiveTab] = useState<Tab>('staff');
  const [staff, setStaff] = useState<Staff[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [showAddRoleModal, setShowAddRoleModal] = useState(false);
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [reassignStaffId, setReassignStaffId] = useState<string | null>(null);
  const [newEmployeeManagerId, setNewEmployeeManagerId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'staff') {
        await loadStaff();
      } else if (activeTab === 'roles') {
        await loadRoles();
      } else if (activeTab === 'tree') {
        await loadOrgTree();
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStaff = async () => {
    const { data, error } = await supabase
      .from('platform_staff')
      .select(`
        *,
        profiles:user_id (
          display_name,
          phone_number
        )
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setStaff(data.map((s: any) => ({
        ...s,
        display_name: s.profiles?.display_name,
        phone_number: s.profiles?.phone_number
      })));
    }
  };

  const loadRoles = async () => {
    const { data, error } = await supabase
      .from('roles_catalog')
      .select('*')
      .order('department', { ascending: true });

    if (!error && data) {
      setRoles(data);
    }
  };

  const loadOrgTree = async () => {
    const { data, error } = await supabase.rpc('get_org_tree');
    if (!error && data) {
      setStaff(data.staff || []);
    }
  };

  const addToast = (message: string, type: 'success' | 'error') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const handleAddEmployeeSuccess = () => {
    loadStaff();
    addToast('تم إضافة الموظف بنجاح', 'success');
  };

  const handleEditEmployeeSuccess = () => {
    loadStaff();
    setEditingStaff(null);
    addToast('تم تحديث بيانات الموظف بنجاح', 'success');
  };

  const handleCreateRoleSuccess = () => {
    loadRoles();
    addToast('تم إنشاء الدور بنجاح', 'success');
  };

  const handleCreateTeamSuccess = () => {
    loadStaff();
    addToast('تم إنشاء الفريق بنجاح', 'success');
  };

  const handleReassignSuccess = () => {
    if (activeTab === 'tree') {
      loadOrgTree();
    } else {
      loadStaff();
    }
    setReassignStaffId(null);
    setShowReassignModal(false);
    addToast('تم إعادة التعيين بنجاح', 'success');
  };

  const handleAddEmployeeUnder = (managerId: string) => {
    setNewEmployeeManagerId(managerId);
    setShowAddStaffModal(true);
  };

  const handleReassignStaff = (staffId: string) => {
    setReassignStaffId(staffId);
    setShowReassignModal(true);
  };

  const handleTreeToggleStatus = (staffId: string, currentStatus: boolean) => {
    toggleStaffStatus(staffId, currentStatus);
  };

  const toggleStaffStatus = async (staffId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('platform_staff')
      .update({ is_active: !currentStatus })
      .eq('id', staffId);

    if (!error) {
      await supabase.rpc('log_platform_action', {
        p_action_type: currentStatus ? 'deactivate_staff' : 'activate_staff',
        p_target_type: 'staff',
        p_target_id: staffId
      });
      loadStaff();
      addToast(
        currentStatus ? 'تم إيقاف الموظف بنجاح' : 'تم تفعيل الموظف بنجاح',
        'success'
      );
    } else {
      addToast('حدث خطأ أثناء تحديث الحالة', 'error');
    }
  };

  const filteredStaff = staff.filter(s => {
    const matchesSearch = s.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.phone_number?.includes(searchTerm) ||
      s.job_title?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = filterDepartment === 'all' || s.department === filterDepartment;
    return matchesSearch && matchesDepartment;
  });

  const filteredRoles = roles.filter(r => {
    const matchesSearch = r.role_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = filterDepartment === 'all' || r.department === filterDepartment;
    return matchesSearch && matchesDepartment;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-slate-100" dir="rtl">
      <TemporaryQRAlert />

      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-slate-600 to-gray-800 rounded-xl flex items-center justify-center">
              <Network className="w-7 h-7 text-white" />
            </div>
            الهيكلة والصلاحيات (الموسعة)
          </h1>
          <p className="text-gray-600 text-lg">
            إدارة شاملة للموظفين والأدوار والهيكل التنظيمي
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-lg mb-6 p-2 flex gap-2">
          <button
            onClick={() => setActiveTab('staff')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-bold transition-all ${
              activeTab === 'staff'
                ? 'bg-gradient-to-r from-slate-600 to-gray-700 text-white shadow-lg'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Users className="w-5 h-5" />
            الموظفون
          </button>
          <button
            onClick={() => setActiveTab('roles')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-bold transition-all ${
              activeTab === 'roles'
                ? 'bg-gradient-to-r from-slate-600 to-gray-700 text-white shadow-lg'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Briefcase className="w-5 h-5" />
            مصنع الأدوار
          </button>
          <button
            onClick={() => setActiveTab('tree')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-bold transition-all ${
              activeTab === 'tree'
                ? 'bg-gradient-to-r from-slate-600 to-gray-700 text-white shadow-lg'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Network className="w-5 h-5" />
            الهيكل الهرمي
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-bold transition-all ${
              activeTab === 'audit'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-lg'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Activity className="w-5 h-5" />
            نشاط الدخول
          </button>
        </div>

        {/* Search & Filters */}
        {activeTab !== 'audit' && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="بحث..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pr-12 pl-4 py-3 border-2 border-gray-200 rounded-xl focus:border-slate-500 focus:ring-2 focus:ring-slate-200 transition-all"
              />
            </div>
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="px-6 py-3 border-2 border-gray-200 rounded-xl focus:border-slate-500 focus:ring-2 focus:ring-slate-200 transition-all font-semibold"
            >
              <option value="all">كل الأقسام</option>
              <option value="HQ">الإدارة العليا</option>
              <option value="B2F">B2F</option>
              <option value="B2B">B2B</option>
              <option value="Support">الدعم</option>
              <option value="Finance">المالية</option>
            </select>
            {activeTab === 'staff' && (
              <button
                onClick={() => setShowAddStaffModal(true)}
                className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold hover:shadow-lg transition-all flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                إضافة موظف
              </button>
            )}
            {activeTab === 'roles' && (
              <button
                onClick={() => setShowAddRoleModal(true)}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-bold hover:shadow-lg transition-all flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                إنشاء دور
              </button>
            )}
            {activeTab === 'staff' && (
              <button
                onClick={() => setShowCreateTeamModal(true)}
                className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-bold hover:shadow-lg transition-all flex items-center gap-2"
              >
                <UserPlus className="w-5 h-5" />
                فريق جاهز
              </button>
            )}
          </div>
        </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600 mx-auto mb-4"></div>
            <p className="text-gray-600 font-semibold">جاري التحميل...</p>
          </div>
        ) : (
          <>
            {/* Staff Tab */}
            {activeTab === 'staff' && (
              <div className="space-y-4">
                {filteredStaff.length === 0 ? (
                  <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                    <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg font-semibold">لا يوجد موظفون</p>
                  </div>
                ) : (
                  filteredStaff.map((s) => (
                    <div key={s.id} className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-slate-500 to-gray-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                              {s.display_name?.charAt(0) || 'م'}
                            </div>
                            <div>
                              <h3 className="text-xl font-bold text-gray-900">{s.display_name || 'غير محدد'}</h3>
                              <p className="text-gray-600">{s.phone_number}</p>
                            </div>
                            <span className={`px-4 py-1.5 rounded-full text-sm font-bold ${
                              s.is_active
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {s.is_active ? 'نشط' : 'متوقف'}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-4 mb-4">
                            <div>
                              <p className="text-sm text-gray-500 mb-1">القسم</p>
                              <p className="font-bold text-gray-900">{s.department}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500 mb-1">المسمى الوظيفي</p>
                              <p className="font-bold text-gray-900">{s.job_title || '-'}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500 mb-1">الدور</p>
                              <p className="font-bold text-gray-900">{s.role}</p>
                            </div>
                          </div>
                          {s.job_description && (
                            <div className="bg-slate-50 rounded-lg p-3 mb-4">
                              <p className="text-sm text-gray-700">{s.job_description}</p>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingStaff(s)}
                            className="w-10 h-10 bg-blue-100 hover:bg-blue-200 rounded-lg flex items-center justify-center transition-all"
                          >
                            <Edit2 className="w-5 h-5 text-blue-600" />
                          </button>
                          <button
                            onClick={() => alert('معاينة ما سيراه الموظف')}
                            className="w-10 h-10 bg-purple-100 hover:bg-purple-200 rounded-lg flex items-center justify-center transition-all"
                          >
                            <Eye className="w-5 h-5 text-purple-600" />
                          </button>
                          <button
                            onClick={() => toggleStaffStatus(s.id, s.is_active)}
                            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                              s.is_active
                                ? 'bg-red-100 hover:bg-red-200'
                                : 'bg-green-100 hover:bg-green-200'
                            }`}
                          >
                            {s.is_active ? (
                              <PowerOff className="w-5 h-5 text-red-600" />
                            ) : (
                              <Power className="w-5 h-5 text-green-600" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Roles Tab */}
            {activeTab === 'roles' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredRoles.length === 0 ? (
                  <div className="col-span-2 bg-white rounded-2xl shadow-lg p-12 text-center">
                    <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg font-semibold">لا توجد أدوار</p>
                  </div>
                ) : (
                  filteredRoles.map((r) => (
                    <div key={r.id} className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-gray-900 mb-1">{r.role_name}</h3>
                          <p className="text-gray-600">{r.description}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          r.permission_level === 'manage' ? 'bg-purple-100 text-purple-700' :
                          r.permission_level === 'approve' ? 'bg-blue-100 text-blue-700' :
                          r.permission_level === 'execute' ? 'bg-green-100 text-green-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {r.permission_level}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg font-semibold">
                          {r.department}
                        </span>
                        <span className={`px-3 py-1 rounded-lg font-semibold ${
                          r.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {r.is_active ? 'نشط' : 'متوقف'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tree Tab */}
            {activeTab === 'tree' && (
              <OrgTreeView
                onAddEmployeeUnder={handleAddEmployeeUnder}
                onToggleStatus={handleTreeToggleStatus}
                onReassignStaff={handleReassignStaff}
              />
            )}

            {/* Audit Logs Tab */}
            {activeTab === 'audit' && (
              <AuditLogsView />
            )}
          </>
        )}
      </div>

      <AddEmployeeModal
        isOpen={showAddStaffModal}
        onClose={() => {
          setShowAddStaffModal(false);
          setNewEmployeeManagerId(null);
        }}
        onSuccess={handleAddEmployeeSuccess}
        presetManagerId={newEmployeeManagerId}
      />

      <EditEmployeeModal
        isOpen={!!editingStaff}
        onClose={() => setEditingStaff(null)}
        onSuccess={handleEditEmployeeSuccess}
        staff={editingStaff}
      />

      <CreateRoleModal
        isOpen={showAddRoleModal}
        onClose={() => setShowAddRoleModal(false)}
        onSuccess={handleCreateRoleSuccess}
      />

      <CreateTeamModal
        isOpen={showCreateTeamModal}
        onClose={() => setShowCreateTeamModal(false)}
        onSuccess={handleCreateTeamSuccess}
      />

      <ReassignStaffModal
        isOpen={showReassignModal}
        onClose={() => {
          setShowReassignModal(false);
          setReassignStaffId(null);
        }}
        onSuccess={handleReassignSuccess}
        staffId={reassignStaffId}
      />

      <PlatformToast toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
