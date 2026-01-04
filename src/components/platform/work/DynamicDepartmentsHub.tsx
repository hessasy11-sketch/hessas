import { useState, useEffect } from 'react';
import { Building2, Plus, Settings, Users, Shield, Link, BarChart3, Zap, Trash2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { CreateDepartmentModal } from './CreateDepartmentModal';
import { DepartmentDetailsView } from './DepartmentDetailsView';
import { SystemIntegrationsView } from './SystemIntegrationsView';
import { adminSessionManager } from '../../../utils/adminSessionManager';

interface Department {
  id: string;
  name_ar: string;
  name_en: string;
  code: string;
  description: string;
  icon: string;
  color: string;
  linked_system: string;
  system_access_level: string;
  is_active: boolean;
  staff_count?: number;
  tasks_count?: number;
  integrations_count?: number;
}

export function DynamicDepartmentsHub() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [activeView, setActiveView] = useState<'list' | 'details' | 'integrations'>('list');
  const [loading, setLoading] = useState(true);
  const [canDeleteDepartments, setCanDeleteDepartments] = useState(false);

  useEffect(() => {
    loadDepartments();
    checkDeletePermission();
  }, []);

  const checkDeletePermission = async () => {
    try {
      const session = adminSessionManager.getSession();
      if (!session) {
        setCanDeleteDepartments(false);
        return;
      }

      if (session.is_super_admin || session.is_platform_owner) {
        setCanDeleteDepartments(true);
        return;
      }

      const { data } = await supabase
        .from('department_permissions')
        .select('*')
        .eq('permission_key', 'delete_any_department')
        .eq('is_granted', true)
        .maybeSingle();

      setCanDeleteDepartments(!!data);
    } catch (error) {
      console.error('Error checking delete permission:', error);
      setCanDeleteDepartments(false);
    }
  };

  const loadDepartments = async () => {
    try {
      console.log('Loading departments...');

      const { data, error } = await supabase
        .from('platform_departments')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('Departments query result:', { data, error, count: data?.length });

      if (error) {
        console.error('Error loading departments:', error);
        throw error;
      }

      const deptsWithStats = await Promise.all(
        (data || []).map(async (dept) => {
          const [staffCount, tasksCount, integrationsCount] = await Promise.all([
            supabase
              .from('department_staff_assignments')
              .select('id', { count: 'exact', head: true })
              .eq('department_id', dept.id),
            supabase
              .from('department_tasks')
              .select('id', { count: 'exact', head: true })
              .eq('department_id', dept.id),
            supabase
              .from('system_integrations')
              .select('id', { count: 'exact', head: true })
              .eq('department_id', dept.id)
          ]);

          return {
            ...dept,
            staff_count: staffCount.count || 0,
            tasks_count: tasksCount.count || 0,
            integrations_count: integrationsCount.count || 0
          };
        })
      );

      console.log('Departments with stats:', deptsWithStats);
      setDepartments(deptsWithStats);
    } catch (error) {
      console.error('Error loading departments:', error);
      alert('خطأ في تحميل الأقسام: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDepartment = async (deptId: string, deptName: string) => {
    if (!canDeleteDepartments) {
      alert('ليس لديك صلاحية حذف الأقسام');
      return;
    }

    if (!confirm(`هل أنت متأكد من حذف القسم "${deptName}"؟\n\nسيتم حذف جميع البيانات المرتبطة بهذا القسم بشكل نهائي.`)) {
      return;
    }

    try {
      await supabase
        .from('department_staff_assignments')
        .delete()
        .eq('department_id', deptId);

      await supabase
        .from('department_permissions')
        .delete()
        .eq('department_id', deptId);

      await supabase
        .from('department_tasks')
        .delete()
        .eq('department_id', deptId);

      await supabase
        .from('system_integrations')
        .delete()
        .eq('department_id', deptId);

      const { error } = await supabase
        .from('platform_departments')
        .delete()
        .eq('id', deptId);

      if (error) throw error;

      alert('تم حذف القسم بنجاح');
      loadDepartments();
    } catch (error: any) {
      console.error('Error deleting department:', error);
      alert('خطأ في حذف القسم: ' + error.message);
    }
  };

  const getSystemBadge = (system: string) => {
    const badges: Record<string, { label: string; color: string }> = {
      b2b: { label: 'مزادات الشركات', color: 'from-blue-500 to-cyan-600' },
      b2f: { label: 'استثمار المزارع', color: 'from-green-500 to-emerald-600' },
      both: { label: 'كلا النظامين', color: 'from-purple-500 to-pink-600' },
      none: { label: 'عام', color: 'from-gray-500 to-gray-600' }
    };
    return badges[system] || badges.none;
  };

  const getAccessBadge = (level: string) => {
    const badges: Record<string, { label: string; color: string }> = {
      full: { label: 'كامل', color: 'bg-green-500/20 text-green-300' },
      write: { label: 'كتابة', color: 'bg-blue-500/20 text-blue-300' },
      read: { label: 'قراءة', color: 'bg-yellow-500/20 text-yellow-300' },
      none: { label: 'بدون', color: 'bg-gray-500/20 text-gray-400' }
    };
    return badges[level] || badges.none;
  };

  if (activeView === 'details' && selectedDept) {
    return (
      <DepartmentDetailsView
        department={selectedDept}
        onBack={() => {
          setActiveView('list');
          setSelectedDept(null);
          loadDepartments();
        }}
      />
    );
  }

  if (activeView === 'integrations' && selectedDept) {
    return (
      <SystemIntegrationsView
        department={selectedDept}
        onBack={() => {
          setActiveView('list');
          setSelectedDept(null);
          loadDepartments();
        }}
      />
    );
  }

  if (loading) {
    return <div className="text-white text-center py-8">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white flex items-center gap-3">
            <Building2 className="w-8 h-8 text-blue-400" />
            الأقسام الديناميكية
          </h2>
          <p className="text-gray-400 mt-2">
            إدارة شاملة للأقسام والصلاحيات والربط مع الأنظمة
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg"
        >
          <Plus className="w-5 h-5" />
          قسم جديد
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500/20 to-cyan-600/10 border border-blue-500/30 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-2">
            <Building2 className="w-8 h-8 text-blue-400" />
            <span className="text-3xl font-bold text-white">{departments.length}</span>
          </div>
          <div className="text-blue-300 font-bold">إجمالي الأقسام</div>
        </div>

        <div className="bg-gradient-to-br from-green-500/20 to-emerald-600/10 border border-green-500/30 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-8 h-8 text-green-400" />
            <span className="text-3xl font-bold text-white">
              {departments.reduce((acc, d) => acc + (d.staff_count || 0), 0)}
            </span>
          </div>
          <div className="text-green-300 font-bold">إجمالي الموظفين</div>
        </div>

        <div className="bg-gradient-to-br from-purple-500/20 to-pink-600/10 border border-purple-500/30 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-2">
            <Zap className="w-8 h-8 text-purple-400" />
            <span className="text-3xl font-bold text-white">
              {departments.reduce((acc, d) => acc + (d.tasks_count || 0), 0)}
            </span>
          </div>
          <div className="text-purple-300 font-bold">إجمالي المهام</div>
        </div>

        <div className="bg-gradient-to-br from-orange-500/20 to-red-600/10 border border-orange-500/30 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-2">
            <Link className="w-8 h-8 text-orange-400" />
            <span className="text-3xl font-bold text-white">
              {departments.reduce((acc, d) => acc + (d.integrations_count || 0), 0)}
            </span>
          </div>
          <div className="text-orange-300 font-bold">الربط مع الأنظمة</div>
        </div>
      </div>

      {/* Departments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {departments.map((dept) => {
          const systemBadge = getSystemBadge(dept.linked_system);
          const accessBadge = getAccessBadge(dept.system_access_level);

          return (
            <div
              key={dept.id}
              className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 hover:bg-white/10 transition-all cursor-pointer group"
              onClick={() => {
                setSelectedDept(dept);
                setActiveView('details');
              }}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: dept.color || '#3b82f6' }}
                >
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <div
                  className={`px-3 py-1 rounded-lg text-xs font-bold ${
                    dept.is_active
                      ? 'bg-green-500/20 text-green-300'
                      : 'bg-gray-500/20 text-gray-400'
                  }`}
                >
                  {dept.is_active ? 'نشط' : 'معطل'}
                </div>
              </div>

              {/* Info */}
              <div className="mb-4">
                <h3 className="text-xl font-bold text-white mb-1">{dept.name_ar}</h3>
                <p className="text-gray-400 text-sm mb-2">{dept.code}</p>
                <p className="text-gray-500 text-xs line-clamp-2">{dept.description}</p>
              </div>

              {/* System Badge */}
              <div className="mb-4">
                <div
                  className={`inline-block px-3 py-1 rounded-lg text-xs font-bold bg-gradient-to-r ${systemBadge.color} text-white`}
                >
                  {systemBadge.label}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{dept.staff_count}</div>
                  <div className="text-xs text-gray-400">موظف</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{dept.tasks_count}</div>
                  <div className="text-xs text-gray-400">مهمة</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{dept.integrations_count}</div>
                  <div className="text-xs text-gray-400">ربط</div>
                </div>
              </div>

              {/* Access Level */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">مستوى الوصول:</span>
                <span className={`px-2 py-1 rounded text-xs font-bold ${accessBadge.color}`}>
                  {accessBadge.label}
                </span>
              </div>

              {/* Actions */}
              <div className={`grid ${canDeleteDepartments ? 'grid-cols-4' : 'grid-cols-3'} gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity`}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedDept(dept);
                    setActiveView('details');
                  }}
                  className="px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1"
                >
                  <Settings className="w-3 h-3" />
                  تفاصيل
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedDept(dept);
                    setActiveView('integrations');
                  }}
                  className="px-3 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1"
                >
                  <Link className="w-3 h-3" />
                  الأنظمة
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  className="px-3 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1"
                >
                  <BarChart3 className="w-3 h-3" />
                  تقارير
                </button>
                {canDeleteDepartments && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteDepartment(dept.id, dept.name_ar);
                    }}
                    className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    حذف
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {departments.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg">لا توجد أقسام حالياً</p>
          <p className="text-gray-500 text-sm">أنشئ قسم جديد للبدء</p>
        </div>
      )}

      {showCreateModal && (
        <CreateDepartmentModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadDepartments();
          }}
        />
      )}
    </div>
  );
}
