import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface TaskDetails {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  created_at: string;
  assigned_to: string;
  assigned_to_name: string;
  assigned_by: string | null;
  assigned_by_name: string | null;
  requires_proof: boolean;
  proof_url: string | null;
  started_at: string | null;
  completed_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  notes: string | null;
  farm_id?: string;
  farm_name?: string;
  type: 'staff' | 'farm';
}

interface TimelineEvent {
  id: string;
  action: string;
  timestamp: string;
  actor_name: string | null;
  notes: string | null;
}

export function useTaskDetails(taskType: 'staff' | 'farm', taskId: string) {
  const [task, setTask] = useState<TaskDetails | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [canApprove, setCanApprove] = useState(false);

  useEffect(() => {
    fetchTaskDetails();
  }, [taskType, taskId]);

  const fetchTaskDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      if (taskType === 'staff') {
        await fetchStaffTask();
      } else {
        await fetchFarmTask();
      }

      await checkPermissions();
      await fetchTimeline();
    } catch (err) {
      console.error('Error fetching task details:', err);
      setError(err instanceof Error ? err.message : 'حدث خطأ في تحميل التفاصيل');
    } finally {
      setLoading(false);
    }
  };

  const fetchStaffTask = async () => {
    const { data, error } = await supabase
      .from('staff_tasks')
      .select(`
        *,
        assignee:platform_staff!staff_tasks_assigned_to_fkey(staff_name),
        assigner:platform_staff!staff_tasks_assigned_by_fkey(staff_name)
      `)
      .eq('id', taskId)
      .single();

    if (error) throw error;

    if (data) {
      setTask({
        id: data.id,
        title: data.title || 'مهمة',
        description: data.description,
        status: data.status,
        priority: data.priority || 'medium',
        due_date: data.due_date,
        created_at: data.created_at,
        assigned_to: data.assigned_to,
        assigned_to_name: data.assignee?.staff_name || 'غير معروف',
        assigned_by: data.assigned_by,
        assigned_by_name: data.assigner?.staff_name || null,
        requires_proof: data.requires_proof || false,
        proof_url: data.proof_url,
        started_at: data.started_at,
        completed_at: data.completed_at,
        approved_at: data.approved_at,
        rejected_at: data.rejected_at,
        rejection_reason: data.rejection_reason,
        notes: data.notes,
        type: 'staff',
      });
    }
  };

  const fetchFarmTask = async () => {
    const { data, error } = await supabase
      .from('farm_tasks')
      .select(`
        *,
        farm:b2f_farms(id, name),
        assignee:platform_staff!farm_tasks_assigned_to_user_id_fkey(staff_name),
        assigner:platform_staff!farm_tasks_created_by_fkey(staff_name)
      `)
      .eq('id', taskId)
      .single();

    if (error) throw error;

    if (data) {
      setTask({
        id: data.id,
        title: data.task_title || 'مهمة مزرعة',
        description: data.task_description,
        status: data.status,
        priority: data.priority || 'medium',
        due_date: data.due_date,
        created_at: data.created_at,
        assigned_to: data.assigned_to_user_id,
        assigned_to_name: data.assignee?.staff_name || 'غير معروف',
        assigned_by: data.created_by,
        assigned_by_name: data.assigner?.staff_name || null,
        requires_proof: data.requires_proof || false,
        proof_url: data.proof_url,
        started_at: data.started_at,
        completed_at: data.completed_at,
        approved_at: data.approved_at,
        rejected_at: data.rejected_at,
        rejection_reason: data.rejection_reason,
        notes: data.notes,
        farm_id: data.farm_id,
        farm_name: data.farm?.name,
        type: 'farm',
      });
    }
  };

  const checkPermissions = async () => {
    const savedSession = localStorage.getItem('staff_session');
    if (!savedSession) return;

    try {
      const session = JSON.parse(savedSession);
      const currentStaffId = session.staffId;
      const currentRole = session.role;

      // GM يرى كل شيء
      if (currentRole === 'general_manager') {
        setCanEdit(true);
        setCanApprove(true);
        return;
      }

      // الموظف المكلف
      if (task && task.assigned_to === currentStaffId) {
        setCanEdit(true);
      }

      // المدير/المشرف الذي أسندها
      if (task && task.assigned_by === currentStaffId) {
        setCanApprove(true);
      }

      // الأدوار التي لديها صلاحية اعتماد
      const approvalRoles = ['supervisor', 'manager', 'farm_manager', 'accountant'];
      if (approvalRoles.includes(currentRole)) {
        setCanApprove(true);
      }
    } catch (err) {
      console.error('Error checking permissions:', err);
    }
  };

  const fetchTimeline = async () => {
    const events: TimelineEvent[] = [];

    if (!task) return;

    // Created
    events.push({
      id: 'created',
      action: 'تم إنشاء المهمة',
      timestamp: task.created_at,
      actor_name: task.assigned_by_name,
      notes: null,
    });

    // Started
    if (task.started_at) {
      events.push({
        id: 'started',
        action: 'بدأ العمل على المهمة',
        timestamp: task.started_at,
        actor_name: task.assigned_to_name,
        notes: null,
      });
    }

    // Completed
    if (task.completed_at) {
      events.push({
        id: 'completed',
        action: 'تم إنهاء المهمة',
        timestamp: task.completed_at,
        actor_name: task.assigned_to_name,
        notes: task.proof_url ? `إثبات: ${task.proof_url}` : null,
      });
    }

    // Approved
    if (task.approved_at) {
      events.push({
        id: 'approved',
        action: 'تم اعتماد المهمة',
        timestamp: task.approved_at,
        actor_name: null,
        notes: null,
      });
    }

    // Rejected
    if (task.rejected_at) {
      events.push({
        id: 'rejected',
        action: 'تم رفض المهمة',
        timestamp: task.rejected_at,
        actor_name: null,
        notes: task.rejection_reason,
      });
    }

    setTimeline(events.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    ));
  };

  const updateTaskStatus = async (newStatus: string, notes?: string) => {
    try {
      const table = taskType === 'staff' ? 'staff_tasks' : 'farm_tasks';
      const updateData: any = { status: newStatus };

      if (newStatus === 'in_progress' && !task?.started_at) {
        updateData.started_at = new Date().toISOString();
      }

      if ((newStatus === 'completed' || newStatus === 'under_review' || newStatus === 'awaiting_approval') && !task?.completed_at) {
        updateData.completed_at = new Date().toISOString();
      }

      if (notes) {
        updateData.notes = notes;
      }

      const { error } = await supabase
        .from(table)
        .update(updateData)
        .eq('id', taskId);

      if (error) throw error;

      await fetchTaskDetails();
      return true;
    } catch (err) {
      console.error('Error updating task status:', err);
      throw err;
    }
  };

  const uploadProof = async (proofUrl: string) => {
    try {
      const table = taskType === 'staff' ? 'staff_tasks' : 'farm_tasks';

      const { error } = await supabase
        .from(table)
        .update({ proof_url: proofUrl })
        .eq('id', taskId);

      if (error) throw error;

      await fetchTaskDetails();
      return true;
    } catch (err) {
      console.error('Error uploading proof:', err);
      throw err;
    }
  };

  const approveTask = async () => {
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

      await fetchTaskDetails();
      return true;
    } catch (err) {
      console.error('Error approving task:', err);
      throw err;
    }
  };

  const rejectTask = async (reason: string) => {
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

      await fetchTaskDetails();
      return true;
    } catch (err) {
      console.error('Error rejecting task:', err);
      throw err;
    }
  };

  return {
    task,
    timeline,
    loading,
    error,
    canEdit,
    canApprove,
    updateTaskStatus,
    uploadProof,
    approveTask,
    rejectTask,
    refresh: fetchTaskDetails,
  };
}
