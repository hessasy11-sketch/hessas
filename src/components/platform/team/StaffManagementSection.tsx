import { useState, useEffect } from 'react';
import {
  UserPlus,
  Edit3,
  Power,
  PowerOff,
  Search,
  Phone,
  Mail,
  Shield,
  Building,
  User,
  Check,
  X,
  RefreshCw
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface StaffMember {
  id: string;
  user_id: string | null;
  phone_number: string;
  full_name: string;
  email: string | null;
  role: string;
  department: string;
  reports_to: string | null;
  is_active: boolean;
  qr_code: string | null;
  requires_pin: boolean;
  created_at: string;
}

interface StaffManagementSectionProps {
  onStaffUpdated: () => void;
}

export default function StaffManagementSection({ onStaffUpdated }: StaffManagementSectionProps) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [filteredStaff, setFilteredStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterDepartment, setFilterDepartment] = useState<string>('all');

  useEffect(() => {
    loadStaff();
  }, []);

  useEffect(() => {
    filterStaffList();
  }, [searchTerm, filterDepartment, staff]);

  const loadStaff = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('platform_staff')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setStaff(data || []);
    } catch (error) {
      console.error('Error loading staff:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterStaffList = () => {
    let filtered = staff;

    if (searchTerm) {
      filtered = filtered.filter(
        (member) =>
          member.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          member.phone_number.includes(searchTerm) ||
          (member.email && member.email.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (filterDepartment !== 'all') {
      filtered = filtered.filter((member) => member.department === filterDepartment);
    }

    setFilteredStaff(filtered);
  };

  const toggleStaffStatus = async (staffId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('platform_staff')
        .update({ is_active: !currentStatus })
        .eq('id', staffId);

      if (error) throw error;

      await loadStaff();
      onStaffUpdated();
    } catch (error) {
      console.error('Error toggling staff status:', error);
      alert('فشل تحديث حالة الموظف');
    }
  };

  const getDepartmentBadge = (department: string) => {
    const badges: Record<string, { color: string; label: string }> = {
      b2b: { color: 'from-blue-500 to-blue-600', label: 'المزادات' },
      b2f: { color: 'from-emerald-500 to-emerald-600', label: 'استثمار المزارع' },
      hq: { color: 'from-purple-500 to-purple-600', label: 'الإدارة العليا' },
    };

    const badge = badges[department] || { color: 'from-gray-500 to-gray-600', label: department };

    return (
      <span className={`px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r ${badge.color} text-white shadow-sm`}>
        {badge.label}
      </span>
    );
  };

  const getRoleBadge = (role: string) => {
    const roles: Record<string, string> = {
      super_admin: 'مدير عام',
      admin: 'مدير',
      manager: 'مشرف',
      staff: 'موظف',
      sales: 'مبيعات',
      operations: 'عمليات',
      finance: 'مالية',
    };

    return roles[role] || role;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin text-blue-400 mx-auto mb-4" />
          <p className="text-white font-medium">جاري تحميل الموظفين...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-[300px]">
          <div className="relative">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="بحث بالاسم، الجوال، أو البريد..."
              className="w-full pr-12 pl-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
            className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">كل الأقسام</option>
            <option value="b2b">المزادات (B2B)</option>
            <option value="b2f">استثمار المزارع (B2F)</option>
            <option value="hq">الإدارة العليا (HQ)</option>
          </select>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg"
          >
            <UserPlus className="w-5 h-5" />
            إضافة موظف
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredStaff.map((member) => (
          <div
            key={member.id}
            className="bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/10 transition-all"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${
                  member.is_active ? 'from-emerald-500 to-teal-600' : 'from-gray-500 to-gray-600'
                } flex items-center justify-center flex-shrink-0`}>
                  <User className="w-6 h-6 text-white" />
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-white font-bold text-lg">{member.full_name}</h3>
                    {getDepartmentBadge(member.department)}
                    <span className="px-2 py-1 rounded-lg text-xs font-bold bg-white/10 text-gray-300">
                      {getRoleBadge(member.role)}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      {member.phone_number}
                    </div>
                    {member.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        {member.email}
                      </div>
                    )}
                    {member.qr_code ? (
                      <div className="flex items-center gap-2 text-emerald-400">
                        <Check className="w-4 h-4" />
                        باركود مفعّل
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-orange-400">
                        <X className="w-4 h-4" />
                        بدون باركود
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleStaffStatus(member.id, member.is_active)}
                  className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 ${
                    member.is_active
                      ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                      : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                  }`}
                >
                  {member.is_active ? (
                    <>
                      <PowerOff className="w-4 h-4" />
                      تعطيل
                    </>
                  ) : (
                    <>
                      <Power className="w-4 h-4" />
                      تفعيل
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredStaff.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-full bg-gray-500/10 flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-400">لا توجد نتائج</p>
          <p className="text-gray-500 text-sm mt-1">جرب تغيير معايير البحث</p>
        </div>
      )}

      {showAddModal && (
        <AddStaffModal
          onClose={() => setShowAddModal(false)}
          onAdded={() => {
            setShowAddModal(false);
            loadStaff();
            onStaffUpdated();
          }}
        />
      )}
    </div>
  );
}

interface AddStaffModalProps {
  onClose: () => void;
  onAdded: () => void;
}

function AddStaffModal({ onClose, onAdded }: AddStaffModalProps) {
  const [formData, setFormData] = useState({
    phone_number: '',
    full_name: '',
    email: '',
    role: 'staff',
    department: 'b2b',
    reports_to: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.phone_number || !formData.full_name) {
      alert('رقم الجوال والاسم مطلوبان');
      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase.from('platform_staff').insert([
        {
          phone_number: formData.phone_number,
          full_name: formData.full_name,
          email: formData.email || null,
          role: formData.role,
          department: formData.department,
          reports_to: formData.reports_to || null,
          is_active: true,
        },
      ]);

      if (error) throw error;

      onAdded();
    } catch (error: any) {
      console.error('Error adding staff:', error);
      alert(error.message || 'فشل إضافة الموظف');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl max-w-2xl w-full border border-white/10 shadow-2xl">
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-4 rounded-t-2xl flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">إضافة موظف جديد</h2>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-300 mb-2">رقم الجوال *</label>
              <input
                type="tel"
                value={formData.phone_number}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                placeholder="05xxxxxxxx"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-300 mb-2">الاسم الكامل *</label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="مثال: أحمد محمد"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-300 mb-2">البريد الإلكتروني</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="example@domain.com"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-300 mb-2">المسمى الوظيفي</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="staff">موظف</option>
                <option value="manager">مشرف</option>
                <option value="admin">مدير</option>
                <option value="sales">مبيعات</option>
                <option value="operations">عمليات</option>
                <option value="finance">مالية</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-300 mb-2">القسم</label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="b2b">المزادات (B2B)</option>
                <option value="b2f">استثمار المزارع (B2F)</option>
                <option value="hq">الإدارة العليا (HQ)</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-white/10">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white px-6 py-3 rounded-xl font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <UserPlus className="w-5 h-5" />
              {saving ? 'جاري الإضافة...' : 'إضافة موظف'}
            </button>

            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-all disabled:opacity-50"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
