import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Shield, Lock, Key, CheckCircle, XCircle, QrCode, Fingerprint, Clock, Eye, Edit, Save, Plus, Settings, Users, Activity } from 'lucide-react';

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

  useEffect(() => {
    loadRoles();
  }, []);

  useEffect(() => {
    if (selectedRole) {
      loadRoleDetails(selectedRole);
    }
  }, [selectedRole]);

  const loadRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('role_definitions')
        .select('*')
        .order('hierarchy_level', { ascending: true });

      if (error) throw error;
      setRoles(data || []);
      if (data && data.length > 0) {
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
        supabase.from('role_access_settings').select('*').eq('role_key', roleKey).single(),
        supabase.from('role_operational_permissions').select('*').eq('role_key', roleKey),
        supabase.from('role_scope_permissions').select('*').eq('role_key', roleKey)
      ]);

      setAccessSettings(accessRes.data);
      setOperationalPerms(operationalRes.data || []);
      setScopePerms(scopeRes.data || []);
    } catch (error) {
      console.error('Error loading role details:', error);
    }
  };

  const selectedRoleData = roles.find(r => r.role_key === selectedRole);

  const getHierarchyColor = (level: number) => {
    if (level <= 2) return 'from-slate-700 to-gray-800';
    if (level <= 4) return 'from-blue-600 to-blue-700';
    if (level <= 6) return 'from-emerald-600 to-teal-700';
    return 'from-gray-500 to-gray-600';
  };

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
      {/* العنوان والوصف */}
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
        {/* قائمة الأدوار */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">الأدوار</h3>
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
                    {role.is_active ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* تفاصيل الدور */}
        <div className="lg:col-span-3">
          {selectedRoleData && (
            <div className="space-y-6">
              {/* معلومات الدور الأساسية */}
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
                    {(platformRole === 'platform_owner' || platformRole === 'super_admin') && (
                      <>
                        <button
                          onClick={() => setEditMode(!editMode)}
                          className={`px-4 py-2 rounded-lg font-bold transition-all inline-flex items-center gap-2 ${
                            editMode
                              ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          {editMode ? <Save className="w-5 h-5" /> : <Edit className="w-5 h-5" />}
                          {editMode ? 'حفظ' : 'تعديل'}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* التبويبات */}
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
                    إعدادات الدخول الذكي
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

                {/* محتوى التبويبات */}
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

                  {activeTab === 'access' && accessSettings && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <h4 className="font-bold text-gray-900 flex items-center gap-2">
                            <QrCode className="w-5 h-5" />
                            طريقة الدخول
                          </h4>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <span className="text-gray-700">يتطلب Barcode</span>
                              {accessSettings.requires_qr ? (
                                <CheckCircle className="w-5 h-5 text-green-600" />
                              ) : (
                                <XCircle className="w-5 h-5 text-red-600" />
                              )}
                            </div>
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <span className="text-gray-700">يتطلب PIN</span>
                              {accessSettings.requires_pin ? (
                                <CheckCircle className="w-5 h-5 text-green-600" />
                              ) : (
                                <XCircle className="w-5 h-5 text-red-600" />
                              )}
                            </div>
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <span className="text-gray-700">نوع Barcode</span>
                              <span className="font-bold text-blue-600">
                                {accessSettings.qr_type === 'permanent' ? 'دائم' : accessSettings.qr_type === 'temporary' ? 'مؤقت' : 'الاثنين'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h4 className="font-bold text-gray-900 flex items-center gap-2">
                            <Fingerprint className="w-5 h-5" />
                            إعدادات الجهاز
                          </h4>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <span className="text-gray-700">رفع صورة Barcode</span>
                              {accessSettings.allow_image_upload ? (
                                <CheckCircle className="w-5 h-5 text-green-600" />
                              ) : (
                                <XCircle className="w-5 h-5 text-red-600" />
                              )}
                            </div>
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <span className="text-gray-700">مسح بالكاميرا</span>
                              {accessSettings.allow_camera_scan ? (
                                <CheckCircle className="w-5 h-5 text-green-600" />
                              ) : (
                                <XCircle className="w-5 h-5 text-red-600" />
                              )}
                            </div>
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <span className="text-gray-700">ربط أول جهاز</span>
                              {accessSettings.bind_first_device ? (
                                <CheckCircle className="w-5 h-5 text-green-600" />
                              ) : (
                                <XCircle className="w-5 h-5 text-red-600" />
                              )}
                            </div>
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <span className="text-gray-700">أجهزة متعددة</span>
                              {accessSettings.allow_multi_device ? (
                                <CheckCircle className="w-5 h-5 text-green-600" />
                              ) : (
                                <XCircle className="w-5 h-5 text-red-600" />
                              )}
                            </div>
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
                            <div className="text-sm text-orange-700 mb-1">مدة الجلسة</div>
                            <div className="text-2xl font-bold text-orange-900">{accessSettings.session_duration_minutes} دقيقة</div>
                          </div>
                          <div className="bg-white/60 rounded-lg p-3">
                            <div className="text-sm text-orange-700 mb-1">مهلة عدم النشاط</div>
                            <div className="text-2xl font-bold text-orange-900">{accessSettings.idle_timeout_minutes} دقيقة</div>
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

                      {operationalPerms.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <Activity className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                          <p>لا توجد صلاحيات تشغيلية محددة</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {operationalPerms.map((perm) => (
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
                                  { key: 'can_create', label: 'إنشاء', value: perm.can_create },
                                  { key: 'can_view', label: 'عرض', value: perm.can_view },
                                  { key: 'can_edit', label: 'تعديل', value: perm.can_edit },
                                  { key: 'can_delete', label: 'حذف', value: perm.can_delete },
                                  { key: 'can_approve', label: 'اعتماد', value: perm.can_approve },
                                  { key: 'can_reject', label: 'رفض', value: perm.can_reject },
                                  { key: 'can_assign', label: 'توزيع', value: perm.can_assign },
                                  { key: 'can_upload_proof', label: 'رفع إثبات', value: perm.can_upload_proof },
                                  { key: 'can_review_reports', label: 'مراجعة تقارير', value: perm.can_review_reports },
                                  { key: 'can_send_to_management', label: 'إرسال للإدارة', value: perm.can_send_to_management }
                                ].map(({ key, label, value }) => (
                                  <div
                                    key={key}
                                    className={`flex items-center gap-2 p-2 rounded ${
                                      value ? 'bg-green-100' : 'bg-gray-200'
                                    }`}
                                  >
                                    {value ? (
                                      <CheckCircle className="w-4 h-4 text-green-600" />
                                    ) : (
                                      <XCircle className="w-4 h-4 text-gray-400" />
                                    )}
                                    <span className={`text-xs font-medium ${value ? 'text-green-800' : 'text-gray-600'}`}>
                                      {label}
                                    </span>
                                  </div>
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
    </div>
  );
}
