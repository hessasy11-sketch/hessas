import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export type ActionType = 'harvest' | 'gift' | 'charity' | 'transfer' | 'visit';
export type ActionStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface ActionRequest {
  id: string;
  investor_account_id: string;
  action_type: ActionType;
  status: ActionStatus;
  notes: string | null;
  admin_notes: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActionRequestStats {
  total: number;
  pending: number;
  in_progress: number;
  completed: number;
  cancelled: number;
  by_type: {
    harvest: number;
    gift: number;
    charity: number;
    transfer: number;
    visit: number;
  };
}

export function useActionRequests(accountId: string | null) {
  const [requests, setRequests] = useState<ActionRequest[]>([]);
  const [stats, setStats] = useState<ActionRequestStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // جلب الطلبات
  const fetchRequests = async () => {
    if (!accountId) {
      setRequests([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('investor_action_requests')
        .select('*')
        .eq('investor_account_id', accountId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setRequests(data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching action requests:', err);
      setError(err instanceof Error ? err.message : 'حدث خطأ في جلب الطلبات');
    } finally {
      setLoading(false);
    }
  };

  // جلب الإحصائيات
  const fetchStats = async () => {
    if (!accountId) {
      setStats(null);
      return;
    }

    try {
      const { data, error: statsError } = await supabase
        .rpc('get_investor_action_requests_stats', { account_id_param: accountId });

      if (statsError) throw statsError;

      setStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  // إنشاء طلب جديد
  const createRequest = async (actionType: ActionType, notes?: string) => {
    if (!accountId) {
      throw new Error('لم يتم العثور على حساب المستثمر');
    }

    try {
      const { data, error: insertError } = await supabase
        .from('investor_action_requests')
        .insert({
          investor_account_id: accountId,
          action_type: actionType,
          notes: notes || null
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // تحديث القائمة
      await fetchRequests();
      await fetchStats();

      return data;
    } catch (err) {
      console.error('Error creating action request:', err);
      throw err;
    }
  };

  // تحديث ملاحظات الطلب
  const updateNotes = async (requestId: string, notes: string) => {
    try {
      const { error: updateError } = await supabase
        .from('investor_action_requests')
        .update({ notes })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // تحديث القائمة
      await fetchRequests();
    } catch (err) {
      console.error('Error updating notes:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchRequests();
    fetchStats();
  }, [accountId]);

  return {
    requests,
    stats,
    loading,
    error,
    createRequest,
    updateNotes,
    refresh: fetchRequests
  };
}
