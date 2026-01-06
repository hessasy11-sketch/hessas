import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface QuickActionsStats {
  worst_farms: number;
  high_expenses: number;
  critical_auctions: number;
  pending_decisions: number;
}

export function useQuickActions() {
  const [stats, setStats] = useState<QuickActionsStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    try {
      const { data, error } = await supabase.rpc('get_quick_actions_stats');

      if (error) throw error;

      setStats(data);
    } catch (err) {
      console.error('Error loading quick actions stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();

    const interval = setInterval(loadStats, 30000);

    return () => clearInterval(interval);
  }, []);

  return { stats, loading, refresh: loadStats };
}
