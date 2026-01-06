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

interface FarmNeedAttention {
  id: string;
  name: string;
  status: string;
  issue: string;
  pending_decisions: number;
}

interface NewFarm {
  id: string;
  name: string;
  created_at: string;
  status: string;
  days_old: number;
}

interface HighExpenseFarm {
  id: string;
  name: string;
  total_expenses: number;
  expense_count: number;
  avg_expense: number;
}

interface B2FRadarData {
  farms_need_attention: FarmNeedAttention[];
  new_farms: NewFarm[];
  high_expense_farms: HighExpenseFarm[];
}

interface CriticalAuction {
  id: string;
  title: string;
  status: string;
  reports_count: number;
  issue: string;
}

interface StoppedAuction {
  id: string;
  title: string;
  status: string;
  stopped_at: string;
  reason: string;
}

interface ClosingSoonAuction {
  id: string;
  title: string;
  status: string;
  ends_at: string;
  hours_left: number;
  current_bids: number;
}

interface B2BRadarData {
  critical_auctions: CriticalAuction[];
  stopped_auctions: StoppedAuction[];
  closing_soon_auctions: ClosingSoonAuction[];
}

interface CompleteDashboardData {
  pulse: ExecutivePulseData;
  b2f_radar: B2FRadarData;
  b2b_radar: B2BRadarData;
}

export function useExecutivePulse() {
  const [data, setData] = useState<CompleteDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const { data: result, error: err } = await supabase
        .rpc('get_complete_executive_dashboard');

      if (err) throw err;

      setData(result);
      setError(null);
    } catch (err: any) {
      console.error('Error loading executive dashboard:', err);
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

    // الاشتراك في تغييرات المزادات (B2B Radar)
    const auctionsChannel = supabase
      .channel('executive-pulse-auctions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'auctions'
        },
        () => {
          loadData();
        }
      )
      .subscribe();
    subscriptions.push(auctionsChannel);

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
