import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface Delegation {
  id: string;
  delegator_id: string;
  delegator_name: string;
  delegate_id: string;
  delegate_name: string;
  permission_type: string;
  scope_type: string;
  scope_id?: string;
  scope_name: string;
  limits: any;
  status: string;
  valid_from: string;
  valid_until?: string;
  created_at: string;
}

export function useDelegations() {
  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDelegations = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: err } = await supabase.rpc('get_all_delegations');

      if (err) throw err;

      setDelegations(data || []);
    } catch (err: any) {
      console.error('Error loading delegations:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createDelegation = async (delegationData: {
    delegator_id: string;
    delegate_id: string;
    permission_type: string;
    scope_type: string;
    scope_id?: string;
    limits?: any;
    valid_until?: string;
    notes?: string;
  }): Promise<string | null> => {
    try {
      const { data, error: err } = await supabase.rpc('create_delegation', {
        p_delegator_id: delegationData.delegator_id,
        p_delegate_id: delegationData.delegate_id,
        p_permission_type: delegationData.permission_type,
        p_scope_type: delegationData.scope_type,
        p_scope_id: delegationData.scope_id,
        p_limits: delegationData.limits || {},
        p_valid_until: delegationData.valid_until,
        p_notes: delegationData.notes
      });

      if (err) throw err;

      await loadDelegations();
      return data;
    } catch (err: any) {
      console.error('Error creating delegation:', err);
      return null;
    }
  };

  const revokeDelegation = async (delegationId: string): Promise<boolean> => {
    try {
      const { data, error: err } = await supabase.rpc('revoke_delegation', {
        p_delegation_id: delegationId
      });

      if (err) throw err;

      await loadDelegations();
      return data;
    } catch (err: any) {
      console.error('Error revoking delegation:', err);
      return false;
    }
  };

  const checkPermission = async (
    staffId: string,
    permissionType: string,
    targetId: string,
    targetType: string = 'cluster'
  ): Promise<boolean> => {
    try {
      const { data, error: err } = await supabase.rpc('check_delegation_permission', {
        p_staff_id: staffId,
        p_permission_type: permissionType,
        p_target_id: targetId,
        p_target_type: targetType
      });

      if (err) throw err;

      return data;
    } catch (err: any) {
      console.error('Error checking permission:', err);
      return false;
    }
  };

  useEffect(() => {
    loadDelegations();

    const subscription = supabase
      .channel('delegations-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'delegation_scopes'
      }, () => {
        loadDelegations();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return {
    delegations,
    loading,
    error,
    refresh: loadDelegations,
    createDelegation,
    revokeDelegation,
    checkPermission
  };
}
