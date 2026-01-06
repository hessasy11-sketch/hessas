import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface ExecutiveAlert {
  id: string;
  alert_type: 'expense_exceeded' | 'farm_performance_drop' | 'decision_overdue' | 'auction_conflict';
  severity: 'critical' | 'high' | 'medium';
  title: string;
  description: string;
  farm_id?: string;
  farm_name?: string;
  decision_id?: string;
  expense_id?: string;
  auction_id?: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface AlertsStats {
  total: number;
  critical: number;
  high: number;
  medium: number;
}

export interface AlertsData {
  alerts: ExecutiveAlert[];
  stats: AlertsStats;
}

export function useExecutiveAlerts() {
  const [data, setData] = useState<AlertsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAlerts = async () => {
    try {
      const { data: result, error: err } = await supabase
        .rpc('get_active_alerts');

      if (err) throw err;

      setData(result);
      setError(null);
    } catch (err: any) {
      console.error('Error loading executive alerts:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const dismissAlert = async (alertId: string, staffId: string) => {
    try {
      const { data: result, error: err } = await supabase
        .rpc('dismiss_alert', {
          p_alert_id: alertId,
          p_staff_id: staffId
        });

      if (err) throw err;

      if (result?.success) {
        await loadAlerts();
      }

      return result;
    } catch (err: any) {
      console.error('Error dismissing alert:', err);
      throw err;
    }
  };

  const generateAlerts = async () => {
    try {
      const { error: err } = await supabase
        .rpc('generate_smart_alerts');

      if (err) throw err;

      await loadAlerts();
    } catch (err: any) {
      console.error('Error generating alerts:', err);
      throw err;
    }
  };

  useEffect(() => {
    loadAlerts();

    // الاشتراك في التحديثات الفورية
    const channel = supabase
      .channel('executive-alerts-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'executive_alerts'
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
    data,
    loading,
    error,
    dismissAlert,
    generateAlerts,
    refresh: loadAlerts
  };
}
