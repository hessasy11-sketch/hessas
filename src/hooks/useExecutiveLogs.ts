import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export type LogCategory = 'all' | 'b2f' | 'b2b' | 'finance' | 'platform';

interface ExecutiveLog {
  id: string;
  created_at: string;
  staff_id: string;
  staff_name: string;
  action: string;
  category: string;
  entity_type: string;
  entity_id: string | null;
  entity_name: string | null;
  details: any;
  result: string;
  notes: string | null;
  ip_address: string | null;
}

export function useExecutiveLogs() {
  const [logs, setLogs] = useState<ExecutiveLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState<LogCategory>('all');

  const loadLogs = useCallback(async (filterCategory: LogCategory = 'all') => {
    setLoading(true);
    try {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (filterCategory !== 'all') {
        query = query.eq('category', filterCategory);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error loading executive logs:', error);
        return;
      }

      setLogs(data || []);
      setCategory(filterCategory);
    } catch (error) {
      console.error('Error loading executive logs:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    logs,
    loading,
    category,
    loadLogs,
    setCategory
  };
}
