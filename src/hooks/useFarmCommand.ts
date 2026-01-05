import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface FarmCommandStats {
  total_farms: number;
  active_farms: number;
  suspended_farms: number;
  pending_approvals: number;
  critical_alerts: number;
}

interface FarmWithStats {
  id: string;
  name: string;
  location: string;
  city: string;
  operational_status: string;
  suspended_at: string | null;
  manager_name: string | null;
  readiness_score: number;
  teams_count: number;
  open_issues: number;
  monthly_net: number;
}

export function useFarmCommand() {
  const [stats, setStats] = useState<FarmCommandStats | null>(null);
  const [farms, setFarms] = useState<FarmWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsResult, farmsResult] = await Promise.all([
        supabase.rpc('get_farm_command_stats'),
        loadFarmsWithStats()
      ]);

      if (statsResult.error) throw statsResult.error;
      if (farmsResult.error) throw farmsResult.error;

      setStats(statsResult.data);
      setFarms(farmsResult.data || []);
    } catch (err: any) {
      console.error('Error loading farm command data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadFarmsWithStats = async () => {
    const { data: farms, error } = await supabase
      .from('b2f_farms')
      .select('*')
      .order('name');

    if (error) return { error, data: null };

    const farmsWithStats = await Promise.all(
      (farms || []).map(async (farm) => {
        const [
          readinessResult,
          teamsResult,
          issuesResult,
          financialResult
        ] = await Promise.all([
          supabase.rpc('calculate_farm_readiness', { p_farm_id: farm.id }),
          supabase
            .from('fc_farm_teams')
            .select('id', { count: 'exact' })
            .eq('farm_id', farm.id)
            .eq('is_active', true),
          supabase
            .from('fc_issue_reports')
            .select('id', { count: 'exact' })
            .eq('farm_id', farm.id)
            .in('status', ['reported', 'acknowledged', 'in_progress']),
          supabase
            .from('fc_financial_ledger')
            .select('entry_type, amount')
            .eq('farm_id', farm.id)
            .gte('transaction_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
        ]);

        const readiness_score = readinessResult.data || 0;
        const teams_count = teamsResult.count || 0;
        const open_issues = issuesResult.count || 0;

        let monthly_net = 0;
        if (financialResult.data) {
          const revenue = financialResult.data
            .filter((r: any) => r.entry_type === 'revenue')
            .reduce((sum: number, r: any) => sum + (r.amount || 0), 0);
          const expenses = financialResult.data
            .filter((r: any) => r.entry_type === 'expense')
            .reduce((sum: number, r: any) => sum + (r.amount || 0), 0);
          monthly_net = revenue - expenses;
        }

        const managerResult = await supabase
          .from('fc_operational_farms')
          .select('manager:platform_staff!farm_manager_id(user:profiles!user_id(full_name))')
          .eq('reference_farm_id', farm.id)
          .maybeSingle();

        return {
          id: farm.id,
          name: farm.name,
          location: farm.location || '',
          city: farm.city || '',
          operational_status: farm.operational_status || 'setup',
          suspended_at: farm.suspended_at,
          manager_name: managerResult.data?.manager?.user?.full_name || null,
          readiness_score,
          teams_count,
          open_issues,
          monthly_net
        };
      })
    );

    return { data: farmsWithStats, error: null };
  };

  const changeFarmStatus = async (
    farmId: string,
    newStatus: string,
    reason?: string
  ) => {
    try {
      const { data, error } = await supabase.rpc('create_approval_request', {
        p_request_type: 'change_status',
        p_farm_id: farmId,
        p_requested_by: 'current_user_id', // TODO: Get from auth
        p_request_data: { new_status: newStatus, reason }
      });

      if (error) throw error;

      await loadData();
      return { success: true, data };
    } catch (err: any) {
      console.error('Error changing farm status:', err);
      return { success: false, error: err.message };
    }
  };

  return {
    stats,
    farms,
    loading,
    error,
    refetch: loadData,
    changeFarmStatus
  };
}
