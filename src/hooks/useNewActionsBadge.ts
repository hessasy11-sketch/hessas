import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useNewActionsBadge(investorPhone: string | null) {
  const [actionCount, setActionCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!investorPhone) {
      setActionCount(0);
      setLoading(false);
      return;
    }

    loadActionCount();

    const subscription = supabase
      .channel('new_actions_badge')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'b2f_sales_requests',
          filter: `investor_phone=eq.${investorPhone}`
        },
        () => {
          loadActionCount();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [investorPhone]);

  const loadActionCount = async () => {
    if (!investorPhone) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('b2f_sales_requests')
        .select('id, status')
        .eq('investor_phone', investorPhone)
        .in('status', ['payment_open', 'receipt_approved_pending_invoice', 'invoice_issued', 'contract_issued']);

      if (error) throw error;

      setActionCount(data?.length || 0);
    } catch (error) {
      console.error('Error loading action count:', error);
      setActionCount(0);
    } finally {
      setLoading(false);
    }
  };

  return { actionCount, loading, refresh: loadActionCount };
}
