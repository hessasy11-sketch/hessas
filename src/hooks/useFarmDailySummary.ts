import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface FarmDailySummary {
  date: string;
  tasks_created_today: number;
  tasks_completed_today: number;
  tasks_overdue: number;
  completion_rate: number;
  last_approval: {
    task_id: string;
    task_title: string;
    task_type: string;
    approved_at: string;
    approved_by_name: string;
    approval_notes: string | null;
  } | null;
}

export function useFarmDailySummary(farmId: string | undefined, autoRefresh = true) {
  const [summary, setSummary] = useState<FarmDailySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!farmId) return;

    loadSummary();

    // Auto-refresh every 30 seconds if enabled
    let interval: NodeJS.Timeout | null = null;
    if (autoRefresh) {
      interval = setInterval(() => {
        loadSummary();
      }, 30000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [farmId, autoRefresh]);

  const loadSummary = async () => {
    if (!farmId) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase
        .rpc('get_farm_daily_summary', {
          p_farm_id: farmId,
          p_date: new Date().toISOString().split('T')[0]
        });

      if (rpcError) throw rpcError;

      setSummary(data as FarmDailySummary);
    } catch (err: any) {
      console.error('❌ Error loading daily summary:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return {
    summary,
    loading,
    error,
    reload: loadSummary
  };
}
