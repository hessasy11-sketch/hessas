import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface Task {
  id: string;
  taskType: 'staff' | 'farm';
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  requiresProof: boolean;
  proofUrl: string | null;
  assignedToId: string;
  assignedToName: string;
  assignedById: string | null;
  assignedByName: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  farmId: string | null;
  farmName: string | null;
  notes: string | null;
  rejectionReason: string | null;
}

interface Approval {
  id: string;
  approvalType: 'decision' | 'task_staff' | 'task_farm' | 'expense';
  title: string;
  description: string | null;
  priority: string;
  section: string;
  createdAt: string;
  createdBy: string | null;
  createdByName: string | null;
  farmId: string | null;
  farmName: string | null;
}

interface Alert {
  id: string;
  taskType: 'staff' | 'farm';
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  requiresProof: boolean;
  proofUrl: string | null;
  farmId: string | null;
  farmName: string | null;
  alertType: 'overdue' | 'urgent' | 'needs_proof';
}

interface Counts {
  totalTasks: number;
  openTasks: number;
  inProgress: number;
  awaitingApproval: number;
  urgentTasks: number;
  overdueTasks: number;
  needsProof: number;
  totalApprovals: number;
}

interface MyWorkData {
  tasks: Task[];
  approvals: Approval[];
  alerts: Alert[];
  counts: Counts;
  role: string;
  isGM: boolean;
}

export function useMyWork() {
  const [data, setData] = useState<MyWorkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMyWork = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const savedSession = localStorage.getItem('staff_session');
      if (!savedSession) {
        throw new Error('لا توجد جلسة نشطة');
      }

      const session = JSON.parse(savedSession);
      const staffId = session.staffId;

      if (!staffId) {
        throw new Error('معرف الموظف غير موجود');
      }

      const { data: result, error: rpcError } = await supabase.rpc('get_my_work', {
        p_staff_id: staffId,
      });

      if (rpcError) {
        console.error('RPC Error:', rpcError);
        throw rpcError;
      }

      if (!result) {
        throw new Error('لا توجد بيانات');
      }

      setData({
        tasks: result.tasks || [],
        approvals: result.approvals || [],
        alerts: result.alerts || [],
        counts: result.counts || {
          totalTasks: 0,
          openTasks: 0,
          inProgress: 0,
          awaitingApproval: 0,
          urgentTasks: 0,
          overdueTasks: 0,
          needsProof: 0,
          totalApprovals: 0,
        },
        role: result.role || '',
        isGM: result.isGM || false,
      });
    } catch (err) {
      console.error('Error fetching my work:', err);
      setError(err instanceof Error ? err.message : 'حدث خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyWork();
  }, [fetchMyWork]);

  const updateTaskStatus = async (taskId: string, taskType: 'staff' | 'farm', newStatus: string) => {
    try {
      const table = taskType === 'staff' ? 'staff_tasks' : 'farm_tasks';
      const updateData: any = { status: newStatus };

      if (newStatus === 'in_progress') {
        updateData.started_at = new Date().toISOString();
      }

      if (newStatus === 'under_review' || newStatus === 'awaiting_approval' || newStatus === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase.from(table).update(updateData).eq('id', taskId);

      if (error) throw error;

      await fetchMyWork();
      return true;
    } catch (err) {
      console.error('Error updating task status:', err);
      throw err;
    }
  };

  const approveTask = async (taskId: string, taskType: 'staff' | 'farm') => {
    try {
      const table = taskType === 'staff' ? 'staff_tasks' : 'farm_tasks';

      const { error } = await supabase
        .from(table)
        .update({
          status: 'completed',
          approved_at: new Date().toISOString(),
        })
        .eq('id', taskId);

      if (error) throw error;

      await fetchMyWork();
      return true;
    } catch (err) {
      console.error('Error approving task:', err);
      throw err;
    }
  };

  const rejectTask = async (taskId: string, taskType: 'staff' | 'farm', reason: string) => {
    try {
      const table = taskType === 'staff' ? 'staff_tasks' : 'farm_tasks';

      const { error } = await supabase
        .from(table)
        .update({
          status: 'rejected',
          rejected_at: new Date().toISOString(),
          rejection_reason: reason,
        })
        .eq('id', taskId);

      if (error) throw error;

      await fetchMyWork();
      return true;
    } catch (err) {
      console.error('Error rejecting task:', err);
      throw err;
    }
  };

  const approveDecision = async (decisionId: string) => {
    try {
      const { error } = await supabase
        .from('decision_queue')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
        })
        .eq('id', decisionId);

      if (error) throw error;

      await fetchMyWork();
      return true;
    } catch (err) {
      console.error('Error approving decision:', err);
      throw err;
    }
  };

  const rejectDecision = async (decisionId: string, reason: string) => {
    try {
      const { error } = await supabase
        .from('decision_queue')
        .update({
          status: 'rejected',
          rejected_at: new Date().toISOString(),
          rejection_reason: reason,
        })
        .eq('id', decisionId);

      if (error) throw error;

      await fetchMyWork();
      return true;
    } catch (err) {
      console.error('Error rejecting decision:', err);
      throw err;
    }
  };

  const approveExpense = async (expenseId: string) => {
    try {
      const { error } = await supabase
        .from('farm_expenses')
        .update({
          approval_status: 'approved',
          approved_at: new Date().toISOString(),
        })
        .eq('id', expenseId);

      if (error) throw error;

      await fetchMyWork();
      return true;
    } catch (err) {
      console.error('Error approving expense:', err);
      throw err;
    }
  };

  const rejectExpense = async (expenseId: string, reason: string) => {
    try {
      const { error } = await supabase
        .from('farm_expenses')
        .update({
          approval_status: 'rejected',
          rejection_reason: reason,
        })
        .eq('id', expenseId);

      if (error) throw error;

      await fetchMyWork();
      return true;
    } catch (err) {
      console.error('Error rejecting expense:', err);
      throw err;
    }
  };

  return {
    data,
    loading,
    error,
    refresh: fetchMyWork,
    updateTaskStatus,
    approveTask,
    rejectTask,
    approveDecision,
    rejectDecision,
    approveExpense,
    rejectExpense,
  };
}
