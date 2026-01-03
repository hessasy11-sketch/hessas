import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface DashboardSection {
  id: string;
  section_key: string;
  section_name: string;
  section_name_en: string;
  description: string;
  color: string;
  icon: string;
  display_order: number;
  is_active: boolean;
}

interface DashboardStats {
  section_key: string;
  active_auctions: number;
  total_auctions: number;
  pending_reports: number;
  blocked_users: number;
  total_views: number;
  total_bids: number;
}

interface DashboardData {
  section: DashboardSection;
  stats: DashboardStats;
}

export function useDashboard() {
  const [sections, setSections] = useState<DashboardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async (retryCount = 0) => {
    try {
      setLoading(true);
      setError(null);

      const { data: sectionsData, error: sectionsError } = await supabase
        .from('dashboard_sections')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (sectionsError) {
        if (retryCount < 2) {
          console.log(`Retry ${retryCount + 1}/2...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          return fetchDashboardData(retryCount + 1);
        }
        throw sectionsError;
      }

      const { data: statsData, error: statsError } = await supabase
        .from('dashboard_stats')
        .select('*');

      if (statsError) {
        console.warn('Stats loading error:', statsError);
      }

      const combinedData: DashboardData[] = (sectionsData || []).map(section => {
        const stats = statsData?.find(s => s.section_key === section.section_key) || {
          section_key: section.section_key,
          active_auctions: 0,
          total_auctions: 0,
          pending_reports: 0,
          blocked_users: 0,
          total_views: 0,
          total_bids: 0
        };

        return { section, stats };
      });

      setSections(combinedData);
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      const errorMessage = err?.message || 'فشل في تحميل بيانات لوحة التحكم';
      setError(`خطأ: ${errorMessage}. تحقق من اتصال الإنترنت وأعد المحاولة.`);
    } finally {
      setLoading(false);
    }
  };

  const updateStats = async () => {
    try {
      await supabase.rpc('update_dashboard_stats');
      await fetchDashboardData();
    } catch (err) {
      console.error('Error updating stats:', err);
    }
  };

  const logAdminActivity = async (
    sectionKey: string,
    actionType: string,
    actionDetails?: string,
    targetId?: string
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('admin_activity_log').insert({
        admin_id: user.id,
        section_key: sectionKey,
        action_type: actionType,
        action_details: actionDetails,
        target_id: targetId
      });
    } catch (err) {
      console.error('Error logging admin activity:', err);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    const channel = supabase
      .channel('dashboard-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dashboard_stats'
        },
        () => {
          fetchDashboardData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    sections,
    loading,
    error,
    updateStats,
    logAdminActivity,
    refetch: fetchDashboardData
  };
}
