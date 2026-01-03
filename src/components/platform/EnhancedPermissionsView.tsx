import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Shield, Lock, Key, CheckCircle, XCircle, QrCode, Fingerprint, Clock, Eye, Edit, Save, Plus, Settings, Users, Activity, Trash2, X, AlertCircle } from 'lucide-react';

interface RoleDefinition {
  id: string;
  role_key: string;
  role_name_ar: string;
  role_name_en: string;
  description: string;
  hierarchy_level: number;
  is_active: boolean;
}

interface AccessSettings {
  id: string;
  role_key: string;
  requires_qr: boolean;
  requires_pin: boolean;
  allow_image_upload: boolean;
  allow_camera_scan: boolean;
  bind_first_device: boolean;
  session_duration_minutes: number;
  idle_timeout_minutes: number;
  allow_multi_device: boolean;
  qr_type: string;
}

interface OperationalPermission {
  id: string;
  role_key: string;
  permission_key: string;
  permission_name_ar: string;
  permission_category: string;
  can_create: boolean;
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_approve: boolean;
  can_reject: boolean;
  can_assign: boolean;
  can_upload_proof: boolean;
  can_review_reports: boolean;
  can_send_to_management: boolean;
}

interface ScopePermission {
  id: string;
  role_key: string;
  scope_type: string;
  scope_value: string | null;
  applies_to_all: boolean;
}

interface Props {
  platformRole: string | null;
}

type TabType = 'overview' | 'access' | 'operations' | 'scope';

export default function EnhancedPermissionsView({ platformRole }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [accessSettings, setAccessSettings] = useState<AccessSettings | null>(null);
  const [operationalPerms, setOperationalPerms] = useState<OperationalPermission[]>([]);
  const [scopePerms, setScopePerms] = useState<ScopePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [tempAccessSettings, setTempAccessSettings] = useState<AccessSettings | null>(null);
  const [tempOperationalPerms, setTempOperationalPerms] = useState<OperationalPermission[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadRoles();
  }, []);

  useEffect(() => {
    if (selectedRole) {
      loadRoleDetails(selectedRole);
    }
  }, [selectedRole]);

  useEffect(() => {
    if (editMode) {
      setTempAccessSettings(accessSettings);
      setTempOperationalPerms([...operationalPerms]);
    }
  }, [editMode]);

  const loadRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('role_definitions')
        .select('*')
        .order('hierarchy_level', { ascending: true });

      if (error) throw error;
      setRoles(data || []);
      if (data && data.length > 0 && !selectedRole) {
        setSelectedRole(data[0].role_key);
      }
    } catch (error) {
      console.error('Error loading roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRoleDetails = async (roleKey: string) => {
    try {
      const [accessRes, operationalRes, scopeRes] = await Promise.all([
        supabase.from('role_access_settings').select('*').eq('role_key', roleKey).maybeSingle(),
        supabase.from('role_operational_permissions').select('*').eq('role_key', roleKey),
        supabase.from('role_scope_permissions').select('*').eq('role_key', roleKey)
      ]);

      setAccessSettings(accessRes.data);
      setOperationalPerms(operationalRes.data || []);
      setScopePerms(scopeRes.data || []);
      setEditMode(false);
    } catch (error) {
      console.error('Error loading role details:', error);
    }
  };

  const handleSaveChanges = async () => {
    if (!tempAccessSettings || !selectedRole) return;

    setSaving(true);
    try {
      await supabase
        .from('role_access_settings')
        .update({
          requires_qr: tempAccessSettings.requires_qr,
          requires_pin: tempAccessSettings.requires_pin,
          allow_image_upload: tempAccessSettings.allow_image_upload,
          allow_camera_scan: tempAccessSettings.allow_camera_scan,
          bind_first_device: tempAccessSettings.bind_first_device,
          allow_multi_device: tempAccessSettings.allow_multi_device,
          session_duration_minutes: tempAccessSettings.session_duration_minutes,
          idle_timeout_minutes: tempAccessSettings.idle_timeout_minutes,
          qr_type: tempAccessSettings.qr_type
        })
        .eq('role_key', selectedRole);

      for (const perm of tempOperationalPerms) {
        await supabase
          .from('role_operational_permissions')
          .update({
            can_create: perm.can_create,
            can_view: perm.can_view,
            can_edit: perm.can_edit,
            can_delete: perm.can_delete,
            can_approve: perm.can_approve,
            can_reject: perm.can_reject,
            can_assign: perm.can_assign,
            can_upload_proof: perm.can_upload_proof,
            can_review_reports: perm.can_review_reports,
            can_send_to_management: perm.can_send_to_management
          })
          .eq('id', perm.id);
      }

      await loadRoleDetails(selectedRole);
      setEditMode(false);
      alert('تم حفظ التغييرات بنجاح');
    } catch (error) {
      console.error('Error saving changes:', error);
      alert('حدث خطأ أثناء حفظ التغييرات');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!selectedRole) return;

    try {
      await supabase
        .from('role_definitions')
        .delete()
        .eq('role_key', selectedRole);

      setShowDeleteConfirm(false);
      await loadRoles();
      setSelectedRole(roles[0]?.role_key || null);
      alert('تم حذف الدور بنجاح');
    } catch (error) {
      console.error('Error deleting role:', error);
      alert('حدث خطأ أثناء حذف الدور');
    }
  };

  const handleToggleActive = async (roleKey: string, currentState: boolean) => {
    try {
      await supabase
        .from('role_definitions')
        .update({ is_active: !currentState })
        .eq('role_key', roleKey);

      await loadRoles();
      if (selectedRole === roleKey) {
        await loadRoleDetails(roleKey);
      }
    } catch (error) {
      console.error('Error toggling role active state:', error);
    }
  };

  const updateTempAccessSetting = (field: keyof AccessSettings, value: any) => {
    if (!tempAccessSettings) return;
    setTempAccessSettings({
      ...tempAccessSettings,
      [field]: value
    });
  };

  const updateTempOperationalPerm = (permId: string, field: string, value: boolean) => {
    setTempOperationalPerms(prev =>
      prev.map(p => p.id === permId ? { ...p, [field]: value } : p)
    );
  };

  const selectedRoleData = roles.find(r => r.role_key === selectedRole);

  const getHierarchyColor = (level: number) => {
    if (level <= 2) return 'from-slate-700 to-gray-800';
    if (level <= 4) return 'from-blue-600 to-blue-700';
    if (level <= 6) return 'from-emerald-600 to-teal-700';
    return 'from-gray-500 to-gray-600';
  };

  const canEdit = platformRole === 'platform_owner' || platformRole === 'super_admin';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 text-white">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-3xl font-bold mb-3 flex items-center gap-3">
              <Shield className="w-10 h-10" />
              هيكلية الصلاحيات الشاملة
            </h2>
            <p className="text-blue-100 text-lg mb-4">
              نظام متكامل لإدارة الأدوار والصلاحيات والمهام وإعدادات الدخول الذكي
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <QrCode className="w-8 h-8" />
                  <div>
                    <div className="text-sm text-blue-100">طرق الدخول</div>
                    <div className="text-2xl font-bold">Barcode + PIN</div>
                  </div>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <Activity className="w-8 h-8" />
                  <div>
                    <div className="text-sm text-blue-100">الصلاحيات التشغيلية</div>
                    <div className="text-2xl font-bold">10 أنواع</div>
                  </div>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <Users className="w-8 h-8" />
                  <div>
                    <div className="text-sm text-blue-100">الأدوار المُعرفة</div>
                    <div className="text-2xl font-bold">{roles.length}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">الأدوار</h3>
              {canEdit && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                  title="إضافة دور"
                >
                  <Plus className="w-5 h-5" />
                </button>
              )}
            </div>
            <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
              {roles.map((role) => (
                <button
                  key={role.id}
                  onClick={() => setSelectedRole(role.role_key)}
                  className={`w-full p-4 text-right transition-all ${
                    selectedRole === role.role_key
                      ? 'bg-blue-50 border-r-4 border-blue-600'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${getHierarchyColor(role.hierarchy_level)} flex items-center justify-center flex-shrink-0`}>
                      <Shield className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-gray-900 text-sm">{role.role_name_ar}</div>
                      <div className="text-xs text-gray-500">{role.role_name_en}</div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleActive(role.role_key, role.is_active);
                      }}
                      className="flex-shrink-0"
                    >
                      {role.is_active ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600" />
                      )}
                    </button>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          {selectedRoleData && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${getHierarchyColor(selectedRoleData.hierarchy_level)} flex items-center justify-center`}>
                      <Shield className="w-9 h-9 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">{selectedRoleData.role_name_ar}</h3>
                      <p className="text-gray-600">{selectedRoleData.role_name_en}</p>
                      <p className="text-sm text-gray-500 mt-1">{selectedRoleData.description}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {canEdit && (
                      <>
                        {editMode ? (
                          <>
                            <button
                              onClick={() => setEditMode(false)}
                              disabled={saving}
                              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-300 transition-all inline-flex items-center gap-2"
                            >
                              <X className="w-5 h-5" />
                              إلغاء
                            </button>
                            <button
                              onClick={handleSaveChanges}
                              disabled={saving}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-all inline-flex items-center gap-2"
                            >
                              {saving ? (
                                <>
                                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                  جاري الحفظ...
                                </>
                              ) : (
                                <>
                                  <Save className="w-5 h-5" />
                                  حفظ التغييرات
                                </>
                              )}
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => setEditMode(true)}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-all inline-flex items-center gap-2"
                            >
                              <Edit className="w-5 h-5" />
                              تعديل
                            </button>
                            <button
                              onClick={() => setShowDeleteConfirm(true)}
                              className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-all inline-flex items-center gap-2"
                            >
                              <Trash2 className="w-5 h-5" />
                              حذف
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 border-b border-gray-200">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`px-4 py-3 font-bold transition-all border-b-2 ${
                      activeTab === 'overview'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Eye className="w-5 h-5 inline-block ml-2" />
                    نظرة عامة
                  </button>
                  <button
                    onClick={() => setActiveTab('access')}
                    className={`px-4 py-3 font-bold transition-all border-b-2 ${
                      activeTab === 'access'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <QrCode className="w-5 h-5 inline-block ml-2" />
                    إعدادات الدخول
                  </button>
                  <button
                    onClick={() => setActiveTab('operations')}
                    className={`px-4 py-3 font-bold transition-all border-b-2 ${
                      activeTab === 'operations'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Activity className="w-5 h-5 inline-block ml-2" />
                    الصلاحيات التشغيلية
                  </button>
                  <button
                    onClick={() => setActiveTab('scope')}
                    className={`px-4 py-3 font-bold transition-all border-b-2 ${
                      activeTab === 'scope'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Settings className="w-5 h-5 inline-block ml-2" />
                    نطاق الصلاحيات
                  </button>
                </div>

                <div className="mt-6">
                  {activeTab === 'overview' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="text-sm text-gray-600 mb-1">مستوى التسلسل الهرمي</div>
                          <div className="text-2xl font-bold text-gray-900">{selectedRoleData.hierarchy_level}</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="text-sm text-gray-600 mb-1">الحالة</div>
                          <div className="flex items-center gap-2">
                            {selectedRoleData.is_active ? (
                              <>
                                <CheckCircle className="w-5 h-5 text-green-600" />
                                <span className="text-xl font-bold text-green-600">نشط</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="w-5 h-5 text-red-600" />
                                <span className="text-xl font-bold text-red-600">معطل</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                        <h4 className="font-bold text-blue-900 mb-2">ملخص الصلاحيات</h4>
                        <div className="space-y-2 text-sm text-blue-800">
                          <div className="flex items-center gap-2">
                            <QrCode className="w-4 h-4" />
                            <span>الدخول: {accessSettings?.requires_qr ? 'Barcode' : 'لا'} {accessSettings?.requires_pin && '+ PIN'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Activity className="w-4 h-4" />
                            <span>الصلاحيات التشغيلية: {operationalPerms.length} صلاحية</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Settings className="w-4 h-4" />
                            <span>النطاق: {scopePerms.length > 0 ? scopePerms[0].applies_to_all ? 'المنصة كاملة' : 'محدد' : 'غير محدد'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'access' && tempAccessSettings && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <h4 className="font-bold text-gray-900 flex items-center gap-2">
                            <QrCode className="w-5 h-5" />
                            طريقة الدخول
                          </h4>
                          <div className="space-y-3">
                            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                              <span className="text-gray-700">يتطلب Barcode</span>
                              <input
                                type="checkbox"
                                checked={tempAccessSettings.requires_qr}
                                onChange={(e) => updateTempAccessSetting('requires_qr', e.target.checked)}
                                disabled={!editMode}
                                className="w-5 h-5"
                              />
                            </label>
                            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                              <span className="text-gray-700">يتطلب PIN</span>
                              <input
                                type="checkbox"
                                checked={tempAccessSettings.requires_pin}
                                onChange={(e) => updateTempAccessSetting('requires_pin', e.target.checked)}
                                disabled={!editMode}
                                className="w-5 h-5"
                              />
                            </label>
                            <div className="p-3 bg-gray-50 rounded-lg">
                              <label className="block text-gray-700 mb-2">نوع Barcode</label>
                              <select
                                value={tempAccessSettings.qr_type}
                                onChange={(e) => updateTempAccessSetting('qr_type', e.target.value)}
                                disabled={!editMode}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                              >
                                <option value="permanent">دائم</option>
                                <option value="temporary">مؤقت</option>
                                <option value="both">الاثنين</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h4 className="font-bold text-gray-900 flex items-center gap-2">
                            <Fingerprint className="w-5 h-5" />
                            إعدادات الجهاز
                          </h4>
                          <div className="space-y-3">
                            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                              <span className="text-gray-700">رفع صورة Barcode</span>
                              <input
                                type="checkbox"
                                checked={tempAccessSettings.allow_image_upload}
                                onChange={(e) => updateTempAccessSetting('allow_image_upload', e.target.checked)}
                                disabled={!editMode}
                                className="w-5 h-5"
                              />
                            </label>
                            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                              <span className="text-gray-700">مسح بالكاميرا</span>
                              <input
                                type="checkbox"
                                checked={tempAccessSettings.allow_camera_scan}
                                onChange={(e) => updateTempAccessSetting('allow_camera_scan', e.target.checked)}
                                disabled={!editMode}
                                className="w-5 h-5"
                              />
                            </label>
                            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                              <span className="text-gray-700">ربط أول جهاز</span>
                              <input
                                type="checkbox"
                                checked={tempAccessSettings.bind_first_device}
                                onChange={(e) => updateTempAccessSetting('bind_first_device', e.target.checked)}
                                disabled={!editMode}
                                className="w-5 h-5"
                              />
                            </label>
                            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                              <span className="text-gray-700">أجهزة متعددة</span>
                              <input
                                type="checkbox"
                                checked={tempAccessSettings.allow_multi_device}
                                onChange={(e) => updateTempAccessSetting('allow_multi_device', e.target.checked)}
                                disabled={!editMode}
                                className="w-5 h-5"
                              />
                            </label>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-200 rounded-lg p-4">
                        <h4 className="font-bold text-orange-900 mb-3 flex items-center gap-2">
                          <Clock className="w-5 h-5" />
                          إعدادات الجلسة
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-white/60 rounded-lg p-3">
                            <label className="text-sm text-orange-700 mb-1 block">مدة الجلسة (دقيقة)</label>
                            <input
                              type="number"
                              value={tempAccessSettings.session_duration_minutes}
                              onChange={(e) => updateTempAccessSetting('session_duration_minutes', parseInt(e.target.value))}
                              disabled={!editMode}
                              className="w-full px-3 py-2 border border-orange-300 rounded-lg text-orange-900 font-bold text-xl"
                            />
                          </div>
                          <div className="bg-white/60 rounded-lg p-3">
                            <label className="text-sm text-orange-700 mb-1 block">مهلة عدم النشاط (دقيقة)</label>
                            <input
                              type="number"
                              value={tempAccessSettings.idle_timeout_minutes}
                              onChange={(e) => updateTempAccessSetting('idle_timeout_minutes', parseInt(e.target.value))}
                              disabled={!editMode}
                              className="w-full px-3 py-2 border border-orange-300 rounded-lg text-orange-900 font-bold text-xl"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'operations' && (
                    <div className="space-y-4">
                      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-4">
                        <h4 className="font-bold text-blue-900 mb-2">الصلاحيات التشغيلية (المهام)</h4>
                        <p className="text-sm text-blue-800">
                          هذه الصلاحيات تحدد ما يمكن للدور القيام به من مهام وعمليات داخل النظام
                        </p>
                      </div>

                      {tempOperationalPerms.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <Activity className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                          <p>لا توجد صلاحيات تشغيلية محددة</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {tempOperationalPerms.map((perm) => (
                            <div key={perm.id} className="bg-gray-50 rounded-lg p-4">
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <h5 className="font-bold text-gray-900">{perm.permission_name_ar}</h5>
                                  <p className="text-sm text-gray-600">{perm.permission_key}</p>
                                </div>
                                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-bold">
                                  {perm.permission_category}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                                {[
                                  { key: 'can_create', label: 'إنشاء' },
                                  { key: 'can_view', label: 'عرض' },
                                  { key: 'can_edit', label: 'تعديل' },
                                  { key: 'can_delete', label: 'حذف' },
                                  { key: 'can_approve', label: 'اعتماد' },
                                  { key: 'can_reject', label: 'رفض' },
                                  { key: 'can_assign', label: 'توزيع' },
                                  { key: 'can_upload_proof', label: 'رفع إثبات' },
                                  { key: 'can_review_reports', label: 'مراجعة تقارير' },
                                  { key: 'can_send_to_management', label: 'إرسال للإدارة' }
                                ].map(({ key, label }) => (
                                  <label
                                    key={key}
                                    className={`flex items-center gap-2 p-2 rounded cursor-pointer ${
                                      perm[key as keyof OperationalPermission] ? 'bg-green-100' : 'bg-gray-200'
                                    } ${editMode ? 'hover:opacity-80' : ''}`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={perm[key as keyof OperationalPermission] as boolean}
                                      onChange={(e) => updateTempOperationalPerm(perm.id, key, e.target.checked)}
                                      disabled={!editMode}
                                      className="w-4 h-4"
                                    />
                                    <span className={`text-xs font-medium ${perm[key as keyof OperationalPermission] ? 'text-green-800' : 'text-gray-600'}`}>
                                      {label}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'scope' && (
                    <div className="space-y-4">
                      <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4 mb-4">
                        <h4 className="font-bold text-purple-900 mb-2">نطاق الصلاحيات</h4>
                        <p className="text-sm text-purple-800">
                          يحدد النطاق الجغرافي/التنظيمي الذي يمكن للدور العمل ضمنه
                        </p>
                      </div>

                      {scopePerms.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <Settings className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                          <p>لم يتم تحديد نطاق الصلاحيات</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {scopePerms.map((scope) => (
                            <div key={scope.id} className="bg-gray-50 rounded-lg p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-bold text-gray-900 mb-1">
                                    {scope.scope_type === 'platform' ? 'المنصة الكاملة' :
                                     scope.scope_type === 'section' ? 'قسم محدد' :
                                     scope.scope_type === 'farm' ? 'مزرعة محددة' :
                                     scope.scope_type === 'auction' ? 'مزاد محدد' :
                                     scope.scope_type}
                                  </div>
                                  {scope.scope_value && (
                                    <p className="text-sm text-gray-600">{scope.scope_value}</p>
                                  )}
                                </div>
                                {scope.applies_to_all && (
                                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold">
                                    الكل
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">تأكيد الحذف</h3>
                <p className="text-sm text-gray-600">هل أنت متأكد من حذف هذا الدور؟</p>
              </div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-red-800">
                سيتم حذف الدور وجميع الصلاحيات المرتبطة به. هذا الإجراء لا يمكن التراجع عنه.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-300"
              >
                إلغاء
              </button>
              <button
                onClick={handleDeleteRole}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700"
              >
                حذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
