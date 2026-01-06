import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface LastTimelineEvent {
  event_type: string;
  description: string;
  actor_name: string;
  created_at: string;
  event_data?: any;
}

export interface FarmRadarData {
  id: string;
  name: string;
  location: string;
  status: string;
  bookings_enabled: boolean;
  farm_manager_id: string | null;
  farm_manager_name: string | null;
  pending_tasks_count: number;
  overdue_tasks_count: number;
  last_activity: string | null;
  created_at: string;
  last_timeline_event?: LastTimelineEvent | null;
}

export function useFarmRadar() {
  const [farms, setFarms] = useState<FarmRadarData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFarms = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .rpc('get_b2f_farms_radar_with_tasks');

      if (fetchError) throw fetchError;

      const farmsData = data || [];

      // Load last timeline event for each farm
      const farmsWithTimeline = await Promise.all(
        farmsData.map(async (farm) => {
          try {
            const { data: eventData } = await supabase
              .rpc('get_last_timeline_event', { p_farm_id: farm.id });

            return {
              ...farm,
              last_timeline_event: eventData
            };
          } catch (err) {
            console.error(`Error loading timeline for farm ${farm.id}:`, err);
            return {
              ...farm,
              last_timeline_event: null
            };
          }
        })
      );

      setFarms(farmsWithTimeline);
    } catch (err) {
      console.error('Error loading farm radar:', err);
      setError(err instanceof Error ? err.message : 'حدث خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFarms();

    const channel = supabase
      .channel('farm-radar-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'b2f_farms'
        },
        () => {
          loadFarms();
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
          loadFarms();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    farms,
    loading,
    error,
    refresh: loadFarms
  };
}
