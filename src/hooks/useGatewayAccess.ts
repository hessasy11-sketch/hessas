import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface GatewayCard {
  id: string;
  card_key: string;
  title_ar: string;
  title_en?: string;
  description_ar?: string;
  description_en?: string;
  icon: string;
  color: string;
  gradient_from?: string;
  gradient_to?: string;
  route_path: string;
  display_order: number;
  allowed_roles?: string[];
  user_role?: string;
  access_reason?: string;
  is_gm_access: boolean;
}

export interface GatewayMappingRow {
  card_key: string;
  title_ar: string;
  route_path: string;
  allowed_roles: string[];
  roles_count: number;
  notes: string;
}

export function useGatewayAccess(userId?: string) {
  const [cards, setCards] = useState<GatewayCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUserCards = async (uid: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: err } = await supabase.rpc('get_user_gateway_cards', {
        p_user_id: uid
      });

      if (err) throw err;

      setCards(data || []);
    } catch (err: any) {
      console.error('Error loading gateway cards:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const grantAccess = async (
    userId: string,
    cardKey: string,
    accessLevel: string = 'view',
    grantedBy?: string,
    validUntil?: string,
    notes?: string
  ): Promise<string | null> => {
    try {
      const { data, error: err } = await supabase.rpc('grant_gateway_access', {
        p_user_id: userId,
        p_card_key: cardKey,
        p_access_level: accessLevel,
        p_granted_by: grantedBy,
        p_valid_until: validUntil,
        p_notes: notes
      });

      if (err) throw err;

      if (userId) {
        await loadUserCards(userId);
      }

      return data;
    } catch (err: any) {
      console.error('Error granting access:', err);
      return null;
    }
  };

  const revokeAccess = async (userId: string, cardKey: string): Promise<boolean> => {
    try {
      const { data, error: err } = await supabase.rpc('revoke_gateway_access', {
        p_user_id: userId,
        p_card_key: cardKey
      });

      if (err) throw err;

      if (userId) {
        await loadUserCards(userId);
      }

      return data;
    } catch (err: any) {
      console.error('Error revoking access:', err);
      return false;
    }
  };

  const checkAccess = async (userId: string, cardKey: string): Promise<boolean> => {
    try {
      const { data, error: err } = await supabase.rpc('check_gateway_access', {
        p_user_id: userId,
        p_card_key: cardKey
      });

      if (err) throw err;

      return data;
    } catch (err: any) {
      console.error('Error checking access:', err);
      return false;
    }
  };

  const getGatewayMapping = async (): Promise<GatewayMappingRow[]> => {
    try {
      const { data, error: err } = await supabase.rpc('get_gateway_mapping_table');

      if (err) throw err;

      return data || [];
    } catch (err: any) {
      console.error('Error loading gateway mapping:', err);
      return [];
    }
  };

  useEffect(() => {
    if (userId) {
      loadUserCards(userId);

      const subscription = supabase
        .channel('gateway-changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'gateway_access',
          filter: `user_id=eq.${userId}`
        }, () => {
          loadUserCards(userId);
        })
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [userId]);

  return {
    cards,
    loading,
    error,
    refresh: userId ? () => loadUserCards(userId) : () => {},
    grantAccess,
    revokeAccess,
    checkAccess,
    getGatewayMapping
  };
}
