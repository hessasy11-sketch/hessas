import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  created_at: string;
}

interface ApprovalItem {
  id: string;
  type: 'expense' | 'decision' | 'task';
  title: string;
  amount?: number;
  status: string;
  created_at: string;
  requester_name?: string;
}

interface Alert {
  id: string;
  type: 'overdue' | 'missing_proof' | 'urgent';
  message: string;
  task_id?: string;
  created_at: string;
}

interface MyWorkData {
  tasks: Task[];
  approvals: ApprovalItem[];
  alerts: Alert[];
  stats: {
    openTasks: number;
    pendingApprovals: number;
    urgentAlerts: number;
  };
}

export function useMyWork(staffId?: string) {
  const [data, setData] = useState<MyWorkData>({
    tasks: [],
    approvals: [],
    alerts: [],
    stats: {
      openTasks: 0,
      pendingApprovals: 0,
      urgentAlerts: 0,
    },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!staffId) {
      setLoading(false);
      return;
    }

    fetchMyWork();
  }, [staffId]);

  const fetchMyWork = async () => {
    if (!staffId) return;

    try {
      setLoading(true);
      setError(null);

      const tasks = await fetchMyTasks();
      const approvals = await fetchMyApprovals();
      const alerts = await fetchMyAlerts();

      setData({
        tasks,
        approvals,
        alerts,
        stats: {
          openTasks: tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length,
          pendingApprovals: approvals.filter(a => a.status === 'pending').length,
          urgentAlerts: alerts.filter(a => a.type === 'urgent').length,
        },
      });
    } catch (err) {
      console.error('Error fetching my work:', err);
      setError(err instanceof Error ? err.message : 'حدث خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const fetchMyTasks = async (): Promise<Task[]> => {
    if (!staffId) return [];

    const { data, error } = await supabase
      .from('staff_tasks')
      .select('*')
      .eq('assigned_to', staffId)
      .in('status', ['pending', 'in_progress', 'under_review'])
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;
    return data || [];
  };

  const fetchMyApprovals = async (): Promise<ApprovalItem[]> => {
    if (!staffId) return [];

    const approvals: ApprovalItem[] = [];

    try {
      const { data: expenseData } = await supabase
        .from('farm_expenses')
        .select('*')
        .eq('status', 'pending_approval')
        .order('created_at', { ascending: false })
        .limit(5);

      if (expenseData) {
        approvals.push(
          ...expenseData.map((exp: any) => ({
            id: exp.id,
            type: 'expense' as const,
            title: exp.expense_name || 'مصروف',
            amount: exp.amount,
            status: exp.status,
            created_at: exp.created_at,
            requester_name: exp.requester_name,
          }))
        );
      }

      const { data: decisionData } = await supabase
        .from('decision_queue')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5);

      if (decisionData) {
        approvals.push(
          ...decisionData.map((dec: any) => ({
            id: dec.id,
            type: 'decision' as const,
            title: dec.title || 'قرار',
            status: dec.status,
            created_at: dec.created_at,
          }))
        );
      }
    } catch (err) {
      console.error('Error fetching approvals:', err);
    }

    return approvals.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  };

  const fetchMyAlerts = async (): Promise<Alert[]> => {
    if (!staffId) return [];

    const alerts: Alert[] = [];

    try {
      const { data: tasks } = await supabase
        .from('staff_tasks')
        .select('*')
        .eq('assigned_to', staffId)
        .not('due_date', 'is', null);

      if (tasks) {
        const now = new Date();
        tasks.forEach((task: any) => {
          const dueDate = new Date(task.due_date);
          if (dueDate < now && task.status !== 'completed') {
            alerts.push({
              id: `overdue-${task.id}`,
              type: 'overdue',
              message: `مهمة متأخرة: ${task.title}`,
              task_id: task.id,
              created_at: task.due_date,
            });
          } else if (
            dueDate.getTime() - now.getTime() < 24 * 60 * 60 * 1000 &&
            task.status !== 'completed'
          ) {
            alerts.push({
              id: `urgent-${task.id}`,
              type: 'urgent',
              message: `مهمة عاجلة: ${task.title} (تنتهي خلال 24 ساعة)`,
              task_id: task.id,
              created_at: task.due_date,
            });
          }
        });
      }

      const { data: proofsData } = await supabase
        .from('staff_tasks')
        .select('*')
        .eq('assigned_to', staffId)
        .eq('status', 'completed')
        .is('proof_url', null);

      if (proofsData && proofsData.length > 0) {
        proofsData.forEach((task: any) => {
          alerts.push({
            id: `proof-${task.id}`,
            type: 'missing_proof',
            message: `إثبات ناقص: ${task.title}`,
            task_id: task.id,
            created_at: task.created_at,
          });
        });
      }
    } catch (err) {
      console.error('Error fetching alerts:', err);
    }

    return alerts;
  };

  const refresh = () => {
    fetchMyWork();
  };

  return {
    ...data,
    loading,
    error,
    refresh,
  };
}
