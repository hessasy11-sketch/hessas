import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface Farm {
  id: string;
  name: string;
  location: string;
  city: string | null;
  tree_type: 'نخيل' | 'زيتون' | 'أخرى';
  custom_tree_type: string | null;
  total_trees_available: number;
  area_size: number;
  area_unit: string;
  internal_description: string | null;
  marketing_description: string | null;
  images: string[];
  status: 'active' | 'under_preparation' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface FarmStatistics {
  active_opportunities_count: number;
  total_trees_in_opportunities: number;
  usage_percentage: number;
}

export interface FarmWithStats extends Farm {
  statistics?: FarmStatistics;
}

export function useFarms() {
  const [farms, setFarms] = useState<FarmWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFarms = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('farms')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      if (data) {
        const farmsWithStats = await Promise.all(
          data.map(async (farm) => {
            try {
              const { data: stats } = await supabase
                .rpc('get_farm_statistics', { farm_id_param: farm.id });

              return {
                ...farm,
                statistics: stats || {
                  active_opportunities_count: 0,
                  total_trees_in_opportunities: 0,
                  usage_percentage: 0,
                },
              };
            } catch {
              return {
                ...farm,
                statistics: {
                  active_opportunities_count: 0,
                  total_trees_in_opportunities: 0,
                  usage_percentage: 0,
                },
              };
            }
          })
        );

        setFarms(farmsWithStats);
      }
    } catch (err) {
      console.error('Error loading farms:', err);
      setError('فشل تحميل المزارع');
    } finally {
      setLoading(false);
    }
  };

  const addFarm = async (farmData: Omit<Farm, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error: insertError } = await supabase
        .from('farms')
        .insert([farmData])
        .select()
        .single();

      if (insertError) throw insertError;

      await loadFarms();
      return { success: true, data };
    } catch (err) {
      console.error('Error adding farm:', err);
      return { success: false, error: 'فشل إضافة المزرعة' };
    }
  };

  const updateFarm = async (id: string, farmData: Partial<Farm>) => {
    try {
      const { error: updateError } = await supabase
        .from('farms')
        .update(farmData)
        .eq('id', id);

      if (updateError) throw updateError;

      await loadFarms();
      return { success: true };
    } catch (err) {
      console.error('Error updating farm:', err);
      return { success: false, error: 'فشل تحديث المزرعة' };
    }
  };

  const deleteFarm = async (id: string) => {
    try {
      const { data: canDelete } = await supabase
        .rpc('can_delete_farm', { farm_id_param: id });

      if (!canDelete) {
        return {
          success: false,
          error: 'لا يمكن حذف المزرعة لوجود عروض/طلبات مرتبطة بها',
          canDelete: false,
        };
      }

      const { error: deleteError } = await supabase
        .from('farms')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      await loadFarms();
      return { success: true, canDelete: true };
    } catch (err) {
      console.error('Error deleting farm:', err);
      return { success: false, error: 'فشل حذف المزرعة', canDelete: false };
    }
  };

  const toggleFarmStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    return await updateFarm(id, { status: newStatus as Farm['status'] });
  };

  useEffect(() => {
    loadFarms();
  }, []);

  return {
    farms,
    loading,
    error,
    addFarm,
    updateFarm,
    deleteFarm,
    toggleFarmStatus,
    reloadFarms: loadFarms,
  };
}
