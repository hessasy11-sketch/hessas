import { useState, useEffect } from 'react';
import { Briefcase, Plus, Edit2, Trash2, Lock, Unlock, Users, Eye, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface WorkScenario {
  id: string;
  name: string;
  description: string | null;
  department: 'hq' | 'b2b' | 'b2f' | 'farm_ops';
  login_method: 'qr_only' | 'qr_pin';
  requires_pin: boolean;
  session_policy: string;
  scope_type: 'platform' | 'department' | 'farm';
  allowed_modules: string[];
  allowed_actions: string[];
  landing_route: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ScenarioFormData {
  name: string;
  description: string;
  department: string;
  login_method: string;
  requires_pin: boolean;
  session_policy: string;
  scope_type: string;
  allowed_modules: string[];
  allowed_actions: string[];
  landing_route: string;
  is_active: boolean;
}

const DEPARTMENT_OPTIONS = [
  { value: 'hq', label: 'الإدارة العليا' },
  { value: 'b2b', label: 'مزادات الشركات' },
  { value: 'b2f', label: 'استثمار المزارع' },
  { value: 'farm_ops', label: 'عمليات المزارع' }
];

const SCOPE_OPTIONS = [
  { value: 'platform', label: 'المنصة الكاملة' },
  { value: 'department', label: 'قسم محدد' },
  { value: 'farm', label: 'مزرعة محددة' }
];

const MODULE_OPTIONS = [
  { value: 'hq_dashboard', label: 'لوحة الإدارة العليا' },
  { value: 'scenario_generator', label: 'مولد السيناريوهات' },
  { value: 'staff_management', label: 'إدارة الموظفين' },
  { value: 'auctions_management', label: 'إدارة المزادات' },
  { value: 'b2f_dashboard', label: 'لوحة استثمار المزارع' },
  { value: 'farm_operations', label: 'عمليات المزارع' },
  { value: 'my_tasks', label: 'مهامي' },
  { value: 'contracts', label: 'العقود' },
  { value: 'payments', label: 'المدفوعات' },
  { value: 'reports', label: 'التقارير' },
  { value: 'settings', label: 'الإعدادات' }
];

const ACTION_OPTIONS = [
  { value: 'create', label: 'إنشاء' },
  { value: 'read', label: 'قراءة' },
  { value: 'update', label: 'تحديث' },
  { value: 'delete', label: 'حذف' },
  { value: 'approve', label: 'موافقة' },
  { value: 'reject', label: 'رفض' },
  { value: 'assign', label: 'تعيين' },
  { value: 'view_reports', label: 'عرض التقارير' }
];

export default function ScenarioGeneratorView() {
  const [scenarios, setScenarios] = useState<WorkScenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ScenarioFormData>({
    name: '',
    description: '',
    department: 'hq',
    login_method: 'qr_pin',
    requires_pin: true,
    session_policy: 'idle_30m',
    scope_type: 'platform',
    allowed_modules: [],
    allowed_actions: [],
    landing_route: '/hq',
    is_active: true
  });

  useEffect(() => {
    loadScenarios();
  }, []);

  const loadScenarios = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('work_scenarios')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setScenarios(data || []);
    } catch (error) {
      console.error('Error loading scenarios:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingId) {
        const { error } = await supabase
          .from('work_scenarios')
          .update(formData)
          .eq('id', editingId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('work_scenarios')
          .insert([formData]);

        if (error) throw error;
      }

      setShowForm(false);
      setEditingId(null);
      resetForm();
      loadScenarios();
    } catch (error) {
      console.error('Error saving scenario:', error);
      alert('حدث خطأ أثناء حفظ السيناريو');
    }
  };

  const handleEdit = (scenario: WorkScenario) => {
    setFormData({
      name: scenario.name,
      description: scenario.description || '',
      department: scenario.department,
      login_method: scenario.login_method,
      requires_pin: scenario.requires_pin,
      session_policy: scenario.session_policy,
      scope_type: scenario.scope_type,
      allowed_modules: scenario.allowed_modules,
      allowed_actions: scenario.allowed_actions,
      landing_route: scenario.landing_route,
      is_active: scenario.is_active
    });
    setEditingId(scenario.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا السيناريو؟')) return;

    try {
      const { error } = await supabase
        .from('work_scenarios')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadScenarios();
    } catch (error) {
      console.error('Error deleting scenario:', error);
      alert('حدث خطأ أثناء حذف السيناريو');
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('work_scenarios')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      loadScenarios();
    } catch (error) {
      console.error('Error toggling scenario:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      department: 'hq',
      login_method: 'qr_pin',
      requires_pin: true,
      session_policy: 'idle_30m',
      scope_type: 'platform',
      allowed_modules: [],
      allowed_actions: [],
      landing_route: '/hq',
      is_active: true
    });
  };

  const toggleModule = (module: string) => {
    setFormData(prev => ({
      ...prev,
      allowed_modules: prev.allowed_modules.includes(module)
        ? prev.allowed_modules.filter(m => m !== module)
        : [...prev.allowed_modules, module]
    }));
  };

  const toggleAction = (action: string) => {
    setFormData(prev => ({
      ...prev,
      allowed_actions: prev.allowed_actions.includes(action)
        ? prev.allowed_actions.filter(a => a !== action)
        : [...prev.allowed_actions, action]
    }));
  };

  const getDepartmentColor = (dept: string) => {
    switch (dept) {
      case 'hq': return 'from-purple-500 to-indigo-600';
      case 'b2b': return 'from-blue-500 to-cyan-600';
      case 'b2f': return 'from-emerald-500 to-teal-600';
      case 'farm_ops': return 'from-orange-500 to-amber-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-white">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
            <Briefcase className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">مولّد السيناريوهات</h2>
            <p className="text-gray-400 text-sm">إدارة سيناريوهات العمل والصلاحيات</p>
          </div>
        </div>

        <button
          onClick={() => {
            resetForm();
            setEditingId(null);
            setShowForm(true);
          }}
          className="px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl font-bold hover:shadow-lg transition-all flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          سيناريو جديد
        </button>
      </div>

      {showForm && (
        <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-6">
          <h3 className="text-xl font-bold text-white mb-6">
            {editingId ? 'تعديل السيناريو' : 'إنشاء سيناريو جديد'}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-white font-bold mb-2">اسم السيناريو</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-white font-bold mb-2">القسم</label>
                <select
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white"
                >
                  {DEPARTMENT_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-white font-bold mb-2">نوع الدخول</label>
                <select
                  value={formData.login_method}
                  onChange={(e) => setFormData({
                    ...formData,
                    login_method: e.target.value,
                    requires_pin: e.target.value === 'qr_pin'
                  })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white"
                >
                  <option value="qr_only">QR فقط</option>
                  <option value="qr_pin">QR + PIN</option>
                </select>
              </div>

              <div>
                <label className="block text-white font-bold mb-2">نطاق العمل</label>
                <select
                  value={formData.scope_type}
                  onChange={(e) => setFormData({ ...formData, scope_type: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white"
                >
                  {SCOPE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-white font-bold mb-2">مسار الهبوط (Landing Route)</label>
                <input
                  type="text"
                  value={formData.landing_route}
                  onChange={(e) => setFormData({ ...formData, landing_route: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white"
                  placeholder="/hq أو /admin/b2f أو /admin/operations/my-tasks"
                  required
                />
                <p className="text-gray-400 text-sm mt-2">
                  المسار الذي سيتم توجيه الموظف إليه مباشرة بعد تسجيل الدخول
                </p>
              </div>

              <div className="md:col-span-2">
                <label className="block text-white font-bold mb-2">الوصف</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white"
                  rows={3}
                />
              </div>
            </div>

            <div>
              <label className="block text-white font-bold mb-3">الوحدات المسموحة</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {MODULE_OPTIONS.map(module => (
                  <label key={module.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.allowed_modules.includes(module.value)}
                      onChange={() => toggleModule(module.value)}
                      className="w-4 h-4"
                    />
                    <span className="text-white text-sm">{module.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-white font-bold mb-3">الإجراءات المسموحة</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {ACTION_OPTIONS.map(action => (
                  <label key={action.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.allowed_actions.includes(action.value)}
                      onChange={() => toggleAction(action.value)}
                      className="w-4 h-4"
                    />
                    <span className="text-white text-sm">{action.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-5 h-5"
              />
              <label className="text-white font-bold">تفعيل السيناريو</label>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-bold hover:shadow-lg transition-all"
              >
                {editingId ? 'تحديث' : 'إنشاء'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  resetForm();
                }}
                className="px-6 py-3 bg-white/5 border border-white/10 text-white rounded-xl font-bold hover:bg-white/10 transition-all"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {scenarios.map((scenario) => (
          <div
            key={scenario.id}
            className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-6 hover:bg-white/10 transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-4">
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${getDepartmentColor(scenario.department)} flex items-center justify-center flex-shrink-0`}>
                  <Briefcase className="w-7 h-7 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-white">{scenario.name}</h3>
                    {scenario.is_active ? (
                      <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-bold">نشط</span>
                    ) : (
                      <span className="px-3 py-1 bg-gray-500/20 text-gray-400 rounded-lg text-xs font-bold">غير نشط</span>
                    )}
                  </div>
                  <p className="text-gray-400 text-sm mb-3">{scenario.description}</p>

                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-xs font-bold">
                      {DEPARTMENT_OPTIONS.find(d => d.value === scenario.department)?.label}
                    </span>
                    <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-lg text-xs font-bold flex items-center gap-1">
                      {scenario.requires_pin ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                      {scenario.login_method === 'qr_pin' ? 'QR + PIN' : 'QR فقط'}
                    </span>
                    <span className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded-lg text-xs font-bold">
                      {SCOPE_OPTIONS.find(s => s.value === scenario.scope_type)?.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                    <Eye className="w-4 h-4" />
                    <span className="font-bold">المسار:</span>
                    <code className="px-2 py-1 bg-white/5 rounded text-emerald-400">{scenario.landing_route}</code>
                  </div>

                  <div className="flex items-center gap-2 text-gray-400 text-sm">
                    <Users className="w-4 h-4" />
                    <span>{scenario.allowed_modules.length} وحدة</span>
                    <span className="text-gray-600">•</span>
                    <span>{scenario.allowed_actions.length} إجراء</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => toggleActive(scenario.id, scenario.is_active)}
                  className={`p-2 rounded-lg transition-all ${
                    scenario.is_active
                      ? 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30'
                      : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                  }`}
                  title={scenario.is_active ? 'تعطيل' : 'تفعيل'}
                >
                  {scenario.is_active ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
                </button>
                <button
                  onClick={() => handleEdit(scenario)}
                  className="p-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-all"
                  title="تعديل"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleDelete(scenario.id)}
                  className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-all"
                  title="حذف"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {scenarios.length === 0 && (
          <div className="text-center py-12 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10">
            <div className="w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-purple-400" />
            </div>
            <p className="text-gray-400 text-lg">لا توجد سيناريوهات</p>
            <p className="text-gray-500 text-sm mt-2">قم بإنشاء سيناريو جديد للبدء</p>
          </div>
        )}
      </div>
    </div>
  );
}
