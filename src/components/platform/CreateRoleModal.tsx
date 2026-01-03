import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Briefcase, Building, FileText, Shield, ChevronLeft, ChevronRight } from 'lucide-react';

interface CreateRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const permissionLevels = [
  { value: 'read', label: 'قراءة فقط', color: 'gray', description: 'عرض البيانات فقط' },
  { value: 'execute', label: 'تنفيذ', color: 'green', description: 'إجراء العمليات الأساسية' },
  { value: 'approve', label: 'اعتماد', color: 'blue', description: 'مراجعة واعتماد العمليات' },
  { value: 'manage', label: 'إدارة كاملة', color: 'purple', description: 'صلاحيات إدارية شاملة' }
];

export default function CreateRoleModal({ isOpen, onClose, onSuccess }: CreateRoleModalProps) {
  const [loading, setLoading] = useState(false);
  const [roleName, setRoleName] = useState('');
  const [department, setDepartment] = useState('');
  const [permissionLevel, setPermissionLevel] = useState<'read' | 'execute' | 'approve' | 'manage'>('read');
  const [description, setDescription] = useState('');
  const [canViewReports, setCanViewReports] = useState(false);
  const [canExportData, setCanExportData] = useState(false);
  const [canManageSettings, setCanManageSettings] = useState(false);
  const [canAccessFinance, setCanAccessFinance] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName || !department) return;

    setLoading(true);
    try {
      const permissions = {
        view_reports: canViewReports,
        export_data: canExportData,
        manage_settings: canManageSettings,
        access_finance: canAccessFinance,
        permission_level: permissionLevel
      };

      const { data, error } = await supabase
        .from('roles_catalog')
        .insert({
          role_name: roleName,
          department,
          permission_level: permissionLevel,
          description: description || null,
          permissions,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      await supabase.rpc('log_platform_action', {
        p_action_type: 'create_role',
        p_target_type: 'role',
        p_target_id: data.id,
        p_changes: {
          role_name: roleName,
          department,
          permission_level: permissionLevel
        }
      });

      onSuccess();
      resetForm();
      onClose();
    } catch (error) {
      console.error('Error creating role:', error);
      alert('حدث خطأ أثناء إنشاء الدور');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setRoleName('');
    setDepartment('');
    setPermissionLevel('read');
    setDescription('');
    setCanViewReports(false);
    setCanExportData(false);
    setCanManageSettings(false);
    setCanAccessFinance(false);
  };

  const getCurrentLevelIndex = () => {
    return permissionLevels.findIndex(l => l.value === permissionLevel);
  };

  const setLevelByIndex = (index: number) => {
    if (index >= 0 && index < permissionLevels.length) {
      setPermissionLevel(permissionLevels[index].value as any);
    }
  };

  if (!isOpen) return null;

  const currentLevel = permissionLevels[getCurrentLevelIndex()];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Briefcase className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold">إنشاء دور جديد</h2>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              اسم الدور
            </label>
            <input
              type="text"
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              placeholder="مثال: مدير عمليات، مشرف مبيعات"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <Building className="w-4 h-4" />
              القسم
            </label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              required
            >
              <option value="">اختر القسم</option>
              <option value="HQ">الإدارة العليا</option>
              <option value="B2F">B2F</option>
              <option value="B2B">B2B</option>
              <option value="Support">الدعم</option>
              <option value="Finance">المالية</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              مستوى الصلاحية
            </label>

            <div className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-2xl p-6">
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <button
                    type="button"
                    onClick={() => setLevelByIndex(getCurrentLevelIndex() - 1)}
                    disabled={getCurrentLevelIndex() === 0}
                    className="w-10 h-10 bg-white rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    <ChevronRight className="w-5 h-5 text-gray-700" />
                  </button>

                  <div className="flex-1 mx-4 text-center">
                    <div className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-${currentLevel.color}-100 border-2 border-${currentLevel.color}-300`}>
                      <Shield className={`w-5 h-5 text-${currentLevel.color}-600`} />
                      <span className={`font-bold text-lg text-${currentLevel.color}-700`}>
                        {currentLevel.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">{currentLevel.description}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setLevelByIndex(getCurrentLevelIndex() + 1)}
                    disabled={getCurrentLevelIndex() === permissionLevels.length - 1}
                    className="w-10 h-10 bg-white rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-700" />
                  </button>
                </div>

                <div className="flex justify-between px-12">
                  {permissionLevels.map((level, index) => (
                    <button
                      key={level.value}
                      type="button"
                      onClick={() => setPermissionLevel(level.value as any)}
                      className={`w-3 h-3 rounded-full transition-all ${
                        index <= getCurrentLevelIndex()
                          ? `bg-${currentLevel.color}-500`
                          : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              وصف الدور
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="اكتب وصفاً للدور ومسؤولياته..."
              rows={3}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-3">
              صلاحيات إضافية
            </label>
            <div className="bg-slate-50 rounded-xl p-4 space-y-3">
              <label className="flex items-center gap-3 p-3 bg-white rounded-lg hover:bg-slate-100 cursor-pointer transition-all">
                <input
                  type="checkbox"
                  checked={canViewReports}
                  onChange={(e) => setCanViewReports(e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">عرض التقارير</p>
                  <p className="text-xs text-gray-500">الوصول لتقارير الأداء والإحصائيات</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-white rounded-lg hover:bg-slate-100 cursor-pointer transition-all">
                <input
                  type="checkbox"
                  checked={canExportData}
                  onChange={(e) => setCanExportData(e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">تصدير البيانات</p>
                  <p className="text-xs text-gray-500">تنزيل البيانات بصيغ مختلفة</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-white rounded-lg hover:bg-slate-100 cursor-pointer transition-all">
                <input
                  type="checkbox"
                  checked={canManageSettings}
                  onChange={(e) => setCanManageSettings(e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">إدارة الإعدادات</p>
                  <p className="text-xs text-gray-500">تعديل إعدادات القسم</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-white rounded-lg hover:bg-slate-100 cursor-pointer transition-all">
                <input
                  type="checkbox"
                  checked={canAccessFinance}
                  onChange={(e) => setCanAccessFinance(e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">الوصول للبيانات المالية</p>
                  <p className="text-xs text-gray-500">عرض التقارير المالية والإيرادات</p>
                </div>
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t-2 border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-all"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading || !roleName || !department}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'جاري الإنشاء...' : 'إنشاء الدور'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
