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
  source: 'staff' | 'farm';
  farm_id?: string;
  farm_name?: string;
  requires_proof?: boolean;
  proof_url?: string | null;
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

    const allTasks: Task[] = [];

    // جلب من staff_tasks
    const { data: staffTasksData, error: staffError } = await supabase
      .from('staff_tasks')
      .select('*')
      .eq('assigned_to', staffId)
      .in('status', ['pending', 'in_progress', 'under_review'])
      .order('created_at', { ascending: false });

    if (staffError) {
      console.error('Error fetching staff tasks:', staffError);
    } else if (staffTasksData) {
      allTasks.push(
        ...staffTasksData.map((task: any) => ({
          id: task.id,
          title: task.title || 'مهمة',
          description: task.description,
          status: task.status,
          priority: task.priority || 'medium',
          due_date: task.due_date,
          created_at: task.created_at,
          source: 'staff' as const,
          requires_proof: task.requires_proof || false,
          proof_url: task.proof_url,
        }))
      );
    }

    // جلب من farm_tasks
    const { data: farmTasksData, error: farmError } = await supabase
      .from('farm_tasks')
      .select(`
        *,
        farm:b2f_farms!inner(id, name)
      `)
      .eq('assigned_to_user_id', staffId)
      .in('status', ['pending', 'in_progress', 'awaiting_approval'])
      .order('created_at', { ascending: false });

    if (farmError) {
      console.error('Error fetching farm tasks:', farmError);
    } else if (farmTasksData) {
      allTasks.push(
        ...farmTasksData.map((task: any) => ({
          id: task.id,
          title: task.task_title || 'مهمة مزرعة',
          description: task.task_description,
          status: task.status,
          priority: task.priority || 'medium',
          due_date: task.due_date,
          created_at: task.created_at,
          source: 'farm' as const,
          farm_id: task.farm_id,
          farm_name: task.farm?.name,
          requires_proof: task.requires_proof || false,
          proof_url: task.proof_url,
        }))
      );
    }

    // ترتيب حسب التاريخ
    allTasks.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return allTasks.slice(0, 20);
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
    const now = new Date();

    try {
      // تحقق من staff_tasks
      const { data: staffTasks } = await supabase
        .from('staff_tasks')
        .select('*')
        .eq('assigned_to', staffId)
        .not('due_date', 'is', null);

      if (staffTasks) {
        staffTasks.forEach((task: any) => {
          const dueDate = new Date(task.due_date);
          if (dueDate < now && task.status !== 'completed') {
            alerts.push({
              id: `overdue-staff-${task.id}`,
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
              id: `urgent-staff-${task.id}`,
              type: 'urgent',
              message: `مهمة عاجلة: ${task.title} (تنتهي خلال 24 ساعة)`,
              task_id: task.id,
              created_at: task.due_date,
            });
          }
        });
      }

      // تحقق من farm_tasks
      const { data: farmTasks } = await supabase
        .from('farm_tasks')
        .select('*')
        .eq('assigned_to_user_id', staffId)
        .not('due_date', 'is', null);

      if (farmTasks) {
        farmTasks.forEach((task: any) => {
          const dueDate = new Date(task.due_date);
          if (dueDate < now && task.status !== 'completed') {
            alerts.push({
              id: `overdue-farm-${task.id}`,
              type: 'overdue',
              message: `مهمة مزرعة متأخرة: ${task.task_title}`,
              task_id: task.id,
              created_at: task.due_date,
            });
          } else if (
            dueDate.getTime() - now.getTime() < 24 * 60 * 60 * 1000 &&
            task.status !== 'completed'
          ) {
            alerts.push({
              id: `urgent-farm-${task.id}`,
              type: 'urgent',
              message: `مهمة مزرعة عاجلة: ${task.task_title} (تنتهي خلال 24 ساعة)`,
              task_id: task.id,
              created_at: task.due_date,
            });
          }
        });
      }

      // تحقق من الإثباتات الناقصة - staff_tasks
      const { data: staffProofs } = await supabase
        .from('staff_tasks')
        .select('*')
        .eq('assigned_to', staffId)
        .eq('requires_proof', true)
        .in('status', ['completed', 'under_review'])
        .is('proof_url', null);

      if (staffProofs && staffProofs.length > 0) {
        staffProofs.forEach((task: any) => {
          alerts.push({
            id: `proof-staff-${task.id}`,
            type: 'missing_proof',
            message: `إثبات ناقص: ${task.title}`,
            task_id: task.id,
            created_at: task.created_at,
          });
        });
      }

      // تحقق من الإثباتات الناقصة - farm_tasks
      const { data: farmProofs } = await supabase
        .from('farm_tasks')
        .select('*')
        .eq('assigned_to_user_id', staffId)
        .eq('requires_proof', true)
        .in('status', ['completed', 'awaiting_approval'])
        .is('proof_url', null);

      if (farmProofs && farmProofs.length > 0) {
        farmProofs.forEach((task: any) => {
          alerts.push({
            id: `proof-farm-${task.id}`,
            type: 'missing_proof',
            message: `إثبات مزرعة ناقص: ${task.task_title}`,
            task_id: task.id,
            created_at: task.created_at,
          });
        });
      }
    } catch (err) {
      console.error('Error fetching alerts:', err);
    }

    return alerts.sort((a, b) => {
      if (a.type === 'overdue' && b.type !== 'overdue') return -1;
      if (a.type !== 'overdue' && b.type === 'overdue') return 1;
      if (a.type === 'urgent' && b.type !== 'urgent' && b.type !== 'overdue') return -1;
      if (a.type !== 'urgent' && b.type === 'urgent' && a.type !== 'overdue') return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
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
