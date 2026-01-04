import { useState, useEffect } from 'react';
import { X, Building2, Check, Hash, Layers, List, Shield, Bell, FileText, Settings, Star, Zap } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface MainSection {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  icon: string;
  base_route: string;
}

interface SubSection {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  icon: string;
  tab_name: string;
  route_path: string;
}

interface SubSectionPermission {
  sub_section_id: string;
  access_level: 'read' | 'write' | 'full' | 'admin';
  can_manage_data: boolean;
  can_view_reports: boolean;
  can_export_data: boolean;
  priority: number;
}

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateDepartmentModal({ onClose, onSuccess }: Props) {
  const [formData, setFormData] = useState({
    name_ar: '',
    name_en: '',
    code: '',
    description: '',
    color: '#3b82f6',
    main_section_code: '',
    enable_notifications: true,
    notification_priority: 'normal',
    default_route: '',
  });

  const [selectedSubSections, setSelectedSubSections] = useState<string[]>([]);
  const [subSectionPermissions, setSubSectionPermissions] = useState<Record<string, SubSectionPermission>>({});
  const [loading, setLoading] = useState(false);
  const [suggestedCode, setSuggestedCode] = useState<string>('');
  const [mainSections, setMainSections] = useState<MainSection[]>([]);
  const [subSections, setSubSections] = useState<SubSection[]>([]);
  const [loadingSubSections, setLoadingSubSections] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  useEffect(() => {
    fetchNextCode();
    fetchMainSections();
  }, []);

  const fetchNextCode = async () => {
    try {
      const { data, error } = await supabase.rpc('get_next_available_department_code');
      if (!error && data) {
        setSuggestedCode(data);
        setFormData(prev => ({ ...prev, code: data }));
      }
    } catch (err) {
      console.error('Error fetching next code:', err);
    }
  };

  const fetchMainSections = async () => {
    try {
      const { data, error } = await supabase
        .from('main_sections')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (!error && data) {
        setMainSections(data);
      }
    } catch (err) {
      console.error('Error fetching main sections:', err);
    }
  };

  const fetchSubSections = async (mainSectionCode: string) => {
    if (!mainSectionCode) {
      setSubSections([]);
      return;
    }

    setLoadingSubSections(true);
    try {
      const { data, error } = await supabase.rpc('get_sub_sections_by_main', {
        main_section_code: mainSectionCode
      });

      if (!error && data) {
        setSubSections(data);
      }
    } catch (err) {
      console.error('Error fetching sub sections:', err);
    } finally {
      setLoadingSubSections(false);
    }
  };

  useEffect(() => {
    if (formData.main_section_code) {
      fetchSubSections(formData.main_section_code);
      setSelectedSubSections([]);
      setSubSectionPermissions({});
    } else {
      setSubSections([]);
    }
  }, [formData.main_section_code]);

  const toggleSubSection = (subSectionId: string) => {
    setSelectedSubSections(prev => {
      if (prev.includes(subSectionId)) {
        const newPerms = { ...subSectionPermissions };
        delete newPerms[subSectionId];
        setSubSectionPermissions(newPerms);
        return prev.filter(id => id !== subSectionId);
      } else {
        setSubSectionPermissions(prev => ({
          ...prev,
          [subSectionId]: {
            sub_section_id: subSectionId,
            access_level: 'write',
            can_manage_data: true,
            can_view_reports: true,
            can_export_data: false,
            priority: Object.keys(prev).length + 1
          }
        }));
        return [...prev, subSectionId];
      }
    });
  };

  const updatePermission = (subSectionId: string, field: keyof SubSectionPermission, value: any) => {
    setSubSectionPermissions(prev => ({
      ...prev,
      [subSectionId]: {
        ...prev[subSectionId],
        [field]: value
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: staffData } = await supabase
        .from('platform_staff')
        .select('id')
        .eq('role', 'super_admin')
        .maybeSingle();

      // Create main department first
      const primarySubSectionId = selectedSubSections.length > 0 ? selectedSubSections[0] : null;

      const { data: rawData, error } = await supabase.rpc('create_department', {
        p_name_ar: formData.name_ar,
        p_name_en: formData.name_en,
        p_code: formData.code.toUpperCase(),
        p_description: formData.description || null,
        p_linked_system: 'none',
        p_system_access_level: 'read',
        p_color: formData.color,
        p_created_by: staffData?.id || null,
        p_sub_section_id: primarySubSectionId
      });

      if (error) throw error;

      const resultData = (rawData as any);
      if (!resultData.success) {
        const errorMsg = resultData.message || 'فشل إنشاء القسم';
        if (errorMsg.includes('الرمز موجود بالفعل')) {
          alert('❌ الرمز المدخل موجود بالفعل!\n\nالرجاء:\n• استخدام الرمز المقترح\n• أو إدخال رمز فريد آخر');
          await fetchNextCode();
        } else {
          alert('❌ خطأ: ' + errorMsg);
        }
        return;
      }

      // Store additional sub-section permissions
      if (selectedSubSections.length > 0 && resultData.department_id) {
        const permissionsToInsert = selectedSubSections.map((subSectionId, index) => ({
          department_code: formData.code.toUpperCase(),
          sub_section_id: subSectionId,
          access_level: subSectionPermissions[subSectionId]?.access_level || 'write',
          can_manage_data: subSectionPermissions[subSectionId]?.can_manage_data ?? true,
          can_view_reports: subSectionPermissions[subSectionId]?.can_view_reports ?? true,
          can_export_data: subSectionPermissions[subSectionId]?.can_export_data ?? false,
          priority: index + 1,
          is_active: true
        }));

        await supabase
          .from('department_sub_section_access')
          .insert(permissionsToInsert);
      }

      alert('✅ تم إنشاء القسم بنجاح مع الصلاحيات المتقدمة!');
      setTimeout(() => onSuccess(), 500);

    } catch (error: any) {
      console.error('Error creating department:', error);
      alert('❌ خطأ في إنشاء القسم: ' + (error.message || 'خطأ غير معروف'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-gray-950 via-gray-900 to-black border border-cyan-500/30 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl shadow-cyan-500/20">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 p-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-black text-white">إنشاء قسم جديد</h2>
              <p className="text-cyan-100 text-sm mt-1">نظام إدارة الأقسام المتقدم</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-12 h-12 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center transition-all hover:rotate-90 duration-300"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          {/* Basic Info */}
          <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-black text-white">المعلومات الأساسية</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-cyan-300 mb-2">
                  الاسم بالعربية
                </label>
                <input
                  type="text"
                  required
                  value={formData.name_ar}
                  onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                  className="w-full px-4 py-3.5 bg-black/40 border border-cyan-500/30 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                  placeholder="مثال: إدارة المبيعات"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-cyan-300 mb-2">
                  الاسم بالإنجليزية <span className="text-gray-500 text-xs">(اختياري)</span>
                </label>
                <input
                  type="text"
                  value={formData.name_en}
                  onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                  className="w-full px-4 py-3.5 bg-black/40 border border-cyan-500/30 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                  placeholder="Sales Department"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-cyan-300 mb-2 flex items-center gap-2">
                <Hash className="w-4 h-4" />
                الرمز
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="flex-1 px-4 py-3.5 bg-black/40 border border-cyan-500/30 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all font-mono text-lg"
                  placeholder="SALES"
                />
                <button
                  type="button"
                  onClick={fetchNextCode}
                  className="px-6 py-3.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white rounded-xl transition-all flex items-center gap-2 font-bold shadow-lg hover:shadow-cyan-500/50"
                  title="اقتراح رمز جديد"
                >
                  <Zap className="w-5 h-5" />
                  اقتراح
                </button>
              </div>
              {suggestedCode && (
                <div className="flex items-center gap-2 mt-2 text-xs">
                  <div className="flex items-center gap-1 text-green-400">
                    <Check className="w-4 h-4" />
                    الرمز المقترح:
                  </div>
                  <code className="px-3 py-1 bg-green-500/20 text-green-300 rounded-lg font-mono font-bold">
                    {suggestedCode}
                  </code>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold text-cyan-300 mb-2">
                الوصف
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-3.5 bg-black/40 border border-cyan-500/30 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 resize-none transition-all"
                placeholder="وصف مختصر للقسم ومهامه..."
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-cyan-300 mb-2">
                اللون المميز
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-20 h-14 rounded-xl cursor-pointer border-2 border-cyan-500/30"
                />
                <div className="flex-1 px-4 py-3.5 bg-black/40 border border-cyan-500/30 rounded-xl">
                  <code className="text-white font-mono font-bold text-lg">{formData.color}</code>
                </div>
                <div
                  className="w-14 h-14 rounded-xl shadow-lg"
                  style={{ backgroundColor: formData.color }}
                />
              </div>
            </div>
          </div>

          {/* Hierarchical Routing */}
          <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Layers className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-black text-white">التوجيه الهرمي المتقدم</h3>
            </div>

            <div>
              <label className="block text-sm font-bold text-purple-300 mb-2">
                القسم الرئيسي
              </label>
              <select
                value={formData.main_section_code}
                onChange={(e) => setFormData({ ...formData, main_section_code: e.target.value })}
                className="w-full px-4 py-3.5 bg-black/40 border border-purple-500/30 rounded-xl text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
              >
                <option value="">اختر القسم الرئيسي</option>
                {mainSections.map(section => (
                  <option key={section.id} value={section.code}>
                    {section.icon} {section.name_ar}
                  </option>
                ))}
              </select>
            </div>

            {formData.main_section_code && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-purple-300 flex items-center gap-2">
                    <List className="w-4 h-4" />
                    الأقسام الفرعية (اختر متعدد)
                  </label>
                  <span className="text-xs text-purple-400 bg-purple-500/20 px-3 py-1 rounded-full">
                    {selectedSubSections.length} محدد
                  </span>
                </div>

                {loadingSubSections ? (
                  <div className="text-center py-8 text-gray-400">جاري التحميل...</div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 max-h-64 overflow-y-auto custom-scrollbar">
                    {subSections.map(section => {
                      const isSelected = selectedSubSections.includes(section.id);
                      return (
                        <div
                          key={section.id}
                          className={`
                            p-4 rounded-xl border-2 cursor-pointer transition-all
                            ${isSelected
                              ? 'bg-purple-500/20 border-purple-500 shadow-lg shadow-purple-500/30'
                              : 'bg-black/20 border-purple-500/20 hover:border-purple-500/50'
                            }
                          `}
                          onClick={() => toggleSubSection(section.id)}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`
                              w-8 h-8 rounded-lg flex items-center justify-center transition-all
                              ${isSelected ? 'bg-purple-500 text-white' : 'bg-purple-500/20 text-purple-400'}
                            `}>
                              {isSelected ? <Check className="w-5 h-5" /> : <span className="text-lg">{section.icon}</span>}
                            </div>
                            <div className="flex-1">
                              <div className="font-bold text-white">{section.name_ar}</div>
                              <div className="text-xs text-purple-300">{section.route_path}</div>
                            </div>
                            {isSelected && (
                              <div className="flex items-center gap-2">
                                <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Advanced Permissions */}
          {selectedSubSections.length > 0 && (
            <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-2xl p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                    <Shield className="w-6 h-6 text-green-400" />
                  </div>
                  <h3 className="text-xl font-black text-white">الصلاحيات المتقدمة</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                  className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-all text-sm font-bold flex items-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  {showAdvancedSettings ? 'إخفاء' : 'عرض'} التفاصيل
                </button>
              </div>

              <div className="space-y-4">
                {selectedSubSections.map((subSectionId, index) => {
                  const section = subSections.find(s => s.id === subSectionId);
                  if (!section) return null;

                  const perms = subSectionPermissions[subSectionId];

                  return (
                    <div key={subSectionId} className="bg-black/30 border border-green-500/30 rounded-xl p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{section.icon}</span>
                          <div>
                            <div className="font-bold text-white">{section.name_ar}</div>
                            <div className="text-xs text-green-400">أولوية: #{index + 1}</div>
                          </div>
                        </div>
                      </div>

                      {showAdvancedSettings && (
                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-green-500/20">
                          <div>
                            <label className="block text-xs font-bold text-green-300 mb-2">مستوى الوصول</label>
                            <select
                              value={perms?.access_level || 'write'}
                              onChange={(e) => updatePermission(subSectionId, 'access_level', e.target.value)}
                              className="w-full px-3 py-2 bg-black/40 border border-green-500/30 rounded-lg text-white text-sm"
                            >
                              <option value="read">قراءة فقط</option>
                              <option value="write">قراءة وكتابة</option>
                              <option value="full">صلاحيات كاملة</option>
                              <option value="admin">صلاحيات إدارية</option>
                            </select>
                          </div>

                          <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
                              <input
                                type="checkbox"
                                checked={perms?.can_manage_data ?? true}
                                onChange={(e) => updatePermission(subSectionId, 'can_manage_data', e.target.checked)}
                                className="w-4 h-4 rounded accent-green-500"
                              />
                              إدارة البيانات
                            </label>
                            <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
                              <input
                                type="checkbox"
                                checked={perms?.can_view_reports ?? true}
                                onChange={(e) => updatePermission(subSectionId, 'can_view_reports', e.target.checked)}
                                className="w-4 h-4 rounded accent-green-500"
                              />
                              عرض التقارير
                            </label>
                            <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
                              <input
                                type="checkbox"
                                checked={perms?.can_export_data ?? false}
                                onChange={(e) => updatePermission(subSectionId, 'can_export_data', e.target.checked)}
                                className="w-4 h-4 rounded accent-green-500"
                              />
                              تصدير البيانات
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Notification Settings */}
          <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                <Bell className="w-6 h-6 text-orange-400" />
              </div>
              <h3 className="text-xl font-black text-white">إعدادات الإشعارات</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center gap-3 p-4 bg-black/30 border border-orange-500/30 rounded-xl cursor-pointer hover:border-orange-500/50 transition-all">
                <input
                  type="checkbox"
                  checked={formData.enable_notifications}
                  onChange={(e) => setFormData({ ...formData, enable_notifications: e.target.checked })}
                  className="w-5 h-5 rounded accent-orange-500"
                />
                <span className="text-white font-bold">تفعيل الإشعارات</span>
              </label>

              <div>
                <select
                  value={formData.notification_priority}
                  onChange={(e) => setFormData({ ...formData, notification_priority: e.target.value })}
                  disabled={!formData.enable_notifications}
                  className="w-full px-4 py-3.5 bg-black/40 border border-orange-500/30 rounded-xl text-white disabled:opacity-50"
                >
                  <option value="low">أولوية منخفضة</option>
                  <option value="normal">أولوية عادية</option>
                  <option value="high">أولوية عالية</option>
                  <option value="urgent">عاجل</option>
                </select>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-8 py-4 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-bold transition-all border border-gray-700 hover:border-gray-600"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-8 py-4 bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 hover:from-cyan-700 hover:via-blue-700 hover:to-purple-700 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-xl hover:shadow-2xl hover:shadow-cyan-500/50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  جاري الإنشاء...
                </>
              ) : (
                <>
                  <Check className="w-6 h-6" />
                  إنشاء القسم بالصلاحيات المتقدمة
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(168, 85, 247, 0.4);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(168, 85, 247, 0.6);
        }
      `}</style>
    </div>
  );
}
