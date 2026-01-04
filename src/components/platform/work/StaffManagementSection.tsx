import { useState, useEffect } from 'react';
import { Users, Plus, Edit2, Trash2, QrCode, Lock, Eye, Download, X, UserCheck } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface Staff {
  id: string;
  full_name: string;
  phone: string;
  role: string;
  role_title: string;
  department: string;
  pack_id: string;
  reports_to_staff_id: string;
  qr_code: string;
  qr_image_url: string;
  pin_code: string;
  requires_pin: boolean;
  is_active: boolean;
  pack?: { name: string };
  reports_to?: { full_name: string };
}

interface PermissionPack {
  id: string;
  name: string;
  requires_pin: boolean;
}

export function StaffManagementSection() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [packs, setPacks] = useState<PermissionPack[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [showAccessCard, setShowAccessCard] = useState<Staff | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [staffData, packsData] = await Promise.all([
        supabase
          .from('platform_staff')
          .select(`
            *,
            pack:permission_packs(name),
            reports_to:platform_staff!reports_to_staff_id(full_name)
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('permission_packs')
          .select('id, name, requires_pin')
          .eq('is_active', true)
          .order('name')
      ]);

      if (staffData.error) throw staffData.error;
      if (packsData.error) throw packsData.error;

      setStaff(staffData.data || []);
      setPacks(packsData.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteStaff = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الموظف؟')) return;

    try {
      const { error } = await supabase
        .from('platform_staff')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('Error deleting staff:', error);
      alert('حدث خطأ أثناء الحذف');
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
          <Users className="w-6 h-6 text-purple-400" />
          <h2 className="text-xl font-bold text-white">إدارة الموظفين</h2>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold transition-all flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          إضافة موظف
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {staff.map((member) => (
          <div
            key={member.id}
            className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-white font-bold text-lg mb-1">{member.full_name}</h3>
                <p className="text-gray-400 text-sm">{member.role_title}</p>
              </div>
              {member.requires_pin && (
                <Lock className="w-5 h-5 text-red-400" />
              )}
            </div>

            <div className="space-y-2 mb-4">
              <div className="text-sm text-gray-300">
                <span className="text-gray-500">القسم:</span> {member.department}
              </div>
              <div className="text-sm text-gray-300">
                <span className="text-gray-500">الحزمة:</span> {member.pack?.name || 'غير محدد'}
              </div>
              {member.reports_to && (
                <div className="text-sm text-gray-300">
                  <span className="text-gray-500">يرفع إلى:</span> {member.reports_to.full_name}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowAccessCard(member)}
                className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition-all flex items-center justify-center gap-2"
              >
                <QrCode className="w-4 h-4" />
                بطاقة الدخول
              </button>
              <button
                onClick={() => {
                  setSelectedStaff(member);
                  setShowCreateModal(true);
                }}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-all"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => deleteStaff(member.id)}
                className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {staff.length === 0 && (
          <div className="col-span-full text-center py-12">
            <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">لا يوجد موظفون</p>
            <p className="text-gray-500 text-sm mt-2">قم بإضافة موظف جديد للبدء</p>
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateStaffModal
          staff={selectedStaff}
          packs={packs}
          allStaff={staff}
          onClose={() => {
            setShowCreateModal(false);
            setSelectedStaff(null);
          }}
          onSuccess={() => {
            loadData();
            setShowCreateModal(false);
            setSelectedStaff(null);
          }}
        />
      )}

      {showAccessCard && (
        <AccessCardModal
          staff={showAccessCard}
          onClose={() => setShowAccessCard(null)}
        />
      )}
    </div>
  );
}

interface CreateStaffModalProps {
  staff: Staff | null;
  packs: PermissionPack[];
  allStaff: Staff[];
  onClose: () => void;
  onSuccess: () => void;
}

function CreateStaffModal({ staff, packs, allStaff, onClose, onSuccess }: CreateStaffModalProps) {
  const [formData, setFormData] = useState({
    full_name: staff?.full_name || '',
    phone: staff?.phone || '',
    role: staff?.role || 'staff',
    role_title: staff?.role_title || '',
    department: staff?.department || '',
    pack_id: staff?.pack_id || '',
    reports_to_staff_id: staff?.reports_to_staff_id || '',
    is_active: staff?.is_active ?? true
  });
  const [saving, setSaving] = useState(false);

  const generateQRToken = () => {
    return 'QR_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  };

  const generatePIN = () => {
    return Math.floor(1000 + Math.random() * 9000).toString();
  };

  const handleSave = async () => {
    if (!formData.full_name.trim() || !formData.phone.trim()) {
      alert('يرجى إدخال الاسم ورقم الهاتف');
      return;
    }

    if (!formData.pack_id) {
      alert('يرجى اختيار حزمة الصلاحيات');
      return;
    }

    setSaving(true);
    try {
      const selectedPack = packs.find(p => p.id === formData.pack_id);
      const requiresPin = selectedPack?.requires_pin || false;

      const staffData = {
        ...formData,
        qr_code: staff?.qr_code || generateQRToken(),
        pin_code: requiresPin ? (staff?.pin_code || generatePIN()) : null,
        requires_pin: requiresPin,
        qr_is_active: true
      };

      if (staff) {
        const { error } = await supabase
          .from('platform_staff')
          .update(staffData)
          .eq('id', staff.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('platform_staff')
          .insert([staffData]);
        if (error) throw error;
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving staff:', error);
      alert('حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" dir="rtl">
      <div className="bg-slate-800 rounded-2xl border border-white/10 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-slate-800 border-b border-white/10 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">
            {staff ? 'تعديل موظف' : 'إضافة موظف جديد'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-white font-bold mb-2">الاسم الكامل</label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white"
                placeholder="محمد أحمد"
              />
            </div>

            <div>
              <label className="block text-white font-bold mb-2">رقم الهاتف</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white"
                placeholder="05xxxxxxxx"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-white font-bold mb-2">المسمى الوظيفي</label>
              <input
                type="text"
                value={formData.role_title}
                onChange={(e) => setFormData({ ...formData, role_title: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white"
                placeholder="مثال: مدير المزادات"
              />
            </div>

            <div>
              <label className="block text-white font-bold mb-2">القسم</label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white"
                placeholder="مثال: b2b"
              />
            </div>
          </div>

          <div>
            <label className="block text-white font-bold mb-2">حزمة الصلاحيات *</label>
            <select
              value={formData.pack_id}
              onChange={(e) => setFormData({ ...formData, pack_id: e.target.value })}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white"
            >
              <option value="">اختر حزمة الصلاحيات</option>
              {packs.map((pack) => (
                <option key={pack.id} value={pack.id}>
                  {pack.name} {pack.requires_pin && '(يتطلب PIN)'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-white font-bold mb-2">المدير المباشر (اختياري)</label>
            <select
              value={formData.reports_to_staff_id}
              onChange={(e) => setFormData({ ...formData, reports_to_staff_id: e.target.value })}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white"
            >
              <option value="">لا يوجد</option>
              {allStaff
                .filter(s => s.id !== staff?.id)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name} - {s.role_title}
                  </option>
                ))}
            </select>
          </div>

          {formData.pack_id && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <UserCheck className="w-5 h-5 text-blue-400 mt-1" />
                <div>
                  <div className="text-white font-bold mb-1">معلومات مهمة</div>
                  <ul className="text-sm text-blue-300 space-y-1">
                    <li>• سيتم توليد رمز QR تلقائياً للموظف</li>
                    {packs.find(p => p.id === formData.pack_id)?.requires_pin && (
                      <li>• سيتم توليد رمز PIN (4 أرقام) تلقائياً</li>
                    )}
                    <li>• يمكن طباعة بطاقة الدخول بعد الحفظ</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-slate-800 border-t border-white/10 p-6 flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg font-bold transition-all"
          >
            {saving ? 'جاري الحفظ...' : (staff ? 'حفظ التعديلات' : 'إضافة الموظف')}
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold transition-all"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}

interface AccessCardModalProps {
  staff: Staff;
  onClose: () => void;
}

function AccessCardModal({ staff, onClose }: AccessCardModalProps) {
  const printCard = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" dir="rtl">
      <div className="bg-white rounded-2xl w-full max-w-md">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 rounded-t-2xl">
          <div className="flex items-center justify-between text-white">
            <h2 className="text-xl font-bold">بطاقة دخول الموظف</h2>
            <button onClick={onClose} className="hover:bg-white/20 p-1 rounded">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-8 text-center space-y-6">
          <div className="w-48 h-48 mx-auto bg-white border-4 border-gray-200 rounded-lg p-4 flex items-center justify-center">
            <div className="text-center">
              <QrCode className="w-32 h-32 text-gray-400 mx-auto mb-2" />
              <div className="text-xs text-gray-500 break-all">{staff.qr_code}</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-2xl font-bold text-gray-800">{staff.full_name}</div>
            <div className="text-lg text-gray-600">{staff.role_title}</div>
            <div className="text-sm text-gray-500">{staff.department}</div>
          </div>

          {staff.requires_pin && staff.pin_code && (
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Lock className="w-5 h-5 text-red-600" />
                <span className="text-red-900 font-bold">رمز PIN</span>
              </div>
              <div className="text-3xl font-bold text-red-600 tracking-wider">
                {staff.pin_code}
              </div>
              <div className="text-xs text-red-600 mt-2">سري - لا تشاركه مع أحد</div>
            </div>
          )}

          <div className="text-xs text-gray-400 border-t pt-4">
            تم الإنشاء: {new Date().toLocaleDateString('ar-SA')}
          </div>
        </div>

        <div className="p-6 border-t flex gap-3">
          <button
            onClick={printCard}
            className="flex-1 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition-all flex items-center justify-center gap-2"
          >
            <Download className="w-5 h-5" />
            طباعة البطاقة
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-bold transition-all"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
