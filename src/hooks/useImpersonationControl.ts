import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface StaffMember {
  id: string;
  name_ar: string;
  role: string;
  department: string | null;
}

interface ImpersonationLog {
  id: string;
  gm_id: string;
  action: string;
  target_staff_id: string | null;
  target_staff_name: string | null;
  current_path: string | null;
  created_at: string;
}

interface ActiveImpersonation {
  gm_id: string;
  target_staff_id: string;
  target_staff_name: string;
  started_at: string;
  duration_minutes: number;
}

export function useImpersonationControl() {
  const [isGM, setIsGM] = useState(false);
  const [gmId, setGmId] = useState<string | null>(null);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [logs, setLogs] = useState<ImpersonationLog[]>([]);
  const [activeImpersonations, setActiveImpersonations] = useState<ActiveImpersonation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkGMStatus();
  }, []);

  const checkGMStatus = async () => {
    try {
      setLoading(true);
      const currentGmId = 'current-gm-id';

      const { data: staff } = await supabase
        .from('platform_staff')
        .select('id, role')
        .eq('id', currentGmId)
        .single();

      if (staff && staff.role === 'general_manager') {
        setIsGM(true);
        setGmId(staff.id);
        await Promise.all([
          fetchStaffMembers(),
          fetchLogs(staff.id),
          fetchActiveImpersonations(staff.id),
        ]);
      }
    } catch (err) {
      console.error('Error checking GM status:', err);
      setError(err instanceof Error ? err.message : 'خطأ في التحقق من الصلاحيات');
    } finally {
      setLoading(false);
    }
  };

  const fetchStaffMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('platform_staff')
        .select('id, name_ar, role, department')
        .order('name_ar', { ascending: true });

      if (error) throw error;
      setStaffMembers(data || []);
    } catch (err) {
      console.error('Error fetching staff members:', err);
    }
  };

  const fetchLogs = async (gmId: string) => {
    try {
      const { data, error } = await supabase.rpc('get_impersonation_logs', {
        p_gm_id: gmId,
        p_limit: 100,
      });

      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error('Error fetching logs:', err);
    }
  };

  const fetchActiveImpersonations = async (gmId: string) => {
    try {
      const { data, error } = await supabase.rpc('get_active_impersonations', {
        p_gm_id: gmId,
      });

      if (error) throw error;
      setActiveImpersonations(data || []);
    } catch (err) {
      console.error('Error fetching active impersonations:', err);
    }
  };

  const refresh = async () => {
    if (gmId) {
      await Promise.all([
        fetchStaffMembers(),
        fetchLogs(gmId),
        fetchActiveImpersonations(gmId),
      ]);
    }
  };

  return {
    isGM,
    gmId,
    staffMembers,
    logs,
    activeImpersonations,
    loading,
    error,
    refresh,
  };
}
