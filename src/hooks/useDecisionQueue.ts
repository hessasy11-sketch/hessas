import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface Decision {
  id: string;
  decision_type: string;
  title?: string;
  farm_id?: string;
  farm_name?: string;
  auction_id?: string;
  auction_title?: string;
  target_staff_id?: string | null;
  target_staff_name?: string | null;
  expense_amount?: number | null;
  expense_description?: string | null;
  action_data?: any;
  status: string;
  priority: string;
  requested_by: string;
  requester_name: string;
  notes?: string | null;
  created_at: string;
}

export function useDecisionQueue(type: 'b2f' | 'b2b') {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const approveDecision = useCallback(async (
    decisionId: string,
    staffId: string,
    notes?: string
  ): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    setError(null);

    try {
      const functionName = type === 'b2f' ? 'approve_decision' : 'approve_b2b_decision';

      const { data, error: rpcError } = await supabase.rpc(functionName, {
        p_decision_id: decisionId,
        p_approved_by: staffId,
        p_notes: notes || 'تمت الموافقة من غرفة العمليات'
      });

      if (rpcError) {
        console.error('Error approving decision:', rpcError);
        setError(rpcError.message);
        return { success: false, error: rpcError.message };
      }

      if (!data || !data.success) {
        const errorMsg = data?.error || 'فشل في الموافقة على القرار';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }

      return { success: true };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'خطأ غير متوقع';
      console.error('Unexpected error:', err);
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [type]);

  const rejectDecision = useCallback(async (
    decisionId: string,
    staffId: string,
    reason: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!reason || reason.trim() === '') {
      const errorMsg = 'يجب إدخال سبب الرفض';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }

    setLoading(true);
    setError(null);

    try {
      const functionName = type === 'b2f' ? 'reject_decision' : 'reject_b2b_decision';

      const { data, error: rpcError } = await supabase.rpc(functionName, {
        p_decision_id: decisionId,
        p_rejected_by: staffId,
        p_reason: reason
      });

      if (rpcError) {
        console.error('Error rejecting decision:', rpcError);
        setError(rpcError.message);
        return { success: false, error: rpcError.message };
      }

      if (!data || !data.success) {
        const errorMsg = data?.error || 'فشل في رفض القرار';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }

      return { success: true };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'خطأ غير متوقع';
      console.error('Unexpected error:', err);
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [type]);

  return {
    approveDecision,
    rejectDecision,
    loading,
    error
  };
}
