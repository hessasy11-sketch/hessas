import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { adminSessionManager } from '../utils/adminSessionManager';

interface FarmPermission {
  permission_code: string;
  permission_name_ar: string;
  role_name_ar: string;
}

export function useFarmPermissions(farmId: string | undefined) {
  const [permissions, setPermissions] = useState<FarmPermission[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (farmId) {
      loadPermissions();
    }
  }, [farmId]);

  const loadPermissions = async () => {
    try {
      const session = adminSessionManager.getSession();
      if (!session?.user_id || !farmId) return;

      // الحصول على الصلاحيات
      const { data: perms } = await supabase.rpc('get_user_farm_permissions', {
        p_user_id: session.user_id,
        p_farm_id: farmId
      });

      // الحصول على الدور
      const { data: role } = await supabase.rpc('get_user_farm_role', {
        p_user_id: session.user_id,
        p_farm_id: farmId
      });

      setPermissions(perms || []);
      setUserRole(role);
    } catch (error) {
      console.error('Error loading farm permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (permissionCode: string): boolean => {
    return permissions.some(p => p.permission_code === permissionCode);
  };

  return {
    permissions,
    userRole,
    loading,
    hasPermission
  };
}
