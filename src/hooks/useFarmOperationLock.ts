import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface FarmLockStatus {
  isLocked: boolean;
  status: 'setup' | 'active' | 'suspended';
  suspendedReason?: string;
  suspendedAt?: string;
  canView: boolean;
  canModify: boolean;
  canCreate: boolean;
}

export function useFarmOperationLock(farmId: string | null) {
  const [lockStatus, setLockStatus] = useState<FarmLockStatus>({
    isLocked: false,
    status: 'setup',
    canView: true,
    canModify: true,
    canCreate: true
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!farmId) {
      setLoading(false);
      return;
    }

    checkLockStatus();

    const channel = supabase
      .channel(`farm-lock-${farmId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'b2f_farms',
          filter: `id=eq.${farmId}`
        },
        () => {
          checkLockStatus();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [farmId]);

  const checkLockStatus = async () => {
    if (!farmId) return;

    try {
      const { data, error } = await supabase
        .from('b2f_farms')
        .select('operational_status, suspended_reason, suspended_at')
        .eq('id', farmId)
        .maybeSingle();

      if (error) throw error;

      const status = data?.operational_status || 'setup';
      const isLocked = status === 'suspended';

      setLockStatus({
        isLocked,
        status,
        suspendedReason: data?.suspended_reason,
        suspendedAt: data?.suspended_at,
        canView: true,
        canModify: !isLocked,
        canCreate: !isLocked
      });
    } catch (error) {
      console.error('Error checking farm lock status:', error);
    } finally {
      setLoading(false);
    }
  };

  return { lockStatus, loading, refresh: checkLockStatus };
}
