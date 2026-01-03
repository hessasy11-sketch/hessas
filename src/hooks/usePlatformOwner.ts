import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function usePlatformOwner() {
  const [isPlatformOwner, setIsPlatformOwner] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkPlatformOwnerStatus();
  }, []);

  const checkPlatformOwnerStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setIsPlatformOwner(false);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('is_platform_owner, user_type')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;

      const isOwner = data?.is_platform_owner === true ||
                      data?.user_type === 'platform_owner' ||
                      data?.user_type === 'general_manager';

      setIsPlatformOwner(isOwner);
    } catch (error) {
      console.error('Error checking platform owner status:', error);
      setIsPlatformOwner(false);
    } finally {
      setLoading(false);
    }
  };

  const logRootAction = async (
    actionType: string,
    targetType: string,
    targetId: string,
    changes?: any,
    metadata?: any
  ) => {
    if (!isPlatformOwner) return;

    try {
      await supabase.rpc('log_platform_owner_action', {
        p_action_type: actionType,
        p_target_type: targetType,
        p_target_id: targetId,
        p_changes: changes || {},
        p_metadata: metadata || {}
      });
    } catch (error) {
      console.error('Error logging root action:', error);
    }
  };

  return {
    isPlatformOwner,
    loading,
    logRootAction,
    hasRootAccess: isPlatformOwner
  };
}
