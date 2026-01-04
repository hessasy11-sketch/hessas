import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, FileCheck, Clock, AlertTriangle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { adminSessionManager } from '../../../utils/adminSessionManager';

interface TaskForApproval {
  id: string;
  title: string;
  description: string | null;
  farm_id: string;
  farm_name: string;
  status: string;
  completed_at: string | null;
  approved_at: string | null;
  staff_name: string | null;
  board: string;
  section: string | null;
  priority: string;
}

export default function InvestmentApprovalsTab() {
  const [tasks, setTasks] = useState<TaskForApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const session = adminSessionManager.getSession();

  useEffect(() => {
    loadPendingApprovals();
  }, []);

  const loadPendingApprovals = async () => {
    setLoading(true);

    if (!session?.user_id) {
      setLoading(false);
      return;
    }

    try {
      const { data: farms } = await supabase
        .from('b2f_farms')
        .select('id')
        .eq('investment_manager_user_id', session.user_id)
        .eq('is_active', true);

      if (!farms || farms.length === 0) {
        setTasks([]);
        setLoading(false);
        return;
      }

      const farmIds = farms.map(f => f.id);

      const { data, error } = await supabase
        .from('staff_tasks')
        .select(`
          id,
          title,
          description,
          farm_id,
          status,
          completed_at,
          approved_at,
          board,
          section,
          priority,
          staff_id,
          b2f_farms!inner(name)
        `)
        .in('farm_id', farmIds)
        .eq('approval_chain', 'farm_then_investment')
        .in('status', ['completed', 'awaiting_approval'])
        .is('investment_approved_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formatted = data?.map((task: any) => ({
        ...task,
        farm_name: task.b2f_farms?.name || 'غير محدد'
      })) || [];

      setTasks(formatted);
    } catch (error) {
      console.error('Error loading pending approvals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (taskId: string, notes: string = '') => {
    setProcessing(taskId);
    try {
      const { data, error } = await supabase
        .rpc('approve_task_investment', {
          p_task_id: taskId,
          p_notes: notes || null
        });

      if (error) throw error;

      if (data?.success) {
        await loadPendingApprovals();
      } else {
        alert(data?.error || 'فشل الاعتماد');
      }
    } catch (error: any) {
      console.error('Error approving task:', error);
      alert('حدث خطأ: ' + error.message);
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (taskId: string) => {
    const reason = prompt('سبب الرفض (اختياري):');
    if (reason === null) return;

    setProcessing(taskId);
    try {
      const { data, error } = await supabase
        .rpc('reject_task_investment', {
          p_task_id: taskId,
          p_reason: reason || 'لم يتم تحديد سبب'
        });

      if (error) throw error;

      if (data?.success) {
        await loadPendingApprovals();
      } else {
        alert(data?.error || 'فشل الرفض');
      }
    } catch (error: any) {
      console.error('Error rejecting task:', error);
      alert('حدث خطأ: ' + error.message);
    } finally {
      setProcessing(null);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-700';
      case 'high': return 'bg-orange-100 text-orange-700';
      case 'medium': return 'bg-blue-100 text-blue-700';
      case 'low': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-20">
        <CheckCircle className="w-16 h-16 text-green-300 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-2">لا توجد مهام بانتظار الاعتماد</h3>
        <p className="text-gray-600">جميع المهام تم اعتمادها استثمارياً</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">اعتمادات الاستثمار</h2>
          <p className="text-sm text-gray-600 mt-1">المهام التي تحتاج موافقتك الاستثمارية</p>
        </div>
        <div className="px-4 py-2 bg-orange-100 rounded-xl">
          <span className="text-2xl font-bold text-orange-600">{tasks.length}</span>
          <span className="text-sm text-gray-600 mr-2">بانتظار</span>
        </div>
      </div>

      <div className="space-y-4">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="border-2 border-orange-200 bg-white rounded-xl p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-bold text-gray-900">{task.title}</h3>
                  <span className={`text-xs px-2 py-1 rounded-lg font-medium ${getPriorityColor(task.priority)}`}>
                    {task.priority === 'urgent' ? 'عاجل' : task.priority === 'high' ? 'مرتفع' : task.priority === 'medium' ? 'متوسط' : 'منخفض'}
                  </span>
                </div>
                {task.description && (
                  <p className="text-sm text-gray-600 mb-3">{task.description}</p>
                )}
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <FileCheck className="w-3 h-3" />
                    {task.farm_name}
                  </span>
                  {task.completed_at && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      اكتملت: {new Date(task.completed_at).toLocaleDateString('ar-SA')}
                    </span>
                  )}
                </div>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-500" />
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <button
                onClick={() => handleApprove(task.id)}
                disabled={processing === task.id}
                className="flex-1 py-2 px-4 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                {processing === task.id ? 'جاري الاعتماد...' : 'اعتماد استثماري'}
              </button>
              <button
                onClick={() => handleReject(task.id)}
                disabled={processing === task.id}
                className="px-6 py-2 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                <XCircle className="w-4 h-4" />
                رفض
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
