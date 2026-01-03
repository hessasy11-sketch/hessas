import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface FinancialSummary {
  totalRequestsCount: number;
  totalAmount: number;
  approvedCount: number;
  approvedAmount: number;
  pendingReviewCount: number;
  pendingPaymentCount: number;
}

export function useFinancialSummary(investorPhone: string | null) {
  const [summary, setSummary] = useState<FinancialSummary>({
    totalRequestsCount: 0,
    totalAmount: 0,
    approvedCount: 0,
    approvedAmount: 0,
    pendingReviewCount: 0,
    pendingPaymentCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!investorPhone) {
      setLoading(false);
      return;
    }

    loadSummary();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('financial-summary')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'b2f_sales_requests',
          filter: `investor_phone=eq.${investorPhone}`
        },
        () => {
          loadSummary();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [investorPhone]);

  const loadSummary = async () => {
    if (!investorPhone) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase
        .rpc('get_investor_financial_summary', {
          p_investor_phone: investorPhone
        })
        .single();

      if (rpcError) throw rpcError;

      if (data) {
        setSummary({
          totalRequestsCount: Number(data.total_requests_count || 0),
          totalAmount: Number(data.total_amount || 0),
          approvedCount: Number(data.approved_count || 0),
          approvedAmount: Number(data.approved_amount || 0),
          pendingReviewCount: Number(data.pending_review_count || 0),
          pendingPaymentCount: Number(data.pending_payment_count || 0)
        });
      }
    } catch (err) {
      console.error('Error loading financial summary:', err);
      setError(err instanceof Error ? err.message : 'خطأ في تحميل الملخص المالي');
    } finally {
      setLoading(false);
    }
  };

  return {
    summary,
    loading,
    error,
    refresh: loadSummary
  };
}
