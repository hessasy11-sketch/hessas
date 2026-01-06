import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface EarlyWarning {
  id: string;
  signal_type: string;
  severity: 'info' | 'warning' | 'critical' | 'urgent';
  target_type: 'cluster' | 'farm' | 'staff';
  target_id: string;
  target_name: string;
  title: string;
  description: string;
  threshold_value?: number;
  current_value?: number;
  metadata: any;
  status: 'active' | 'acknowledged' | 'resolved' | 'dismissed';
  detected_at: string;
  acknowledged_by?: string;
  acknowledged_at?: string;
}

export function useEarlyWarnings() {
  const [warnings, setWarnings] = useState<EarlyWarning[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadWarnings = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: err } = await supabase.rpc('get_active_early_warnings');

      if (err) throw err;

      setWarnings(data || []);
    } catch (err: any) {
      console.error('Error loading warnings:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const detectWarnings = async () => {
    try {
      const { data, error: err } = await supabase.rpc('detect_early_warnings');

      if (err) throw err;

      await loadWarnings();
      return data;
    } catch (err: any) {
      console.error('Error detecting warnings:', err);
      return null;
    }
  };

  const acknowledgeWarning = async (warningId: string, staffId: string, notes?: string) => {
    try {
      const { data, error: err } = await supabase.rpc('acknowledge_warning', {
        p_signal_id: warningId,
        p_staff_id: staffId,
        p_notes: notes
      });

      if (err) throw err;

      await loadWarnings();
      return data;
    } catch (err: any) {
      console.error('Error acknowledging warning:', err);
      return false;
    }
  };

  const resolveWarning = async (warningId: string, notes?: string) => {
    try {
      const { data, error: err } = await supabase.rpc('resolve_warning', {
        p_signal_id: warningId,
        p_notes: notes
      });

      if (err) throw err;

      await loadWarnings();
      return data;
    } catch (err: any) {
      console.error('Error resolving warning:', err);
      return false;
    }
  };

  const dismissWarning = async (warningId: string, notes?: string) => {
    try {
      const { data, error: err } = await supabase.rpc('dismiss_warning', {
        p_signal_id: warningId,
        p_notes: notes
      });

      if (err) throw err;

      await loadWarnings();
      return data;
    } catch (err: any) {
      console.error('Error dismissing warning:', err);
      return false;
    }
  };

  useEffect(() => {
    loadWarnings();

    const subscription = supabase
      .channel('early-warnings-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'early_warning_signals'
      }, () => {
        loadWarnings();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return {
    warnings,
    loading,
    error,
    refresh: loadWarnings,
    detectWarnings,
    acknowledgeWarning,
    resolveWarning,
    dismissWarning
  };
}
