import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, User, Briefcase, Building, FileText, Users as UsersIcon, MapPin } from 'lucide-react';

interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  presetManagerId?: string | null;
}

interface Role {
  id: string;
  role_name: string;
  department: string;
  permission_level: string;
}

interface Farm {
  id: string;
  name: string;
}

interface Manager {
  id: string;
  display_name: string;
  department: string;
}

export default function AddEmployeeModal({ isOpen, onClose, onSuccess, presetManagerId }: AddEmployeeModalProps) {
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [department, setDepartment] = useState('');
  const [roleId, setRoleId] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [managerUserId, setManagerUserId] = useState('');
  const [selectedFarms, setSelectedFarms] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadRoles();
      loadFarms();
      loadManagers();
      if (presetManagerId) {
        setManagerUserId(presetManagerId);
      }
    }
  }, [isOpen, presetManagerId]);

  useEffect(() => {
    if (department) {
      const filteredRoles = roles.filter(r => r.department === department);
      if (filteredRoles.length > 0 && !roleId) {
        setRoleId(filteredRoles[0].id);
      }
    }
  }, [department, roles]);

  const loadRoles = async () => {
    const { data } = await supabase
      .from('roles_catalog')
      .select('*')
      .eq('is_active', true)
      .order('role_name');
    if (data) setRoles(data);
  };

  const loadFarms = async () => {
    const { data } = await supabase
      .from('b2f_farms')
      .select('id, name')
      .eq('is_active', true)
      .order('name');
    if (data) setFarms(data);
  };

  const loadManagers = async () => {
    const { data } = await supabase
      .from('platform_staff')
      .select(`
        user_id,
        department,
        profiles:user_id (
          id,
          display_name
        )
      `)
      .eq('is_active', true)
      .in('role', ['manager', 'supervisor']);

    if (data) {
      setManagers(data.map((m: any) => ({
        id: m.user_id,
        display_name: m.profiles?.display_name || 'غير محدد',
        department: m.department
      })));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber || !department || !roleId) return;

    setLoading(true);
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id')
        .eq('phone_number', phoneNumber)
        .maybeSingle();

      if (!profileData) {
        alert('رقم الهاتف غير مسجل في النظام');
        setLoading(false);
        return;
      }

      const selectedRole = roles.find(r => r.id === roleId);

      const { error } = await supabase
        .from('platform_staff')
        .insert({
          user_id: profileData.id,
          role: selectedRole?.role_name.split(' ')[0].toLowerCase() || 'agent',
          department,
          job_title: jobTitle || null,
          job_description: jobDescription || null,
          manager_user_id: managerUserId || null,
          scope_farms: selectedFarms.length > 0 ? selectedFarms : null,
          role_id: roleId,
          is_active: true
        });

      if (error) throw error;

      await supabase.rpc('log_platform_action', {
        p_action_type: 'create_staff',
        p_target_type: 'staff',
        p_target_id: profileData.id,
        p_changes: {
          department,
          role_id: roleId,
          job_title: jobTitle
        }
      });

      onSuccess();
      resetForm();
      onClose();
    } catch (error) {
      console.error('Error adding employee:', error);
      alert('حدث خطأ أثناء إضافة الموظف');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setPhoneNumber('');
    setDepartment('');
    setRoleId('');
    setJobTitle('');
    setJobDescription('');
    setManagerUserId('');
    setSelectedFarms([]);
  };

  const toggleFarm = (farmId: string) => {
    setSelectedFarms(prev =>
      prev.includes(farmId)
        ? prev.filter(id => id !== farmId)
        : [...prev, farmId]
    );
  };

  if (!isOpen) return null;

  const filteredRoles = roles.filter(r => r.department === department);
  const filteredManagers = managers.filter(m => m.department === department);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-slate-600 to-gray-700 text-white p-6 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <User className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold">إضافة موظف جديد</h2>
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
              <User className="w-4 h-4" />
              رقم الهاتف
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="05xxxxxxxx"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-slate-500 focus:ring-2 focus:ring-slate-200 transition-all"
              required
            />
            <p className="text-xs text-gray-500 mt-1">يجب أن يكون المستخدم مسجلاً في النظام</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                <Building className="w-4 h-4" />
                القسم
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-slate-500 focus:ring-2 focus:ring-slate-200 transition-all"
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
              <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                الدور الوظيفي
              </label>
              <select
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-slate-500 focus:ring-2 focus:ring-slate-200 transition-all"
                required
                disabled={!department}
              >
                <option value="">اختر الدور</option>
                {filteredRoles.map(role => (
                  <option key={role.id} value={role.id}>
                    {role.role_name} ({role.permission_level})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              المسمى الوظيفي
            </label>
            <input
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="مثال: مدير عمليات، مشرف مبيعات"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-slate-500 focus:ring-2 focus:ring-slate-200 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              وصف المهام
            </label>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="اكتب وصفاً للمهام والمسؤوليات..."
              rows={3}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-slate-500 focus:ring-2 focus:ring-slate-200 transition-all resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <UsersIcon className="w-4 h-4" />
              المدير المباشر
            </label>
            <select
              value={managerUserId}
              onChange={(e) => setManagerUserId(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-slate-500 focus:ring-2 focus:ring-slate-200 transition-all"
              disabled={!department}
            >
              <option value="">لا يوجد مدير مباشر</option>
              {filteredManagers.map(manager => (
                <option key={manager.id} value={manager.id}>
                  {manager.display_name}
                </option>
              ))}
            </select>
          </div>

          {department === 'B2F' && (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                نطاق العمل (المزارع)
              </label>
              <div className="bg-slate-50 rounded-xl p-4 max-h-48 overflow-y-auto space-y-2">
                {farms.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-4">لا توجد مزارع متاحة</p>
                ) : (
                  farms.map(farm => (
                    <label
                      key={farm.id}
                      className="flex items-center gap-3 p-3 bg-white rounded-lg hover:bg-slate-100 cursor-pointer transition-all"
                    >
                      <input
                        type="checkbox"
                        checked={selectedFarms.includes(farm.id)}
                        onChange={() => toggleFarm(farm.id)}
                        className="w-5 h-5 text-slate-600 rounded border-gray-300 focus:ring-slate-500"
                      />
                      <span className="text-gray-700 font-medium">{farm.name}</span>
                    </label>
                  ))
                )}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {selectedFarms.length === 0 ? 'لم يتم تحديد مزارع (الوصول لجميع المزارع)' : `تم تحديد ${selectedFarms.length} مزرعة`}
              </p>
            </div>
          )}

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
              disabled={loading || !phoneNumber || !department || !roleId}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'جاري الإضافة...' : 'إضافة موظف'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
