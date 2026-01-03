import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface Opportunity {
  id: string;
  farm_id: string;
  title: string;
  description: string | null;
  tree_type: string;
  custom_tree_type: string | null;
  investment_type: string;
  price_per_tree: number;
  min_trees: number;
  max_trees: number | null;
  available_trees: number;
  contract_duration_years: number;
  expected_return: string | null;
  badge: string;
  internal_tag: string | null;
  video_url: string | null;
  location_url: string | null;
  images: any[];
  status: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OpportunityStatistics {
  available_trees: number;
  reserved_trees: number;
  remaining_trees: number;
  reservation_count: number;
  is_full: boolean;
}

export interface OpportunityWithStats extends Opportunity {
  statistics?: OpportunityStatistics;
  farm?: {
    name: string;
    location: string;
    city: string | null;
  };
}

export function useOpportunities() {
  const [opportunities, setOpportunities] = useState<OpportunityWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOpportunities = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('b2f_opportunities')
        .select(`
          *,
          b2f_farms (
            name,
            location,
            city
          )
        `)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      if (data) {
        const opportunitiesWithStats = await Promise.all(
          data.map(async (opportunity) => {
            try {
              const { data: stats, error: statsError } = await supabase
                .rpc('get_b2f_opportunity_statistics', {
                  opportunity_id_param: opportunity.id
                });

              if (statsError) {
                console.error('Error fetching statistics for opportunity:', opportunity.id, statsError);
              }

              const parsedStats = typeof stats === 'string' ? JSON.parse(stats) : stats;

              return {
                ...opportunity,
                farm: opportunity.b2f_farms,
                statistics: parsedStats || {
                  available_trees: opportunity.available_trees,
                  reserved_trees: 0,
                  remaining_trees: opportunity.available_trees,
                  reservation_count: 0,
                  is_full: false,
                },
              };
            } catch (err) {
              console.error('Error processing opportunity statistics:', err);
              return {
                ...opportunity,
                farm: opportunity.b2f_farms,
                statistics: {
                  available_trees: opportunity.available_trees,
                  reserved_trees: 0,
                  remaining_trees: opportunity.available_trees,
                  reservation_count: 0,
                  is_full: false,
                },
              };
            }
          })
        );

        setOpportunities(opportunitiesWithStats);
      }
    } catch (err) {
      console.error('Error loading opportunities:', err);
      setError('فشل تحميل العروض الاستثمارية');
    } finally {
      setLoading(false);
    }
  }, []);

  const addOpportunity = async (opportunityData: Omit<Opportunity, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      console.log('Adding opportunity with data:', opportunityData);

      const { data, error: insertError } = await supabase
        .from('b2f_opportunities')
        .insert([opportunityData])
        .select()
        .single();

      if (insertError) {
        console.error('Insert error:', insertError);
        throw insertError;
      }

      await loadOpportunities();
      return { success: true, data };
    } catch (err: any) {
      console.error('Error adding opportunity:', err);
      const errorMessage = err?.message || 'فشل إضافة العرض الاستثماري';
      return { success: false, error: errorMessage };
    }
  };

  const updateOpportunity = async (id: string, opportunityData: Partial<Opportunity>) => {
    try {
      const { error: updateError } = await supabase
        .from('b2f_opportunities')
        .update(opportunityData)
        .eq('id', id);

      if (updateError) throw updateError;

      await loadOpportunities();
      return { success: true };
    } catch (err) {
      console.error('Error updating opportunity:', err);
      return { success: false, error: 'فشل تحديث العرض' };
    }
  };

  const deleteOpportunity = async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('b2f_opportunities')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      await loadOpportunities();
      return { success: true };
    } catch (err) {
      console.error('Error deleting opportunity:', err);
      return { success: false, error: 'فشل حذف العرض' };
    }
  };

  const duplicateOpportunity = async (id: string) => {
    try {
      const { data, error: duplicateError } = await supabase
        .rpc('duplicate_b2f_opportunity', { opportunity_id_param: id });

      if (duplicateError) throw duplicateError;

      await loadOpportunities();
      return { success: true, newId: data };
    } catch (err) {
      console.error('Error duplicating opportunity:', err);
      return { success: false, error: 'فشل نسخ العرض' };
    }
  };

  const toggleOpportunityStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'hidden' : 'active';
    return await updateOpportunity(id, { status: newStatus });
  };

  useEffect(() => {
    loadOpportunities();
  }, []);

  return {
    opportunities,
    loading,
    error,
    addOpportunity,
    updateOpportunity,
    deleteOpportunity,
    duplicateOpportunity,
    toggleOpportunityStatus,
    reloadOpportunities: loadOpportunities,
  };
}
