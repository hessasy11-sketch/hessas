import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useImpersonation } from '../../contexts/ImpersonationContext';
import { useImpersonationControl } from '../../hooks/useImpersonationControl';
import BackToGatewayButton from './BackToGatewayButton';
import {
  Crown,
  Eye,
  User,
  Clock,
  Shield,
  Activity,
  Search,
  AlertTriangle,
  RefreshCw,
  CheckCircle,
  XCircle,
} from 'lucide-react';

export default function GMControlPanel() {
  const navigate = useNavigate();
  const { startImpersonation, isGM: contextIsGM } = useImpersonation();
  const { isGM, gmId, staffMembers, logs, activeImpersonations, loading, error, refresh } =
    useImpersonationControl();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'staff' | 'active' | 'logs'>('staff');

  const handleStartImpersonation = async (staffId: string, staffName: string, role?: string, department?: string) => {
    await startImpersonation(staffId, staffName, role, department);
    navigate('/admin/my-work');
  };

  const filteredStaff = staffMembers.filter(
    (staff) =>
      staff.name_ar.toLowerCase().includes(searchQuery.toLowerCase()) ||
      staff.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (staff.department && staff.department.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!isGM) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border-2 border-red-200 p-8 max-w-md text-center">
          <Shield className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">وصول محظور</h2>
          <p className="text-gray-600 mb-6">هذه اللوحة متاحة فقط للمدير العام</p>
          <button
            onClick={() => navigate('/admin/gateway')}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold hover:shadow-lg transition-all"
          >
            العودة للبوابة
          </button>
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
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold hover:shadow-lg transition-all"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'general_manager':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'finance_manager':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'operations_manager':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'farm_manager':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case 'general_manager':
        return 'مدير عام';
      case 'finance_manager':
        return 'مدير مالي';
      case 'operations_manager':
        return 'مدير عمليات';
      case 'farm_manager':
        return 'مدير مزرعة';
      case 'supervisor':
        return 'مشرف';
      case 'employee':
        return 'موظف';
      default:
        return role;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <BackToGatewayButton />

      <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white">
        <div className="max-w-[1600px] mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border-2 border-white/20">
                <Crown className="w-8 h-8 text-yellow-300" />
              </div>

              <div>
                <h1 className="text-3xl font-bold mb-1">لوحة التحكم المطلقة</h1>
                <p className="text-amber-100 text-lg">وضع المراقبة (View-As) - المدير العام فقط</p>
              </div>
            </div>

            <button
              onClick={refresh}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all backdrop-blur-sm"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="font-medium">تحديث</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">إجمالي الموظفين</p>
                <p className="text-2xl font-bold text-gray-900">{staffMembers.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Eye className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">جلسات نشطة</p>
                <p className="text-2xl font-bold text-gray-900">{activeImpersonations.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Activity className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">سجلات اليوم</p>
                <p className="text-2xl font-bold text-gray-900">
                  {logs.filter((log) => {
                    const logDate = new Date(log.created_at);
                    const today = new Date();
                    return logDate.toDateString() === today.toDateString();
                  }).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-4 mb-6 border-b border-gray-200 pb-4">
            <button
              onClick={() => setActiveTab('staff')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === 'staff'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              الموظفين ({staffMembers.length})
            </button>
            <button
              onClick={() => setActiveTab('active')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === 'active'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              جلسات نشطة ({activeImpersonations.length})
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === 'logs'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              السجلات ({logs.length})
            </button>
          </div>

          {activeTab === 'staff' && (
            <div>
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="بحث بالاسم أو الدور أو القسم..."
                    className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {filteredStaff.length === 0 ? (
                  <div className="text-center py-12">
                    <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">لا توجد نتائج</p>
                  </div>
                ) : (
                  filteredStaff.map((staff) => (
                    <div
                      key={staff.id}
                      className="border border-gray-200 rounded-xl p-4 hover:border-amber-300 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center">
                            <User className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900 mb-1">{staff.name_ar}</h3>
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-1 rounded-lg text-xs font-medium border ${getRoleBadgeColor(
                                  staff.role
                                )}`}
                              >
                                {getRoleText(staff.role)}
                              </span>
                              {staff.department && (
                                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium">
                                  {staff.department}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleStartImpersonation(staff.id, staff.name_ar, staff.role, staff.department || undefined)}
                          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold hover:shadow-lg transition-all"
                        >
                          <Eye className="w-4 h-4" />
                          <span>مراقبة</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'active' && (
            <div className="space-y-3">
              {activeImpersonations.length === 0 ? (
                <div className="text-center py-12">
                  <Eye className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">لا توجد جلسات نشطة</p>
                </div>
              ) : (
                activeImpersonations.map((session, index) => (
                  <div
                    key={index}
                    className="border-2 border-orange-200 bg-orange-50 rounded-xl p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center animate-pulse">
                          <Eye className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 mb-1">{session.target_staff_name}</h3>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span>بدأت: {formatDate(session.started_at)}</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              <span className="font-medium">{session.duration_minutes} دقيقة</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {logs.length === 0 ? (
                <div className="text-center py-12">
                  <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">لا توجد سجلات</p>
                </div>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className={`border rounded-xl p-4 ${
                      log.action === 'started'
                        ? 'border-green-200 bg-green-50'
                        : 'border-red-200 bg-red-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            log.action === 'started' ? 'bg-green-500' : 'bg-red-500'
                          }`}
                        >
                          {log.action === 'started' ? (
                            <CheckCircle className="w-5 h-5 text-white" />
                          ) : (
                            <XCircle className="w-5 h-5 text-white" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 mb-1">
                            {log.action === 'started' ? 'بدء المراقبة' : 'إيقاف المراقبة'}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            {log.target_staff_name && (
                              <span className="font-medium">{log.target_staff_name}</span>
                            )}
                            <span>{formatDate(log.created_at)}</span>
                            {log.current_path && (
                              <span className="text-xs bg-gray-200 px-2 py-1 rounded">
                                {log.current_path}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
