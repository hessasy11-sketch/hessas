import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, UserPlus, Shield, Edit3, Trash2, CheckCircle, UserX, AlertCircle } from 'lucide-react';

interface PlatformAdmin {
  id: string;
  user_id: string;
  platform_role: string;
  section: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  assigned_at: string;
}

interface Props {
  platformRole: string | null;
}

export default function StructurePermissionsView({ platformRole }: Props) {
  const [admins, setAdmins] = useState<PlatformAdmin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAdmins();
  }, []);

  const loadAdmins = async () => {
    try {
      setLoading(false);

      const { data, error } = await supabase
        .from('platform_administrators')
        .select('*')
        .order('platform_role', { ascending: true })
        .order('assigned_at', { ascending: false });

      if (error) throw error;
      setAdmins(data || []);
    } catch (error) {
      console.error('Error loading admins:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadge = (role: string) => {
    const badges: Record<string, any> = {
      platform_owner: {
        label: 'مالك المنصة',
        color: 'from-slate-700 to-gray-800',
        icon: '👑'
      },
      platform_admin: {
        label: 'مدير عام',
        color: 'from-blue-500 to-blue-600',
        icon: '⚡'
      },
      platform_supervisor: {
        label: 'مشرف عام',
        color: 'from-emerald-500 to-teal-600',
        icon: '👁️'
      }
    };

    const badge = badges[role] || badges.platform_supervisor;

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r ${badge.color} text-white shadow-lg`}>
        <span>{badge.icon}</span>
        {badge.label}
      </span>
    );
  };

  const getSectionBadge = (section: string | null) => {
    if (!section || section === 'general') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
          عام (جميع الأقسام)
        </span>
      );
    }

    const sections: Record<string, string> = {
      b2f: 'استثمار أشجار المزارع',
      auctions: 'مزاد الشركات'
    };

    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
        {sections[section] || section}
      </span>
    );
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
    <div className="space-y-6">
      {/* شرح النظام */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <Shield className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-blue-900 mb-2">نظام الهيكلة والصلاحيات</h3>
            <p className="text-sm text-blue-800 leading-relaxed mb-3">
              من هنا يتم التحكم الإداري الكامل في المسؤولين على مستوى المنصة.
            </p>
            <div className="bg-white/60 rounded-lg p-3 text-sm text-blue-900 space-y-1.5">
              <div className="flex items-start gap-2">
                <span className="font-bold">•</span>
                <span><strong>إضافة مستخدم إداري:</strong> يجب تحديد القسم والدور وربطه بـ user_id إلزامي</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold">•</span>
                <span><strong>الأقسام:</strong> استثمار أشجار المزارع - مزاد الشركات - عام</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold">•</span>
                <span><strong>الأدوار:</strong> مدير مزرعة - مشرف - مدير مزاد</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* تحذير */}
      <div className="bg-red-50 border-2 border-red-200 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-red-900 mb-2">⚠️ شرط إلزامي</h4>
            <p className="text-sm text-red-800">
              يُمنع حفظ أي مستخدم إداري بدون: <strong>قسم محدد</strong> + <strong>دور محدد</strong> + <strong>user_id صالح</strong>
            </p>
          </div>
        </div>
      </div>

      {/* إحصائيات */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-slate-50 to-gray-50 border-2 border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-600 font-medium mb-1">إجمالي المسؤولين</div>
              <div className="text-3xl font-bold text-slate-700">{admins.length}</div>
            </div>
            <Users className="w-10 h-10 text-slate-400" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-emerald-600 font-medium mb-1">النشطين</div>
              <div className="text-3xl font-bold text-emerald-700">
                {admins.filter(a => a.is_active).length}
              </div>
            </div>
            <CheckCircle className="w-10 h-10 text-emerald-400" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-gray-50 to-slate-50 border-2 border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600 font-medium mb-1">المعطلين</div>
              <div className="text-3xl font-bold text-gray-700">
                {admins.filter(a => !a.is_active).length}
              </div>
            </div>
            <UserX className="w-10 h-10 text-gray-400" />
          </div>
        </div>
      </div>

      {/* قائمة المسؤولين */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900">المسؤولين على مستوى المنصة</h3>
            <p className="text-sm text-gray-600 mt-1">
              جميع المستخدمين الذين لديهم صلاحيات إدارية على المنصة
            </p>
          </div>
          {(platformRole === 'platform_owner' || platformRole === 'platform_admin') && (
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-all inline-flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              إضافة مسؤول
            </button>
          )}
        </div>

        <div className="divide-y divide-gray-200">
          {admins.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">لا يوجد مسؤولين</h3>
              <p className="text-gray-600">لم يتم إضافة أي مسؤولين بعد</p>
            </div>
          ) : (
            admins.map((admin) => (
              <div key={admin.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-4">
                  {/* الأيقونة */}
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 ${
                    admin.is_active
                      ? admin.platform_role === 'platform_owner'
                        ? 'bg-slate-100'
                        : admin.platform_role === 'platform_admin'
                        ? 'bg-blue-100'
                        : 'bg-emerald-100'
                      : 'bg-gray-100'
                  }`}>
                    <Shield className={`w-7 h-7 ${
                      admin.is_active
                        ? admin.platform_role === 'platform_owner'
                          ? 'text-slate-700'
                          : admin.platform_role === 'platform_admin'
                          ? 'text-blue-600'
                          : 'text-emerald-600'
                        : 'text-gray-400'
                    }`} />
                  </div>

                  {/* المعلومات */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-lg font-bold text-gray-900 mb-1">{admin.full_name}</h4>
                        <div className="flex items-center gap-2 flex-wrap">
                          {getRoleBadge(admin.platform_role)}
                          {getSectionBadge(admin.section)}
                          {admin.is_active ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <CheckCircle className="w-3 h-3" />
                              نشط
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              <UserX className="w-3 h-3" />
                              معطل
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                      <div>
                        <span className="text-gray-500">البريد:</span>
                        <span className="text-gray-900 mr-2 font-medium">{admin.email}</span>
                      </div>
                      {admin.phone && (
                        <div>
                          <span className="text-gray-500">الجوال:</span>
                          <span className="text-gray-900 mr-2 font-medium">{admin.phone}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-500">تاريخ الإضافة:</span>
                        <span className="text-gray-900 mr-2 font-medium">
                          {new Date(admin.assigned_at).toLocaleDateString('ar-SA')}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 text-xs text-gray-500">
                      <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                        User ID: {admin.user_id.slice(0, 8)}...
                      </span>
                    </div>
                  </div>

                  {/* أزرار الإجراءات */}
                  {(platformRole === 'platform_owner' || platformRole === 'platform_admin') && (
                    <div className="flex gap-2">
                      <button
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="تعديل"
                      >
                        <Edit3 className="w-5 h-5" />
                      </button>
                      <button
                        className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title="حذف"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* شرح الأدوار */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-slate-50 to-gray-50 border-2 border-slate-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-slate-700 rounded-lg flex items-center justify-center">
              <span className="text-2xl">👑</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">مالك المنصة</h3>
              <p className="text-sm text-slate-700">platform_owner</p>
            </div>
          </div>
          <ul className="space-y-2 text-sm text-slate-800">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-slate-600 mt-0.5 flex-shrink-0" />
              <span>صلاحيات كاملة على جميع الأقسام</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-slate-600 mt-0.5 flex-shrink-0" />
              <span>إدارة المسؤولين والصلاحيات</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-slate-600 mt-0.5 flex-shrink-0" />
              <span>الوصول لجميع البيانات والتقارير</span>
            </li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-sky-50 border-2 border-blue-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-2xl">⚡</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-blue-900">مدير عام</h3>
              <p className="text-sm text-blue-700">platform_admin</p>
            </div>
          </div>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <span>صلاحيات إدارية واسعة</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <span>إدارة المسؤولين (ما عدا المالك)</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <span>مراجعة التقارير والتنبيهات</span>
            </li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-emerald-600 rounded-lg flex items-center justify-center">
              <span className="text-2xl">👁️</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-emerald-900">مشرف عام</h3>
              <p className="text-sm text-emerald-700">platform_supervisor</p>
            </div>
          </div>
          <ul className="space-y-2 text-sm text-emerald-800">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
              <span>مراقبة وعرض البيانات</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
              <span>الوصول للتقارير والإحصائيات</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
              <span>لا يمكنه التعديل أو الحذف</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
