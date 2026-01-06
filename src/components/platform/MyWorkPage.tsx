import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMyWork } from '../../hooks/useMyWork';
import BackToGatewayButton from './BackToGatewayButton';
import {
  Briefcase,
  CheckCircle,
  Clock,
  AlertTriangle,
  FileCheck,
  TrendingUp,
  RefreshCw,
  Calendar,
  DollarSign,
  FileText,
} from 'lucide-react';

export default function MyWorkPage() {
  const navigate = useNavigate();
  const [staffId, setStaffId] = useState<string | null>(null);
  const [staffName, setStaffName] = useState<string>('الموظف');
  const [hasApprovalRole, setHasApprovalRole] = useState(false);

  const { tasks, approvals, alerts, stats, loading, error, refresh } = useMyWork(
    staffId || undefined
  );

  useEffect(() => {
    const currentStaffId = 'current-staff-id';
    const currentStaffName = 'اسم الموظف';
    const hasApproval = true;

    setStaffId(currentStaffId);
    setStaffName(currentStaffName);
    setHasApprovalRole(hasApproval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">جاري تحميل عملك اليوم...</p>
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

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'overdue':
        return <Clock className="w-5 h-5 text-red-600" />;
      case 'missing_proof':
        return <FileCheck className="w-5 h-5 text-orange-600" />;
      case 'urgent':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-gray-600" />;
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'overdue':
        return 'bg-red-50 border-red-200';
      case 'missing_proof':
        return 'bg-orange-50 border-orange-200';
      case 'urgent':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getApprovalIcon = (type: string) => {
    switch (type) {
      case 'expense':
        return <DollarSign className="w-5 h-5 text-green-600" />;
      case 'decision':
        return <FileText className="w-5 h-5 text-blue-600" />;
      case 'task':
        return <CheckCircle className="w-5 h-5 text-purple-600" />;
      default:
        return <FileCheck className="w-5 h-5 text-gray-600" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'under_review':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'معلق';
      case 'in_progress':
        return 'جاري العمل';
      case 'under_review':
        return 'قيد المراجعة';
      default:
        return status;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <BackToGatewayButton />

      <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white">
        <div className="max-w-[1400px] mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border-2 border-white/20">
                <Briefcase className="w-8 h-8 text-yellow-300" />
              </div>

              <div>
                <h1 className="text-3xl font-bold mb-1">عملي اليوم</h1>
                <p className="text-purple-100 text-lg">مرحباً {staffName}</p>
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

      <div className="max-w-[1400px] mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">المهام المفتوحة</p>
                <p className="text-2xl font-bold text-gray-900">{stats.openTasks}</p>
              </div>
            </div>
          </div>

          {hasApprovalRole && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <FileCheck className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">اعتمادات تنتظرني</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.pendingApprovals}</p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">تنبيهات عاجلة</p>
                <p className="text-2xl font-bold text-gray-900">{stats.urgentAlerts}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">مهامي الآن</h2>
                  <p className="text-sm text-gray-600">{tasks.length} مهمة مفتوحة</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {tasks.length === 0 ? (
                <div className="text-center py-8">
                  <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">لا توجد مهام مفتوحة</p>
                  <p className="text-sm text-gray-500">أنت محدث بجميع مهامك!</p>
                </div>
              ) : (
                tasks.map((task) => (
                  <div
                    key={task.id}
                    className="border border-gray-200 rounded-xl p-4 hover:border-purple-300 hover:shadow-md transition-all cursor-pointer"
                    onClick={() => navigate(`/admin/tasks/${task.id}`)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-bold text-gray-900">{task.title}</h3>
                      <span className={`px-2 py-1 rounded-lg text-xs font-medium ${getStatusColor(task.status)}`}>
                        {getStatusText(task.status)}
                      </span>
                    </div>

                    {task.description && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{task.description}</p>
                    )}

                    <div className="flex items-center gap-4 text-sm">
                      {task.due_date && (
                        <div className="flex items-center gap-1 text-gray-600">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(task.due_date)}</span>
                        </div>
                      )}
                      <div className={`flex items-center gap-1 font-medium ${getPriorityColor(task.priority)}`}>
                        <TrendingUp className="w-4 h-4" />
                        <span>{task.priority === 'high' ? 'عاجل' : task.priority === 'medium' ? 'متوسط' : 'عادي'}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="space-y-6">
            {hasApprovalRole && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
                      <FileCheck className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">اعتمادات تنتظرني</h2>
                      <p className="text-sm text-gray-600">{approvals.length} عنصر</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {approvals.length === 0 ? (
                    <div className="text-center py-8">
                      <FileCheck className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600">لا توجد اعتمادات معلقة</p>
                    </div>
                  ) : (
                    approvals.slice(0, 5).map((approval) => (
                      <div
                        key={approval.id}
                        className="border border-gray-200 rounded-xl p-4 hover:border-purple-300 hover:shadow-md transition-all cursor-pointer"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                            {getApprovalIcon(approval.type)}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-bold text-gray-900 mb-1">{approval.title}</h3>
                            {approval.amount && (
                              <p className="text-sm text-green-600 font-medium mb-2">
                                {approval.amount.toLocaleString('ar-SA')} ريال
                              </p>
                            )}
                            {approval.requester_name && (
                              <p className="text-xs text-gray-600 mb-2">من: {approval.requester_name}</p>
                            )}
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-500">{formatDate(approval.created_at)}</span>
                              <button className="px-3 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg text-xs font-medium hover:shadow-lg transition-all">
                                راجع الآن
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-600 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">تنبيهات عملي</h2>
                    <p className="text-sm text-gray-600">{alerts.length} تنبيه</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {alerts.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                    <p className="text-gray-600">لا توجد تنبيهات</p>
                    <p className="text-sm text-gray-500">كل شيء على ما يرام!</p>
                  </div>
                ) : (
                  alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`border-2 rounded-xl p-4 ${getAlertColor(alert.type)}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">{getAlertIcon(alert.type)}</div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{alert.message}</p>
                          {alert.task_id && (
                            <button
                              onClick={() => navigate(`/admin/tasks/${alert.task_id}`)}
                              className="text-xs text-purple-600 hover:text-purple-800 font-medium mt-2"
                            >
                              افتح المهمة ←
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
