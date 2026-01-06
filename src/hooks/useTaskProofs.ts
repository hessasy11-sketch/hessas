import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface TaskProof {
  id: string;
  task_id: string;
  image_url: string;
  description: string | null;
  notes: string | null;
  uploaded_at: string;
}

export interface FarmTask {
  id: string;
  farm_id: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  requires_proof: boolean;
  proof_notes: string | null;
  assigned_to: string | null;
  assigned_to_name: string | null;
  created_by: string | null;
  created_by_name: string | null;
  approved_by: string | null;
  approval_notes: string | null;
  rejection_reason: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useTaskProofs(taskId: string | undefined) {
  const [proofs, setProofs] = useState<TaskProof[]>([]);
  const [task, setTask] = useState<FarmTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (taskId) {
      loadTaskAndProofs();
    }
  }, [taskId]);

  const loadTaskAndProofs = async () => {
    if (!taskId) return;

    try {
      setLoading(true);
      setError(null);

      // Load task
      const { data: taskData, error: taskError } = await supabase
        .from('farm_tasks')
        .select('*')
        .eq('id', taskId)
        .maybeSingle();

      if (taskError) throw taskError;
      setTask(taskData);

      // Load proofs
      const { data: proofsData, error: proofsError } = await supabase
        .from('task_proofs')
        .select('*')
        .eq('task_id', taskId)
        .order('uploaded_at', { ascending: false });

      if (proofsError) throw proofsError;
      setProofs(proofsData || []);

    } catch (err: any) {
      console.error('❌ Error loading task/proofs:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const uploadProof = async (file: File, notes: string = '') => {
    if (!taskId || !task) return;

    try {
      setUploading(true);
      setError(null);

      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${taskId}_${Date.now()}.${fileExt}`;
      const filePath = `${task.farm_id}/${fileName}`;

      console.log('📤 Uploading proof:', filePath);

      const { error: uploadError } = await supabase.storage
        .from('task-proofs')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('task-proofs')
        .getPublicUrl(filePath);

      // Insert proof record
      const { error: insertError } = await supabase
        .from('task_proofs')
        .insert({
          task_id: taskId,
          image_url: urlData.publicUrl,
          notes: notes || null
        });

      if (insertError) throw insertError;

      // Submit task with proof (calls function that logs to timeline)
      const { data: submitResult, error: submitError } = await supabase
        .rpc('submit_task_with_proof', {
          p_task_id: taskId,
          p_submitted_by: null,
          p_submitted_by_name: task.assigned_to_name || 'عامل',
          p_proof_notes: notes || null
        });

      if (submitError) throw submitError;

      console.log('✅ Proof uploaded and task submitted:', submitResult);

      // Reload data
      await loadTaskAndProofs();

      return { success: true };
    } catch (err: any) {
      console.error('❌ Error uploading proof:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setUploading(false);
    }
  };

  const approveTask = async (approverName: string, notes: string = '') => {
    if (!taskId) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .rpc('approve_task_with_proof', {
          p_task_id: taskId,
          p_approved_by: null,
          p_approved_by_name: approverName,
          p_approval_notes: notes || null
        });

      if (error) throw error;

      console.log('✅ Task approved:', data);

      // Reload data
      await loadTaskAndProofs();

      return { success: true };
    } catch (err: any) {
      console.error('❌ Error approving task:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const rejectTask = async (rejectorName: string, reason: string) => {
    if (!taskId) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .rpc('reject_task_with_proof', {
          p_task_id: taskId,
          p_rejected_by: null,
          p_rejected_by_name: rejectorName,
          p_rejection_reason: reason
        });

      if (error) throw error;

      console.log('✅ Task rejected:', data);

      // Reload data
      await loadTaskAndProofs();

      return { success: true };
    } catch (err: any) {
      console.error('❌ Error rejecting task:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  return {
    task,
    proofs,
    loading,
    uploading,
    error,
    uploadProof,
    approveTask,
    rejectTask,
    reload: loadTaskAndProofs
  };
}
