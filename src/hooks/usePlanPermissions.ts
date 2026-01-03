import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Permission {
  permission_key: string;
  permission_name_ar: string;
  permission_type: string;
  is_allowed: boolean;
  limit_value: number | null;
  limit_unit: string | null;
}

interface RoleLimit {
  permission_key: string;
  limit_value: number;
  limit_unit: string;
}

export function usePlanPermissions(userId: string | undefined) {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [roleLimits, setRoleLimits] = useState<RoleLimit[]>([]);
  const [currentRole, setCurrentRole] = useState<string>('free_seller');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      loadPermissions();
      loadRoleLimits();
    } else {
      setPermissions([]);
      setRoleLimits([]);
      setCurrentRole('free_seller');
      setLoading(false);
    }
  }, [userId]);

  const loadPermissions = async () => {
    try {
      const { data: roleData, error: roleError } = await supabase
        .from('user_plan_roles')
        .select(`
          role_id,
          plan_roles!inner (
            role_key,
            display_name_ar
          )
        `)
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (roleError) throw roleError;

      if (roleData && roleData.plan_roles) {
        const roleKey = (roleData.plan_roles as any).role_key;
        setCurrentRole(roleKey);

        const { data: permData, error: permError } = await supabase
          .from('plan_permissions')
          .select('*')
          .eq('role_id', roleData.role_id);

        if (permError) throw permError;

        setPermissions(permData || []);
      }
    } catch (error) {
      console.error('Error loading permissions:', error);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  };

  const loadRoleLimits = async () => {
    try {
      const { data, error } = await supabase.rpc('get_user_role_limits', {
        p_user_id: userId,
      });

      if (error) throw error;

      setRoleLimits(data || []);
    } catch (error) {
      console.error('Error loading role limits:', error);
      setRoleLimits([]);
    }
  };

  const checkPermission = async (permissionKey: string): Promise<boolean> => {
    if (!userId) return false;

    const localPerm = permissions.find((p) => p.permission_key === permissionKey);
    if (localPerm !== undefined) {
      return localPerm.is_allowed;
    }

    try {
      const { data, error } = await supabase.rpc('check_user_permission', {
        p_user_id: userId,
        p_permission_key: permissionKey,
      });

      if (error) throw error;

      return data || false;
    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    }
  };

  const hasPermission = (permissionKey: string): boolean => {
    const perm = permissions.find((p) => p.permission_key === permissionKey);
    return perm ? perm.is_allowed : false;
  };

  const getLimit = (permissionKey: string): number | null => {
    const limit = roleLimits.find((l) => l.permission_key === permissionKey);
    return limit ? limit.limit_value : null;
  };

  const canExtendAuction = (): boolean => {
    return hasPermission('extend_auction');
  };

  const getMaxExtendHours = (): number => {
    const limit = getLimit('max_extend_hours');
    return limit || 0;
  };

  const canRepublish = (): boolean => {
    return hasPermission('republish');
  };

  const getRepublishLimit = (): number => {
    const limit = getLimit('republish_count');
    return limit || 0;
  };

  const canUseAI = (): boolean => {
    return hasPermission('smart_assistant') && hasPermission('ai_insights');
  };

  const canUseSmartSuggestions = (): boolean => {
    return hasPermission('smart_suggestions');
  };

  const getAllowedTools = (): string[] => {
    return permissions
      .filter((p) => p.permission_type === 'tool' && p.is_allowed)
      .map((p) => p.permission_key);
  };

  const getLockedTools = (): string[] => {
    return permissions
      .filter((p) => p.permission_type === 'tool' && !p.is_allowed)
      .map((p) => p.permission_key);
  };

  const validateToolUsage = async (
    toolKey: string
  ): Promise<{ allowed: boolean; reason?: string; limit?: number }> => {
    const hasAccess = await checkPermission(toolKey);

    if (!hasAccess) {
      let reason = 'هذه الأداة غير متاحة في باقتك الحالية';

      if (currentRole === 'free_seller') {
        if (toolKey === 'extend_auction' || toolKey === 'closing_alert') {
          reason = 'هذه الأداة متاحة في الباقة الفضية';
        } else if (toolKey === 'smart_assistant' || toolKey === 'ai_insights') {
          reason = 'هذه الأداة متاحة في الباقة الذهبية فقط';
        }
      } else if (currentRole === 'silver_seller') {
        if (toolKey === 'smart_assistant' || toolKey === 'ai_insights') {
          reason = 'هذه الأداة متاحة في الباقة الذهبية فقط';
        }
      }

      return { allowed: false, reason };
    }

    if (toolKey === 'extend_auction') {
      const maxHours = getMaxExtendHours();
      return { allowed: true, limit: maxHours };
    }

    if (toolKey === 'republish') {
      const maxCount = getRepublishLimit();
      return { allowed: true, limit: maxCount };
    }

    return { allowed: true };
  };

  return {
    permissions,
    roleLimits,
    currentRole,
    loading,
    checkPermission,
    hasPermission,
    getLimit,
    canExtendAuction,
    getMaxExtendHours,
    canRepublish,
    getRepublishLimit,
    canUseAI,
    canUseSmartSuggestions,
    getAllowedTools,
    getLockedTools,
    validateToolUsage,
  };
}
