import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface RecentEvent {
  id: string;
  action_type: string;
  farm_id: string;
  farm_name: string;
  performed_by: string;
  staff_name: string;
  result: string;
  notes: string;
  created_at: string;
}

interface ExecutivePulseData {
  active_farms: number;
  struggling_farms: number;
  total_expenses: number;
  bookings_today: number;
  pending_decisions: number;
  recent_events: RecentEvent[];
  last_updated: string;
}

export function useExecutivePulse() {
  const [data, setData] = useState<ExecutivePulseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const { data: result, error: err } = await supabase
        .rpc('get_executive_pulse');

      if (err) throw err;

      setData(result);
      setError(null);
    } catch (err: any) {
      console.error('Error loading executive pulse:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // تحديث تلقائي كل 30 ثانية
    const interval = setInterval(loadData, 30000);

    // الاشتراك في التحديثات الفورية
    const subscriptions: any[] = [];

    // الاشتراك في تغييرات المزارع
    const farmsChannel = supabase
      .channel('executive-pulse-farms')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'b2f_farms'
        },
        () => {
          loadData();
        }
      )
      .subscribe();
    subscriptions.push(farmsChannel);

    // الاشتراك في تغييرات القرارات
    const decisionsChannel = supabase
      .channel('executive-pulse-decisions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'decision_queue'
        },
        () => {
          loadData();
        }
      )
      .subscribe();
    subscriptions.push(decisionsChannel);

    // الاشتراك في تغييرات المصروفات
    const expensesChannel = supabase
      .channel('executive-pulse-expenses')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'farm_expenses'
        },
        () => {
          loadData();
        }
      )
      .subscribe();
    subscriptions.push(expensesChannel);

    // الاشتراك في تغييرات الطلبات
    const requestsChannel = supabase
      .channel('executive-pulse-requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'b2f_sales_requests'
        },
        () => {
          loadData();
        }
      )
      .subscribe();
    subscriptions.push(requestsChannel);

    // الاشتراك في السجل التنفيذي
    const logsChannel = supabase
      .channel('executive-pulse-logs')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'executive_logs'
        },
        () => {
          loadData();
        }
      )
      .subscribe();
    subscriptions.push(logsChannel);

    return () => {
      clearInterval(interval);
      subscriptions.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, []);

  return {
    data,
    loading,
    error,
    refresh: loadData
  };
}
