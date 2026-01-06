import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface DecisionAuthority {
  id: string;
  decision_type: string;
  allowed_role: string;
  conditions: Record<string, any>;
  description_ar: string;
  description_en: string;
  is_active: boolean;
}

interface DecisionTypeWithAuthorities {
  decision_type: string;
  decision_name_ar: string;
  decision_name_en: string;
  authorities: DecisionAuthority[];
}

export function useDecisionAuthorities() {
  const [decisionTypes, setDecisionTypes] = useState<DecisionTypeWithAuthorities[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAuthorities = async () => {
    try {
      setLoading(true);
      const { data, error: err } = await supabase
        .rpc('get_all_decision_types_with_authorities');

      if (err) throw err;
      setDecisionTypes(data || []);
    } catch (err: any) {
      setError(err.message);
      console.error('Error loading decision authorities:', err);
    } finally {
      setLoading(false);
    }
  };

  const addAuthority = async (
    decisionType: string,
    allowedRole: string,
    conditions: Record<string, any> = {},
    descriptionAr?: string,
    descriptionEn?: string
  ) => {
    try {
      const { data, error: err } = await supabase.rpc('add_decision_authority', {
        p_decision_type: decisionType,
        p_allowed_role: allowedRole,
        p_conditions: conditions,
        p_description_ar: descriptionAr,
        p_description_en: descriptionEn
      });

      if (err) throw err;

      await loadAuthorities();
      return { success: true, data };
    } catch (err: any) {
      console.error('Error adding authority:', err);
      return { success: false, error: err.message };
    }
  };

  const removeAuthority = async (authorityId: string) => {
    try {
      const { data, error: err } = await supabase.rpc('remove_decision_authority', {
        p_authority_id: authorityId
      });

      if (err) throw err;

      await loadAuthorities();
      return { success: true, data };
    } catch (err: any) {
      console.error('Error removing authority:', err);
      return { success: false, error: err.message };
    }
  };

  const canApproveDecision = async (decisionId: string, staffId: string) => {
    try {
      const { data, error: err } = await supabase.rpc('can_approve_decision', {
        p_decision_id: decisionId,
        p_staff_id: staffId
      });

      if (err) throw err;
      return data;
    } catch (err: any) {
      console.error('Error checking approval authority:', err);
      return { can_approve: false, reason: err.message };
    }
  };

  useEffect(() => {
    loadAuthorities();
  }, []);

  return {
    decisionTypes,
    loading,
    error,
    addAuthority,
    removeAuthority,
    canApproveDecision,
    refresh: loadAuthorities
  };
}
