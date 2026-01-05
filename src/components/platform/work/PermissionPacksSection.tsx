import { useState, useEffect } from 'react';
import { Shield, Plus, Edit2, Trash2, Lock, Map, Clock, CheckCircle, X } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { adminSessionManager } from '../../../utils/adminSessionManager';

interface PermissionPack {
  id: string;
  name: string;
  description: string;
  target_boards: string[];
  requires_pin: boolean;
  session_idle_minutes: number;
  landing_route: string;
  is_active: boolean;
}

interface PackPermission {
  id?: string;
  board: string;
  section: string;
  access_level: 'view' | 'manage' | 'approve';
  actions: string[];
}

const BOARDS = [
  { value: 'b2b', label: 'المزادات (B2B)' },
  { value: 'b2f', label: 'استثمار المزارع (B2F)' },
  { value: 'hq', label: 'لوحة الإدارة العليا' },
  { value: 'settings', label: 'الإعدادات' }
];

const B2B_SECTIONS = [
  'المزادات', 'الطلبات', 'العروض', 'المحادثات', 'التقارير'
];

const B2F_SECTIONS = [
  'المزارع', 'الفرص الاستثمارية', 'الطلبات', 'العقود', 'العمليات', 'المالية', 'الموسمية'
];

const ACCESS_LEVELS = [
  { value: 'view', label: 'عرض فقط', color: 'blue' },
  { value: 'manage', label: 'إدارة', color: 'yellow' },
  { value: 'approve', label: 'اعتماد', color: 'red' }
];

const ACTIONS = ['create', 'edit', 'delete', 'export'];

export function PermissionPacksSection() {
  const [packs, setPacks] = useState<PermissionPack[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPack, setSelectedPack] = useState<PermissionPack | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPacks();
  }, []);

  const loadPacks = async () => {
    try {
      const session = adminSessionManager.getSession();
      if (!session) {
        throw new Error('لا توجد جلسة نشطة');
      }

      const { data, error } = await supabase.rpc('admin_get_all_permission_packs', {
        p_staff_id: session.staff_id
      });

      if (error) throw error;

      if (data?.success) {
        setPacks(data.packs || []);
      } else {
        throw new Error(data?.message || 'فشل في تحميل الحزم');
      }
    } catch (error: any) {
      console.error('Error loading packs:', error);
      alert(error?.message || 'حدث خطأ أثناء تحميل الحزم');
    } finally {
      setLoading(false);
    }
  };

  const deletePack = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الحزمة؟')) return;

    try {
      const session = adminSessionManager.getSession();
      if (!session) {
        throw new Error('لا توجد جلسة نشطة');
      }

      const { data, error } = await supabase.rpc('admin_delete_permission_pack', {
        p_staff_id: session.staff_id,
        p_pack_id: id
      });

      if (error) throw error;

      if (data?.success) {
        alert(data.message);
        loadPacks();
      } else {
        throw new Error(data?.message || 'فشل في حذف الحزمة');
      }
    } catch (error: any) {
      console.error('Error deleting pack:', error);
      alert(error?.message || 'حدث خطأ أثناء الحذف');
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
          <Shield className="w-6 h-6 text-emerald-400" />
          <h2 className="text-xl font-bold text-white">حزم الصلاحيات</h2>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition-all flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          إنشاء حزمة جديدة
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {packs.map((pack) => (
          <div
            key={pack.id}
            className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-white font-bold text-lg mb-1">{pack.name}</h3>
                <p className="text-gray-400 text-sm">{pack.description}</p>
              </div>
              {pack.requires_pin && (
                <Lock className="w-5 h-5 text-red-400" />
              )}
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-sm">
                <Map className="w-4 h-4 text-blue-400" />
                <span className="text-gray-300">
                  {pack.target_boards.map(b =>
                    BOARDS.find(board => board.value === b)?.label
                  ).join(' + ')}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-purple-400" />
                <span className="text-gray-300">
                  جلسة: {pack.session_idle_minutes} دقيقة
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span className="text-gray-300">
                  Landing: {pack.landing_route}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setSelectedPack(pack);
                  setShowCreateModal(true);
                }}
                className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-all flex items-center justify-center gap-2"
              >
                <Edit2 className="w-4 h-4" />
                تعديل
              </button>
              <button
                onClick={() => deletePack(pack.id)}
                className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {packs.length === 0 && (
          <div className="col-span-full text-center py-12">
            <Shield className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">لا توجد حزم صلاحيات</p>
            <p className="text-gray-500 text-sm mt-2">قم بإنشاء حزمة جديدة للبدء</p>
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreatePackModal
          pack={selectedPack}
          onClose={() => {
            setShowCreateModal(false);
            setSelectedPack(null);
          }}
          onSuccess={() => {
            loadPacks();
            setShowCreateModal(false);
            setSelectedPack(null);
          }}
        />
      )}
    </div>
  );
}

interface CreatePackModalProps {
  pack: PermissionPack | null;
  onClose: () => void;
  onSuccess: () => void;
}

function CreatePackModal({ pack, onClose, onSuccess }: CreatePackModalProps) {
  const [formData, setFormData] = useState({
    name: pack?.name || '',
    description: pack?.description || '',
    target_boards: pack?.target_boards || [],
    requires_pin: pack?.requires_pin || false,
    session_idle_minutes: pack?.session_idle_minutes || 30,
    landing_route: pack?.landing_route || '/admin',
    is_active: pack?.is_active ?? true
  });
  const [permissions, setPermissions] = useState<PackPermission[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (pack) {
      loadPackPermissions(pack.id);
    }
  }, [pack]);

  const loadPackPermissions = async (packId: string) => {
    try {
      const session = adminSessionManager.getSession();
      if (!session) {
        throw new Error('لا توجد جلسة نشطة');
      }

      const { data, error } = await supabase.rpc('admin_get_pack_permissions', {
        p_staff_id: session.staff_id,
        p_pack_id: packId
      });

      if (error) throw error;

      if (data?.success) {
        setPermissions(data.permissions || []);
      } else {
        throw new Error(data?.message || 'فشل في تحميل الصلاحيات');
      }
    } catch (error: any) {
      console.error('Error loading permissions:', error);
      alert(error?.message || 'حدث خطأ أثناء تحميل الصلاحيات');
    }
  };

  const addPermission = () => {
    setPermissions([
      ...permissions,
      {
        board: formData.target_boards[0] || 'b2b',
        section: '',
        access_level: 'view',
        actions: []
      }
    ]);
  };

  const updatePermission = (index: number, updates: Partial<PackPermission>) => {
    const updated = [...permissions];
    updated[index] = { ...updated[index], ...updates };
    setPermissions(updated);
  };

  const removePermission = (index: number) => {
    setPermissions(permissions.filter((_, i) => i !== index));
  };

  const getSectionsForBoard = (board: string) => {
    switch (board) {
      case 'b2b': return B2B_SECTIONS;
      case 'b2f': return B2F_SECTIONS;
      default: return [];
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('يرجى إدخال اسم الحزمة');
      return;
    }

    if (formData.target_boards.length === 0) {
      alert('يرجى اختيار لوحة واحدة على الأقل');
      return;
    }

    setSaving(true);
    try {
      const session = adminSessionManager.getSession();
      if (!session) {
        throw new Error('لا توجد جلسة نشطة');
      }

      let packId = pack?.id;
      let result;

      if (pack) {
        // تحديث حزمة موجودة
        const { data, error } = await supabase.rpc('admin_update_permission_pack', {
          p_staff_id: session.staff_id,
          p_pack_id: pack.id,
          p_name: formData.name,
          p_description: formData.description,
          p_target_boards: formData.target_boards,
          p_requires_pin: formData.requires_pin,
          p_session_idle_minutes: formData.session_idle_minutes,
          p_landing_route: formData.landing_route,
          p_is_active: formData.is_active
        });

        if (error) throw error;
        result = data;
      } else {
        // إنشاء حزمة جديدة
        const { data, error } = await supabase.rpc('admin_create_permission_pack', {
          p_staff_id: session.staff_id,
          p_name: formData.name,
          p_description: formData.description,
          p_target_boards: formData.target_boards,
          p_requires_pin: formData.requires_pin,
          p_session_idle_minutes: formData.session_idle_minutes,
          p_landing_route: formData.landing_route
        });

        if (error) throw error;
        result = data;
        packId = data?.pack?.id;
      }

      if (!result?.success) {
        throw new Error(result?.message || 'فشل في حفظ الحزمة');
      }

      // حذف الصلاحيات القديمة وإضافة الجديدة
      if (packId) {
        // حذف الصلاحيات القديمة
        await supabase.rpc('admin_clear_pack_permissions', {
          p_staff_id: session.staff_id,
          p_pack_id: packId
        });

        // إضافة الصلاحيات الجديدة
        if (permissions.length > 0) {
          const validPermissions = permissions.filter(p => p.section);

          for (const perm of validPermissions) {
            const { data: permData, error: permError } = await supabase.rpc('admin_add_pack_permission', {
              p_staff_id: session.staff_id,
              p_pack_id: packId,
              p_board: perm.board,
              p_section: perm.section,
              p_access_level: perm.access_level,
              p_actions: perm.actions
            });

            if (permError) {
              console.error('Error adding permission:', permError);
            }
          }
        }
      }

      alert(result.message);
      onSuccess();
    } catch (error: any) {
      console.error('Error saving pack:', error);
      const errorMessage = error?.message || 'حدث خطأ غير معروف';
      alert(`حدث خطأ أثناء الحفظ:\n${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" dir="rtl">
      <div className="bg-slate-800 rounded-2xl border border-white/10 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-slate-800 border-b border-white/10 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">
            {pack ? 'تعديل الحزمة' : 'إنشاء حزمة جديدة'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-white font-bold mb-2">اسم الحزمة</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white"
                placeholder="مثال: مدير المزادات"
              />
            </div>

            <div>
              <label className="block text-white font-bold mb-2">Landing Route</label>
              <select
                value={formData.landing_route}
                onChange={(e) => setFormData({ ...formData, landing_route: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white"
              >
                <option value="/admin">لوحة التحكم الرئيسية</option>
                <option value="/admin/auctions">المزادات</option>
                <option value="/admin/b2f">استثمار المزارع</option>
                <option value="/admin/settings">الإعدادات</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-white font-bold mb-2">الوصف</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white"
              rows={3}
              placeholder="وصف مختصر للحزمة..."
            />
          </div>

          <div>
            <label className="block text-white font-bold mb-2">اللوحات المستهدفة</label>
            <div className="grid grid-cols-2 gap-3">
              {BOARDS.map((board) => (
                <label key={board.value} className="flex items-center gap-2 p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-all">
                  <input
                    type="checkbox"
                    checked={formData.target_boards.includes(board.value)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({
                          ...formData,
                          target_boards: [...formData.target_boards, board.value]
                        });
                      } else {
                        setFormData({
                          ...formData,
                          target_boards: formData.target_boards.filter(b => b !== board.value)
                        });
                      }
                    }}
                    className="w-5 h-5"
                  />
                  <span className="text-white">{board.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-center gap-2 p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-all">
              <input
                type="checkbox"
                checked={formData.requires_pin}
                onChange={(e) => setFormData({ ...formData, requires_pin: e.target.checked })}
                className="w-5 h-5"
              />
              <Lock className="w-5 h-5 text-red-400" />
              <span className="text-white">يتطلب PIN إلزامي</span>
            </label>

            <div>
              <label className="block text-white font-bold mb-2">مدة الجلسة (دقيقة)</label>
              <input
                type="number"
                value={formData.session_idle_minutes}
                onChange={(e) => setFormData({ ...formData, session_idle_minutes: parseInt(e.target.value) || 30 })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white"
                min="5"
                max="480"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold">الصلاحيات التفصيلية</h3>
              <button
                onClick={addPermission}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                إضافة صلاحية
              </button>
            </div>

            <div className="space-y-3">
              {permissions.map((perm, index) => (
                <div key={index} className="bg-white/5 rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-gray-400 text-sm mb-1">اللوحة</label>
                      <select
                        value={perm.board}
                        onChange={(e) => updatePermission(index, { board: e.target.value, section: '' })}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
                      >
                        {formData.target_boards.map(b => {
                          const board = BOARDS.find(board => board.value === b);
                          return board ? <option key={b} value={b}>{board.label}</option> : null;
                        })}
                      </select>
                    </div>

                    <div>
                      <label className="block text-gray-400 text-sm mb-1">القسم</label>
                      <select
                        value={perm.section}
                        onChange={(e) => updatePermission(index, { section: e.target.value })}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
                      >
                        <option value="">اختر القسم</option>
                        {getSectionsForBoard(perm.board).map(section => (
                          <option key={section} value={section}>{section}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-gray-400 text-sm mb-1">المستوى</label>
                      <select
                        value={perm.access_level}
                        onChange={(e) => updatePermission(index, { access_level: e.target.value as any })}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
                      >
                        {ACCESS_LEVELS.map(level => (
                          <option key={level.value} value={level.value}>{level.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-400 text-sm mb-2">الإجراءات</label>
                    <div className="flex flex-wrap gap-2">
                      {ACTIONS.map(action => (
                        <label key={action} className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-all">
                          <input
                            type="checkbox"
                            checked={perm.actions.includes(action)}
                            onChange={(e) => {
                              const actions = e.target.checked
                                ? [...perm.actions, action]
                                : perm.actions.filter(a => a !== action);
                              updatePermission(index, { actions });
                            }}
                            className="w-4 h-4"
                          />
                          <span className="text-white text-sm">{action}</span>
                        </label>
                      ))}
                      <button
                        onClick={() => removePermission(index)}
                        className="mr-auto px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm"
                      >
                        حذف
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-slate-800 border-t border-white/10 p-6 flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 text-white rounded-lg font-bold transition-all"
          >
            {saving ? 'جاري الحفظ...' : (pack ? 'حفظ التعديلات' : 'إنشاء الحزمة')}
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
