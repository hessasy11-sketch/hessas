import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStaffManagement } from '../../hooks/useStaffManagement';
import CreateStaffModal from './CreateStaffModal';
import GrantAccessModal from './GrantAccessModal';
import BackToGatewayButton from './BackToGatewayButton';
import {
  Users,
  UserPlus,
  Search,
  MoreVertical,
  Ban,
  CheckCircle,
  Key,
  Eye,
  EyeOff,
  Copy,
  Check,
  Shield,
  AlertTriangle,
  Clock,
  RefreshCw,
  Lock,
} from 'lucide-react';

export default function StaffManagementPanel() {
  const navigate = useNavigate();
  const gmId = 'current-gm-id';

  const {
    staff,
    loading,
    error,
    createStaff,
    suspendStaff,
    activateStaff,
    resetPassword,
    refresh,
  } = useStaffManagement(gmId);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [grantAccessModal, setGrantAccessModal] = useState<{
    staffId: string;
    staffName: string;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [resetResult, setResetResult] = useState<{
    staffId: string;
    newPassword: string;
  } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  const filteredStaff = staff.filter(
    (s) =>
      s.name_ar.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.phone.includes(searchQuery) ||
      (s.role && s.role.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.department && s.department.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSuspend = async (staffId: string) => {
    if (!confirm('هل أنت متأكد من إيقاف هذا الحساب؟')) return;

    setActionLoading(true);
    try {
      const result = await suspendStaff(staffId, 'إيقاف من المدير العام');
      if (result.success) {
        setSelectedStaff(null);
      } else {
        alert(result.error || 'حدث خطأ');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleActivate = async (staffId: string) => {
    setActionLoading(true);
    try {
      const result = await activateStaff(staffId);
      if (result.success) {
        setSelectedStaff(null);
      } else {
        alert(result.error || 'حدث خطأ');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPassword = async (staffId: string) => {
    if (!confirm('هل أنت متأكد من إعادة تعيين كلمة المرور؟')) return;

    setActionLoading(true);
    try {
      const result = await resetPassword(staffId);
      if (result.success && result.new_password) {
        setResetResult({
          staffId,
          newPassword: result.new_password,
        });
        setSelectedStaff(null);
      } else {
        alert(result.error || 'حدث خطأ');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleCopyPassword = () => {
    if (resetResult?.newPassword) {
      navigator.clipboard.writeText(resetResult.newPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getRoleBadge = (role: string) => {
    const roleMap: Record<string, { text: string; color: string }> = {
      general_manager: { text: 'مدير عام', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
      finance_manager: { text: 'مدير مالي', color: 'bg-green-100 text-green-800 border-green-300' },
      operations_manager: {
        text: 'مدير عمليات',
        color: 'bg-blue-100 text-blue-800 border-blue-300',
      },
      farm_manager: { text: 'مدير مزرعة', color: 'bg-purple-100 text-purple-800 border-purple-300' },
      supervisor: { text: 'مشرف', color: 'bg-orange-100 text-orange-800 border-orange-300' },
      employee: { text: 'موظف', color: 'bg-gray-100 text-gray-800 border-gray-300' },
    };

    const badge = roleMap[role] || { text: role, color: 'bg-gray-100 text-gray-800 border-gray-300' };

    return (
      <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ar-SA', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border-2 border-red-200 p-8 max-w-md text-center">
          <AlertTriangle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">حدث خطأ</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={refresh}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold hover:shadow-lg transition-all"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <BackToGatewayButton />

      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="max-w-[1600px] mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border-2 border-white/20">
                <Users className="w-8 h-8" />
              </div>

              <div>
                <h1 className="text-3xl font-bold mb-1">إدارة الموظفين</h1>
                <p className="text-blue-100 text-lg">إنشاء وإدارة حسابات الموظفين</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={refresh}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all backdrop-blur-sm"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="font-medium">تحديث</span>
              </button>

              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-xl font-bold hover:shadow-lg transition-all"
              >
                <UserPlus className="w-5 h-5" />
                <span>إنشاء موظف جديد</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">إجمالي الموظفين</p>
                <p className="text-3xl font-bold text-gray-900">{staff.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">الحسابات النشطة</p>
                <p className="text-3xl font-bold text-gray-900">
                  {staff.filter((s) => s.is_active).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <Ban className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">الحسابات الموقوفة</p>
                <p className="text-3xl font-bold text-gray-900">
                  {staff.filter((s) => !s.is_active).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث بالاسم أو الجوال أو الدور أو القسم..."
                className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="space-y-3">
            {filteredStaff.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">لا توجد نتائج</p>
              </div>
            ) : (
              filteredStaff.map((member) => (
                <div
                  key={member.id}
                  className={`border rounded-xl p-4 transition-all ${
                    member.is_active
                      ? 'border-gray-200 hover:border-blue-300 hover:shadow-md'
                      : 'border-red-200 bg-red-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          member.is_active
                            ? 'bg-gradient-to-br from-blue-500 to-indigo-500'
                            : 'bg-gray-400'
                        }`}
                      >
                        <Users className="w-6 h-6 text-white" />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-bold text-gray-900 text-lg">{member.name_ar}</h3>
                          {!member.is_active && (
                            <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-bold rounded-lg border border-red-300">
                              موقوف
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="flex items-center gap-1 text-sm text-gray-600">
                            <Shield className="w-4 h-4" />
                            {member.phone}
                          </span>

                          {getRoleBadge(member.role)}

                          {member.department && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium">
                              {member.department}
                            </span>
                          )}

                          {member.last_login_at && (
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <Clock className="w-3 h-3" />
                              {formatDate(member.last_login_at)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="relative">
                      <button
                        onClick={() =>
                          setSelectedStaff(selectedStaff === member.id ? null : member.id)
                        }
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <MoreVertical className="w-5 h-5 text-gray-600" />
                      </button>

                      {selectedStaff === member.id && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setSelectedStaff(null)}
                          ></div>
                          <div className="absolute left-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-20">
                            {member.is_active ? (
                              <button
                                onClick={() => handleSuspend(member.id)}
                                disabled={actionLoading}
                                className="w-full px-4 py-2 text-right hover:bg-red-50 text-red-600 font-medium flex items-center gap-2 disabled:opacity-50"
                              >
                                <Ban className="w-4 h-4" />
                                <span>إيقاف الحساب</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleActivate(member.id)}
                                disabled={actionLoading}
                                className="w-full px-4 py-2 text-right hover:bg-green-50 text-green-600 font-medium flex items-center gap-2 disabled:opacity-50"
                              >
                                <CheckCircle className="w-4 h-4" />
                                <span>تفعيل الحساب</span>
                              </button>
                            )}

                            <button
                              onClick={() => handleResetPassword(member.id)}
                              disabled={actionLoading}
                              className="w-full px-4 py-2 text-right hover:bg-blue-50 text-blue-600 font-medium flex items-center gap-2 disabled:opacity-50"
                            >
                              <Key className="w-4 h-4" />
                              <span>إعادة تعيين كلمة المرور</span>
                            </button>

                            <button
                              onClick={() => {
                                setGrantAccessModal({
                                  staffId: member.id,
                                  staffName: member.name_ar
                                });
                                setSelectedStaff(null);
                              }}
                              disabled={actionLoading}
                              className="w-full px-4 py-2 text-right hover:bg-purple-50 text-purple-600 font-medium flex items-center gap-2 disabled:opacity-50 border-t border-gray-100"
                            >
                              <Lock className="w-4 h-4" />
                              <span>منح صلاحيات الوصول</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {showCreateModal && (
        <CreateStaffModal onClose={() => setShowCreateModal(false)} onCreate={createStaff} />
      )}

      {resetResult && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white p-6 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Key className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">كلمة المرور الجديدة</h2>
                  <p className="text-blue-100">تم إعادة تعيين كلمة المرور بنجاح</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4">
                <p className="text-sm text-yellow-800 font-medium">
                  ⚠️ احفظ أو انسخ كلمة المرور الآن
                </p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  كلمة المرور الجديدة
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={resetResult.newPassword}
                    readOnly
                    className="flex-1 px-4 py-2 bg-white border border-gray-300 rounded-lg font-mono text-lg"
                  />
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5 text-gray-600" />
                    ) : (
                      <Eye className="w-5 h-5 text-gray-600" />
                    )}
                  </button>
                  <button
                    onClick={handleCopyPassword}
                    className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    {copied ? (
                      <Check className="w-5 h-5 text-green-600" />
                    ) : (
                      <Copy className="w-5 h-5 text-gray-600" />
                    )}
                  </button>
                </div>
              </div>

              <button
                onClick={() => {
                  setResetResult(null);
                  setShowPassword(false);
                  setCopied(false);
                }}
                className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold hover:shadow-lg transition-all"
              >
                تم
              </button>
            </div>
          </div>
        </div>
      )}

      {grantAccessModal && (
        <GrantAccessModal
          staffId={grantAccessModal.staffId}
          staffName={grantAccessModal.staffName}
          onClose={() => setGrantAccessModal(null)}
          onSuccess={() => {
            refresh();
            setGrantAccessModal(null);
          }}
        />
      )}
    </div>
  );
}
