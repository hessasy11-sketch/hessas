import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface CriticalAlert {
  count: number;
  farm_ids: string[];
}

export interface CriticalAlertsData {
  farms_no_manager: CriticalAlert;
  farms_no_team: CriticalAlert;
  farms_overdue_tasks: CriticalAlert;
  farms_high_expenses: CriticalAlert;
  farms_closed_with_requests: CriticalAlert;
}

export function useCriticalAlerts() {
  const [alerts, setAlerts] = useState<CriticalAlertsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .rpc('get_b2f_critical_alerts');

      if (fetchError) throw fetchError;

      setAlerts(data);
    } catch (err) {
      console.error('Error loading critical alerts:', err);
      setError(err instanceof Error ? err.message : 'حدث خطأ في تحميل التنبيهات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();

    const channel = supabase
      .channel('critical-alerts-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'b2f_farms'
        },
        () => {
          loadAlerts();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'farm_tasks'
        },
        () => {
          loadAlerts();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'farm_team_members'
        },
        () => {
          loadAlerts();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'farm_expenses'
        },
        () => {
          loadAlerts();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'b2f_sales_requests'
        },
        () => {
          loadAlerts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    alerts,
    loading,
    error,
    refresh: loadAlerts
  };
}
