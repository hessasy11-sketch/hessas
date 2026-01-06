import { useState } from 'react';
import { supabase } from '../lib/supabase';

export type DecisionType =
  | 'toggle_bookings_off'
  | 'toggle_bookings_on'
  | 'change_farm_manager'
  | 'review_farm_expenses';

export interface CreateDecisionParams {
  decisionType: DecisionType;
  farmId: string;
  requestedBy: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  notes?: string;
  targetStaffId?: string;
  expenseAmount?: number;
  expenseDescription?: string;
}

export function useCreateDecision() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createDecision = async (params: CreateDecisionParams) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('create_b2f_decision', {
        p_decision_type: params.decisionType,
        p_farm_id: params.farmId,
        p_requested_by: params.requestedBy,
        p_priority: params.priority || 'normal',
        p_notes: params.notes || null,
        p_target_staff_id: params.targetStaffId || null,
        p_expense_amount: params.expenseAmount || null,
        p_expense_description: params.expenseDescription || null
      });

      if (rpcError) throw rpcError;

      if (data && !data.success) {
        throw new Error(data.error || 'فشل إنشاء القرار');
      }

      return {
        success: true,
        data: data,
        message: data?.message || 'تم إنشاء القرار بنجاح'
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'حدث خطأ في إنشاء القرار';
      setError(errorMessage);
      console.error('Error creating decision:', err);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  };

  return {
    createDecision,
    loading,
    error
  };
}
