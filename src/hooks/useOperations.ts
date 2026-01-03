import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface OperationCard {
  id: string;
  request_id: string;
  farm_id: string;
  opportunity_id: string;
  investor_name: string;
  investor_phone: string;
  investor_email: string | null;
  trees_count: number;
  tree_type: string;
  contract_number: string;
  contract_duration_months: number;
  contract_start_date: string;
  contract_end_date: string;
  total_amount: number;
  payment_status: 'paid' | 'partial' | 'pending';
  payment_amount: number;
  payment_receipt_url: string | null;
  operation_status: 'scheduled' | 'active' | 'paused' | 'completed' | 'cancelled';
  scheduled_start_date: string | null;
  actual_start_date: string | null;
  completion_date: string | null;
  ai_suggestions: {
    recommended_start_date: string | null;
    optimal_season: string | null;
    expected_yield: any | null;
    maintenance_schedule: any[];
    risk_factors: any[];
  };
  manual_actions_log: any[];
  maintenance_log: any[];
  notes: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  transferred_at: string;
}

export interface FarmWithOperations {
  farm_id: string;
  farm_name: string;
  farm_location: string;
  total_operations: number;
  active_operations: number;
  scheduled_operations: number;
  paused_operations: number;
  completed_operations: number;
  total_trees: number;
  total_revenue: number;
  paid_amount: number;
  operations: OperationCard[];
}

export function useOperations() {
  const [farmsWithOperations, setFarmsWithOperations] = useState<FarmWithOperations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOperations = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: farms, error: farmsError } = await supabase
        .from('b2f_farms')
        .select('id, name, location')
        .eq('is_active', true)
        .order('name');

      if (farmsError) throw farmsError;

      const farmsData: FarmWithOperations[] = [];

      for (const farm of farms || []) {
        const { data: operations, error: opsError } = await supabase
          .from('b2f_operation_cards')
          .select('*')
          .eq('farm_id', farm.id)
          .order('created_at', { ascending: false });

        if (opsError) throw opsError;

        const stats = {
          total_operations: operations?.length || 0,
          active_operations: operations?.filter(o => o.operation_status === 'active').length || 0,
          scheduled_operations: operations?.filter(o => o.operation_status === 'scheduled').length || 0,
          paused_operations: operations?.filter(o => o.operation_status === 'paused').length || 0,
          completed_operations: operations?.filter(o => o.operation_status === 'completed').length || 0,
          total_trees: operations?.reduce((sum, o) => sum + o.trees_count, 0) || 0,
          total_revenue: operations?.reduce((sum, o) => sum + parseFloat(o.total_amount || '0'), 0) || 0,
          paid_amount: operations?.reduce((sum, o) => sum + parseFloat(o.payment_amount || '0'), 0) || 0,
        };

        farmsData.push({
          farm_id: farm.id,
          farm_name: farm.name,
          farm_location: farm.location,
          ...stats,
          operations: operations || [],
        });
      }

      setFarmsWithOperations(farmsData);
    } catch (err: any) {
      console.error('Error loading operations:', err);
      setError(err.message || 'Failed to load operations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOperations();
  }, []);

  const updateOperationStatus = async (
    operationId: string,
    newStatus: OperationCard['operation_status'],
    actionData?: any
  ) => {
    try {
      const updates: any = {
        operation_status: newStatus,
        updated_at: new Date().toISOString(),
      };

      if (newStatus === 'active' && actionData?.actual_start_date) {
        updates.actual_start_date = actionData.actual_start_date;
      }

      if (newStatus === 'completed' && actionData?.completion_date) {
        updates.completion_date = actionData.completion_date;
      }

      const { error: updateError } = await supabase
        .from('b2f_operation_cards')
        .update(updates)
        .eq('id', operationId);

      if (updateError) throw updateError;

      await supabase.from('b2f_operation_timeline').insert({
        operation_card_id: operationId,
        event_type: 'status_changed',
        event_title: `تغيير الحالة إلى ${getStatusLabel(newStatus)}`,
        event_description: actionData?.notes || null,
        event_data: actionData || {},
        performed_by: 'admin',
      });

      await loadOperations();

      return { success: true };
    } catch (err: any) {
      console.error('Error updating operation status:', err);
      return { success: false, error: err.message };
    }
  };

  const addManualAction = async (
    operationId: string,
    actionType: string,
    actionData: any
  ) => {
    try {
      const { data: operation, error: fetchError } = await supabase
        .from('b2f_operation_cards')
        .select('manual_actions_log')
        .eq('id', operationId)
        .single();

      if (fetchError) throw fetchError;

      const currentLog = operation?.manual_actions_log || [];
      const newAction = {
        type: actionType,
        timestamp: new Date().toISOString(),
        ...actionData,
      };

      const { error: updateError } = await supabase
        .from('b2f_operation_cards')
        .update({
          manual_actions_log: [...currentLog, newAction],
        })
        .eq('id', operationId);

      if (updateError) throw updateError;

      await supabase.from('b2f_operation_timeline').insert({
        operation_card_id: operationId,
        event_type: 'manual_action',
        event_title: actionData.title || 'إجراء يدوي',
        event_description: actionData.description,
        event_data: newAction,
        performed_by: 'admin',
      });

      await loadOperations();

      return { success: true };
    } catch (err: any) {
      console.error('Error adding manual action:', err);
      return { success: false, error: err.message };
    }
  };

  const rescheduleOperation = async (
    operationId: string,
    newScheduledDate: string,
    reason: string
  ) => {
    try {
      const { error: updateError } = await supabase
        .from('b2f_operation_cards')
        .update({
          scheduled_start_date: newScheduledDate,
        })
        .eq('id', operationId);

      if (updateError) throw updateError;

      await addManualAction(operationId, 'reschedule', {
        title: 'إعادة جدولة',
        description: reason,
        new_date: newScheduledDate,
      });

      return { success: true };
    } catch (err: any) {
      console.error('Error rescheduling operation:', err);
      return { success: false, error: err.message };
    }
  };

  return {
    farmsWithOperations,
    loading,
    error,
    updateOperationStatus,
    addManualAction,
    rescheduleOperation,
    reload: loadOperations,
  };
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    scheduled: 'مجدول',
    active: 'نشط',
    paused: 'متوقف مؤقتاً',
    completed: 'مكتمل',
    cancelled: 'ملغى',
  };
  return labels[status] || status;
}
