import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export type ScopeType = 'GLOBAL' | 'DEPARTMENT' | 'FARM';
export type ScopeBoard = 'B2F' | 'B2B' | 'Finance' | 'Marketing' | null;

export interface StaffScope {
  scopeType: ScopeType;
  scopeBoard: ScopeBoard;
  role: string;
  department: string | null;
  farmIds: string[];
  isGlobal: boolean;
  canAccessAllFarms: boolean;
}

export interface StaffFarm {
  farm_id: string;
  farm_name: string;
  farm_code: string;
  user_role: string;
  is_manager: boolean;
}

/**
 * Hook to get staff scope and farm access
 * Automatically determines what the logged-in staff can see:
 * - GLOBAL: GM sees everything
 * - DEPARTMENT: Department head sees their board (e.g., all B2F farms)
 * - FARM: Farm manager/team sees only assigned farms
 */
export function useStaffScope() {
  const [scope, setScope] = useState<StaffScope | null>(null);
  const [farms, setFarms] = useState<StaffFarm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchScope = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current staff session
      const savedSession = localStorage.getItem('staff_session');
      if (!savedSession) {
        throw new Error('No staff session found');
      }

      const session = JSON.parse(savedSession);
      const staffId = session.staffId;

      // Fetch scope info
      const { data: scopeData, error: scopeError } = await supabase.rpc('get_staff_scope', {
        p_staff_id: staffId,
      });

      if (scopeError) throw scopeError;

      setScope(scopeData as StaffScope);

      // Fetch farms list
      const { data: farmsData, error: farmsError } = await supabase.rpc('get_staff_farms', {
        p_staff_id: staffId,
      });

      if (farmsError) throw farmsError;

      setFarms(farmsData || []);
    } catch (err) {
      console.error('Error fetching staff scope:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch scope');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchScope();
  }, [fetchScope]);

  /**
   * Check if staff can access a specific farm
   */
  const canAccessFarm = useCallback(
    (farmId: string): boolean => {
      if (!scope) return false;
      if (scope.isGlobal || scope.canAccessAllFarms) return true;
      return scope.farmIds.includes(farmId);
    },
    [scope]
  );

  /**
   * Check if staff has access to specific farm (using RPC for security)
   */
  const checkFarmAccess = useCallback(async (farmId: string): Promise<boolean> => {
    try {
      const savedSession = localStorage.getItem('staff_session');
      if (!savedSession) return false;

      const session = JSON.parse(savedSession);

      const { data, error } = await supabase.rpc('check_farm_access', {
        p_staff_id: session.staffId,
        p_farm_id: farmId,
      });

      if (error) throw error;
      return data || false;
    } catch (err) {
      console.error('Error checking farm access:', err);
      return false;
    }
  }, []);

  /**
   * Get SQL filter for farm_id based on scope
   * Use this to filter queries in components
   */
  const getFarmFilter = useCallback((): string[] | null => {
    if (!scope) return null;
    if (scope.isGlobal || scope.canAccessAllFarms) return null; // No filter needed
    return scope.farmIds; // Filter by these farm IDs
  }, [scope]);

  /**
   * Check if user is farm manager of specific farm
   */
  const isFarmManager = useCallback(
    (farmId: string): boolean => {
      const farm = farms.find((f) => f.farm_id === farmId);
      return farm?.is_manager || false;
    },
    [farms]
  );

  /**
   * Get user's role in specific farm
   */
  const getFarmRole = useCallback(
    (farmId: string): string | null => {
      const farm = farms.find((f) => f.farm_id === farmId);
      return farm?.user_role || null;
    },
    [farms]
  );

  return {
    scope,
    farms,
    loading,
    error,
    refresh: fetchScope,

    // Helper functions
    canAccessFarm,
    checkFarmAccess,
    getFarmFilter,
    isFarmManager,
    getFarmRole,

    // Quick access properties
    isGlobal: scope?.isGlobal || false,
    scopeType: scope?.scopeType || 'FARM',
    farmIds: scope?.farmIds || [],
    canAccessAllFarms: scope?.canAccessAllFarms || false,
  };
}
