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
  Play,
  Check,
  Leaf,
  User,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

type TaskTab = 'open' | 'awaiting' | 'completed';

export default function MyWorkPage() {
  const navigate = useNavigate();
  const [staffName, setStaffName] = useState<string>('الموظف');
  const [activeTab, setActiveTab] = useState<TaskTab>('open');
  const [updatingTask, setUpdatingTask] = useState<string | null>(null);

  const { data, loading, error, refresh, updateTaskStatus } = useMyWork();

  useEffect(() => {
    const savedSession = localStorage.getItem('staff_session');
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession);
        setStaffName(session.staffName || 'الموظف');
      } catch (err) {
        console.error('Error parsing session:', err);
      }
    }
  }, []);

  const handleUpdateTaskStatus = async (taskId: string, taskType: 'staff' | 'farm', newStatus: string) => {
    setUpdatingTask(taskId);
    try {
      await updateTaskStatus(taskId, taskType, newStatus);
    } catch (err) {
      console.error('Error updating task:', err);
      alert('حدث خطأ في تحديث المهمة');
    } finally {
      setUpdatingTask(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">جاري تحميل عملك اليوم...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border-2 border-red-200 p-8 max-w-md text-center">
          <AlertTriangle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">حدث خطأ</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={refresh}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-bold hover:shadow-lg transition-all"
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
      case 'needs_proof':
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
      case 'needs_proof':
        return 'bg-orange-50 border-orange-200';
      case 'urgent':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getAlertMessage = (alert: any) => {
    switch (alert.alertType) {
      case 'overdue':
        return `مهمة متأخرة: ${alert.title}`;
      case 'needs_proof':
        return `إثبات ناقص: ${alert.title}`;
      case 'urgent':
        return `مهمة عاجلة: ${alert.title}`;
      default:
        return alert.title;
    }
  };

  const getApprovalIcon = (type: string) => {
    switch (type) {
      case 'expense':
        return <DollarSign className="w-5 h-5 text-green-600" />;
      case 'decision':
        return <FileText className="w-5 h-5 text-blue-600" />;
      case 'task':
        return <CheckCircle className="w-5 h-5 text-blue-600" />;
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
      case 'awaiting_approval':
        return 'bg-purple-100 text-purple-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
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
      case 'awaiting_approval':
        return 'بانتظار الاعتماد';
      case 'completed':
        return 'مكتملة';
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

  const filteredTasks = (data?.tasks || []).filter(task => {
    if (activeTab === 'open') {
      return task.status === 'new' || task.status === 'in_progress';
    } else if (activeTab === 'awaiting') {
      return task.status === 'submitted';
    } else {
      return task.status === 'approved' || task.status === 'rejected';
    }
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
      <BackToGatewayButton />

      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 text-white">
        <div className="max-w-[1400px] mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border-2 border-white/20">
                <Briefcase className="w-8 h-8 text-blue-200" />
              </div>

              <div>
                <h1 className="text-3xl font-bold mb-1">عملي اليوم</h1>
                <p className="text-blue-100 text-lg">مرحباً {staffName}</p>
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
                <p className="text-2xl font-bold text-gray-900">{data?.counts.openTasks || 0}</p>
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
                  <p className="text-2xl font-bold text-gray-900">{data?.counts.awaitingApproval || 0}</p>
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
                <p className="text-2xl font-bold text-gray-900">{data?.counts.overdueTasks || 0}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">مهامي الآن</h2>
                  <p className="text-sm text-gray-600">{filteredTasks.length} مهمة</p>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mb-6 border-b border-gray-200">
              <button
                onClick={() => setActiveTab('open')}
                className={`px-4 py-2 font-medium transition-all ${
                  activeTab === 'open'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                مفتوحة ({tasks.filter(t => t.status === 'new' || t.status === 'in_progress').length})
              </button>
              <button
                onClick={() => setActiveTab('awaiting')}
                className={`px-4 py-2 font-medium transition-all ${
                  activeTab === 'awaiting'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                بانتظار الاعتماد ({tasks.filter(t => t.status === 'submitted').length})
              </button>
              <button
                onClick={() => setActiveTab('completed')}
                className={`px-4 py-2 font-medium transition-all ${
                  activeTab === 'completed'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                مكتملة ({tasks.filter(t => t.status === 'approved' || t.status === 'rejected').length})
              </button>
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {filteredTasks.length === 0 ? (
                <div className="text-center py-8">
                  <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">لا توجد مهام في هذا القسم</p>
                  {activeTab === 'open' && (
                    <p className="text-sm text-gray-500">أنت محدث بجميع مهامك!</p>
                  )}
                </div>
              ) : (
                filteredTasks.map((task) => (
                  <div
                    key={task.id}
                    className="border border-gray-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                    onClick={() => navigate(`/admin/tasks/${task.taskType}/${task.id}`)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-gray-900">{task.title}</h3>
                          {task.taskType === 'farm' && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium flex items-center gap-1">
                              <Leaf className="w-3 h-3" />
                              مزرعة
                            </span>
                          )}
                        </div>
                        {task.farmName && (
                          <p className="text-xs text-gray-600 mb-1">📍 {task.farmName}</p>
                        )}
                      </div>
                      <span className={`px-2 py-1 rounded-lg text-xs font-medium ${getStatusColor(task.status)}`}>
                        {getStatusText(task.status)}
                      </span>
                    </div>

                    {task.description && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{task.description}</p>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm">
                        {task.dueDate && (
                          <div className="flex items-center gap-1 text-gray-600">
                            <Calendar className="w-4 h-4" />
                            <span>{formatDate(task.dueDate)}</span>
                          </div>
                        )}
                        <div className={`flex items-center gap-1 font-medium ${getPriorityColor(task.priority)}`}>
                          <TrendingUp className="w-4 h-4" />
                          <span>{task.priority === 'high' ? 'عاجل' : task.priority === 'medium' ? 'متوسط' : 'عادي'}</span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {(task.status === 'new') && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateTaskStatus(task.id, task.taskType, 'in_progress');
                            }}
                            disabled={updatingTask === task.id}
                            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-all disabled:opacity-50"
                          >
                            <Play className="w-3 h-3" />
                            بدء
                          </button>
                        )}
                        {(task.status === 'in_progress') && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateTaskStatus(task.id, task.taskType, 'submitted');
                            }}
                            disabled={updatingTask === task.id}
                            className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium transition-all disabled:opacity-50"
                          >
                            <FileCheck className="w-3 h-3" />
                            إرسال للاعتماد
                          </button>
                        )}
                        {(task.status === 'submitted') && (
                          <span className="text-xs text-gray-500 px-3 py-1.5">بانتظار الموافقة...</span>
                        )}
                        {(task.status === 'approved') && (
                          <span className="text-xs text-green-600 px-3 py-1.5 font-medium">✓ تم الاعتماد</span>
                        )}
                        {(task.status === 'rejected') && (
                          <span className="text-xs text-red-600 px-3 py-1.5 font-medium">✗ مرفوضة</span>
                        )}
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
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <FileCheck className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">اعتمادات تنتظرني</h2>
                      <p className="text-sm text-gray-600">{data?.approvals.length || 0} عنصر</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {(data?.approvals || []).length === 0 ? (
                    <div className="text-center py-8">
                      <FileCheck className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600">لا توجد اعتمادات معلقة</p>
                    </div>
                  ) : (
                    (data?.approvals || []).slice(0, 5).map((approval) => (
                      <div
                        key={approval.id}
                        className="border border-gray-200 rounded-xl p-4 hover:border-purple-300 hover:shadow-md transition-all cursor-pointer"
                        onClick={() => {
                          if (approval.approvalType === 'expense') {
                            navigate('/admin/operations-room/b2f');
                          } else if (approval.approvalType === 'decision') {
                            navigate('/admin/operations-room/global');
                          }
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                            {getApprovalIcon(approval.approvalType)}
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
                              <button className="px-3 py-1 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg text-xs font-medium hover:shadow-lg transition-all">
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
                    <p className="text-sm text-gray-600">{data?.alerts.length || 0} تنبيه</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {(data?.alerts || []).length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                    <p className="text-gray-600">لا توجد تنبيهات</p>
                    <p className="text-sm text-gray-500">كل شيء على ما يرام!</p>
                  </div>
                ) : (
                  (data?.alerts || []).map((alert) => (
                    <div
                      key={alert.id}
                      className={`border-2 rounded-xl p-4 ${getAlertColor(alert.alertType)}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">{getAlertIcon(alert.alertType)}</div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{getAlertMessage(alert)}</p>
                          <button
                            onClick={() => {
                              const task = (data?.tasks || []).find(t => t.id === alert.id);
                              if (task?.status === 'pending' || task?.status === 'in_progress') {
                                setActiveTab('open');
                              } else if (task?.status === 'under_review' || task?.status === 'awaiting_approval') {
                                setActiveTab('awaiting');
                              }
                            }}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium mt-2"
                          >
                            افتح المهمة ←
                          </button>
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
