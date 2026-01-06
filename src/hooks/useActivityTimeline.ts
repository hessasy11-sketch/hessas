import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface TimelineEvent {
  id: string;
  farm_id: string;
  event_type: string;
  event_data: Record<string, any>;
  actor_id: string | null;
  actor_name: string;
  reference_type: string | null;
  reference_id: string | null;
  created_at: string;
}

export function useActivityTimeline(farmId: string | undefined) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!farmId) {
      setLoading(false);
      return;
    }

    loadTimeline();
  }, [farmId]);

  const loadTimeline = async () => {
    if (!farmId) return;

    try {
      setLoading(true);
      setError(null);

      console.log('📋 Loading timeline for farm:', farmId);

      const { data, error: fetchError } = await supabase
        .rpc('get_farm_timeline', {
          p_farm_id: farmId,
          p_limit: 50,
          p_offset: 0
        });

      if (fetchError) {
        console.error('❌ Error loading timeline:', fetchError);
        setError(fetchError.message);
        return;
      }

      console.log('✅ Timeline loaded:', data?.length || 0, 'events');
      setEvents(data || []);
    } catch (err) {
      console.error('❌ Exception loading timeline:', err);
      setError('فشل تحميل السجل الزمني');
    } finally {
      setLoading(false);
    }
  };

  const addTimelineEntry = async (
    eventType: string,
    eventData: Record<string, any>,
    actorName: string,
    referenceType?: string,
    referenceId?: string
  ) => {
    if (!farmId) return;

    try {
      console.log('➕ Adding timeline entry:', eventType);

      const { data, error: addError } = await supabase
        .rpc('add_farm_timeline_entry', {
          p_farm_id: farmId,
          p_event_type: eventType,
          p_event_data: eventData,
          p_actor_id: null,
          p_actor_name: actorName,
          p_reference_type: referenceType || null,
          p_reference_id: referenceId || null
        });

      if (addError) {
        console.error('❌ Error adding timeline entry:', addError);
        return;
      }

      console.log('✅ Timeline entry added:', data);

      await loadTimeline();
    } catch (err) {
      console.error('❌ Exception adding timeline entry:', err);
    }
  };

  return {
    events,
    loading,
    error,
    reload: loadTimeline,
    addEntry: addTimelineEntry
  };
}
