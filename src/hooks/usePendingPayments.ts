import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function usePendingPayments(investorPhone: string | null) {
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!investorPhone) {
      setPendingCount(0);
      setLoading(false);
      return;
    }

    loadPendingCount();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('pending-payments')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'b2f_sales_requests',
          filter: `investor_phone=eq.${investorPhone}`
        },
        () => {
          loadPendingCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [investorPhone]);

  const loadPendingCount = async () => {
    if (!investorPhone) return;

    try {
      setLoading(true);

      // Count requests that need payment proof
      const { count, error } = await supabase
        .from('b2f_sales_requests')
        .select('*', { count: 'exact', head: true })
        .eq('investor_phone', investorPhone)
        .in('status', ['payment_open', 'receipt_rejected']);

      if (error) throw error;
      setPendingCount(count || 0);
    } catch (error) {
      console.error('Error loading pending payments count:', error);
      setPendingCount(0);
    } finally {
      setLoading(false);
    }
  };

  return {
    pendingCount,
    loading,
    refresh: loadPendingCount
  };
}
