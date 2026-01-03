import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Users, UserPlus, Edit3, UserCheck, UserX, Shield, Eye, Trash2, CheckCircle } from 'lucide-react';

interface TeamMember {
  id: string;
  user_id: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  role: 'farm_manager' | 'farm_supervisor';
  is_active: boolean;
  assigned_at: string;
}

interface Props {
  farmId: string;
  userRole: 'farm_manager' | 'farm_supervisor' | 'admin' | null;
}

export default function FarmTeamManagement({ farmId, userRole }: Props) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);

  useEffect(() => {
    loadTeamMembers();
  }, [farmId]);

  const loadTeamMembers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('farm_team_members')
        .select('*')
        .eq('farm_id', farmId)
        .order('role', { ascending: true })
        .order('assigned_at', { ascending: false });

      if (error) throw error;
      setTeamMembers(data || []);
    } catch (error) {
      console.error('Error loading team members:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadge = (role: string) => {
    if (role === 'farm_manager') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <Shield className="w-3 h-3" />
          مدير المزرعة
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
        <Eye className="w-3 h-3" />
        مشرف تشغيلي
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* العنوان */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-lg flex items-center justify-center">
              <Users className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-1">إدارة فريق المزرعة</h2>
              <p className="text-blue-100">
                المدراء والمشرفين المسؤولين عن التشغيل والمتابعة
              </p>
            </div>
          </div>
          {(userRole === 'admin' || userRole === 'farm_manager') && (
            <button
              onClick={() => setShowAddMember(true)}
              className="px-6 py-3 bg-white text-blue-600 rounded-lg font-bold hover:bg-blue-50 transition-all flex items-center gap-2 shadow-lg"
            >
              <UserPlus className="w-5 h-5" />
              إضافة عضو
            </button>
          )}
        </div>
      </div>

      {/* شرح توضيحي */}
      <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-bold text-amber-900 mb-2">متطلبات إضافة عضو فريق:</h3>
            <ul className="text-sm text-amber-800 space-y-1.5 mr-4 list-disc">
              <li>يجب أن يكون العضو مسجل في النظام (لديه حساب مستخدم)</li>
              <li>الربط يتم عبر <span className="font-bold">user_id</span> الخاص بالعضو</li>
              <li>لا يمكن ربط عضو بدون <span className="font-bold">user_id</span> صالح</li>
              <li>المدراء لديهم صلاحية اعتماد التقارير وإنشاء المهام</li>
              <li>المشرفون لديهم صلاحية تنفيذ المهام ورفع الإثباتات</li>
            </ul>
          </div>
        </div>
      </div>

      {/* إحصائيات الفريق */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-sky-50 border-2 border-blue-200 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-blue-600 font-medium mb-1">إجمالي الأعضاء</div>
              <div className="text-3xl font-bold text-blue-700">{teamMembers.length}</div>
            </div>
            <Users className="w-10 h-10 text-blue-400" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-emerald-600 font-medium mb-1">النشطين</div>
              <div className="text-3xl font-bold text-emerald-700">
                {teamMembers.filter(m => m.is_active).length}
              </div>
            </div>
            <UserCheck className="w-10 h-10 text-emerald-400" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-gray-50 to-slate-50 border-2 border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600 font-medium mb-1">المعطلين</div>
              <div className="text-3xl font-bold text-gray-700">
                {teamMembers.filter(m => !m.is_active).length}
              </div>
            </div>
            <UserX className="w-10 h-10 text-gray-400" />
          </div>
        </div>
      </div>

      {/* قائمة الأعضاء */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">أعضاء الفريق</h3>
          <p className="text-sm text-gray-600 mt-1">
            جميع المدراء والمشرفين المسجلين في هذه المزرعة
          </p>
        </div>

        <div className="divide-y divide-gray-200">
          {teamMembers.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">لا يوجد أعضاء فريق</h3>
              <p className="text-gray-600 mb-6">لم يتم إضافة أي مدراء أو مشرفين لهذه المزرعة بعد</p>
              {(userRole === 'admin' || userRole === 'farm_manager') && (
                <button
                  onClick={() => setShowAddMember(true)}
                  className="px-6 py-3 bg-blue-500 text-white rounded-lg font-bold hover:bg-blue-600 transition-all inline-flex items-center gap-2"
                >
                  <UserPlus className="w-5 h-5" />
                  إضافة عضو فريق
                </button>
              )}
            </div>
          ) : (
            teamMembers.map((member) => (
              <div key={member.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-4">
                  {/* الأيقونة */}
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 ${
                    member.is_active
                      ? member.role === 'farm_manager'
                        ? 'bg-blue-100'
                        : 'bg-emerald-100'
                      : 'bg-gray-100'
                  }`}>
                    <Users className={`w-7 h-7 ${
                      member.is_active
                        ? member.role === 'farm_manager'
                          ? 'text-blue-600'
                          : 'text-emerald-600'
                        : 'text-gray-400'
                    }`} />
                  </div>

                  {/* المعلومات */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-lg font-bold text-gray-900 mb-1">{member.full_name}</h4>
                        <div className="flex items-center gap-2 flex-wrap">
                          {getRoleBadge(member.role)}
                          {member.is_active ? (
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
                          {!member.user_id && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800">
                              ⚠️ بدون user_id
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                      {member.email && (
                        <div>
                          <span className="text-gray-500">البريد:</span>
                          <span className="text-gray-900 mr-2 font-medium">{member.email}</span>
                        </div>
                      )}
                      {member.phone && (
                        <div>
                          <span className="text-gray-500">الجوال:</span>
                          <span className="text-gray-900 mr-2 font-medium">{member.phone}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-500">تاريخ الإضافة:</span>
                        <span className="text-gray-900 mr-2 font-medium">
                          {new Date(member.assigned_at).toLocaleDateString('ar-SA')}
                        </span>
                      </div>
                    </div>

                    {member.user_id && (
                      <div className="mt-3 text-xs text-gray-500">
                        <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                          User ID: {member.user_id.slice(0, 8)}...
                        </span>
                      </div>
                    )}
                  </div>

                  {/* أزرار الإجراءات */}
                  {(userRole === 'admin' || userRole === 'farm_manager') && (
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

      {/* شرح الأدوار والصلاحيات */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* مدير المزرعة */}
        <div className="bg-gradient-to-br from-blue-50 to-sky-50 border-2 border-blue-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-blue-900">مدير المزرعة</h3>
              <p className="text-sm text-blue-700">farm_manager</p>
            </div>
          </div>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <span>إنشاء المهام وتكليف المشرفين</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <span>اعتماد الإثباتات المرفوعة من المشرفين</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <span>إرسال التقارير الإدارية لـ B2F</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <span>رفض الإثباتات غير المطابقة</span>
            </li>
          </ul>
        </div>

        {/* مشرف تشغيلي */}
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-emerald-500 rounded-lg flex items-center justify-center">
              <Eye className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-emerald-900">مشرف تشغيلي</h3>
              <p className="text-sm text-emerald-700">farm_supervisor</p>
            </div>
          </div>
          <ul className="space-y-2 text-sm text-emerald-800">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
              <span>استلام المهام من المدير</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
              <span>تنفيذ المهام الميدانية</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
              <span>رفع الإثباتات (صور - تقارير)</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
              <span>إرسال الإثباتات للمراجعة والاعتماد</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
