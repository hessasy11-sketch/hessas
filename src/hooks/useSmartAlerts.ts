import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface SmartAlert {
  id: string;
  alert_type: string;
  farm_id: string;
  farm_name: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  data: any;
  created_at: string;
}

interface AlertsSummary {
  by_severity: {
    info: number;
    warning: number;
    critical: number;
    total: number;
  };
  by_type: {
    farms_ready: number;
    farms_suspended: number;
    critical_issues: number;
    high_expenses: number;
  };
}

export function useSmartAlerts() {
  const [alerts, setAlerts] = useState<SmartAlert[]>([]);
  const [summary, setSummary] = useState<AlertsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      setError(null);

      const [alertsResult, summaryResult] = await Promise.all([
        supabase.rpc('get_active_alerts'),
        supabase.rpc('get_alerts_summary')
      ]);

      if (alertsResult.error) throw alertsResult.error;
      if (summaryResult.error) throw summaryResult.error;

      setAlerts(alertsResult.data || []);
      setSummary(summaryResult.data);
    } catch (err: any) {
      console.error('Error loading alerts:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateAlerts = async () => {
    try {
      const { data, error } = await supabase.rpc('generate_smart_alerts');

      if (error) throw error;

      await loadAlerts();
      return { success: true, data };
    } catch (err: any) {
      console.error('Error generating alerts:', err);
      return { success: false, error: err.message };
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      const { data, error } = await supabase.rpc('resolve_alert', {
        p_alert_id: alertId
      });

      if (error) throw error;

      await loadAlerts();
      return { success: true, data };
    } catch (err: any) {
      console.error('Error resolving alert:', err);
      return { success: false, error: err.message };
    }
  };

  const getAlertTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      farm_ready_for_review: 'جاهزة للمراجعة',
      farm_long_suspended: 'موقوفة لمدة طويلة',
      critical_issues_open: 'أعطال حرجة',
      high_expenses: 'مصاريف مرتفعة'
    };
    return labels[type] || type;
  };

  const getSeverityLabel = (severity: string) => {
    const labels: Record<string, string> = {
      info: 'معلومة',
      warning: 'تحذير',
      critical: 'حرجة'
    };
    return labels[severity] || severity;
  };

  return {
    alerts,
    summary,
    loading,
    error,
    refetch: loadAlerts,
    generateAlerts,
    resolveAlert,
    getAlertTypeLabel,
    getSeverityLabel
  };
}
