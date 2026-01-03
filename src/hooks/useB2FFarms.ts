import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface B2FFarm {
  id: string;
  name: string;
  description: string | null;
  location: string;
  city: string | null;
  total_trees_available: number;
  images: any[];
  video_url: string | null;
  location_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useB2FFarms() {
  const [farms, setFarms] = useState<B2FFarm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFarms = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('b2f_farms')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setFarms(data || []);
    } catch (err) {
      console.error('Error loading B2F farms:', err);
      setError('فشل تحميل المزارع');
    } finally {
      setLoading(false);
    }
  };

  const addFarm = async (farmData: Omit<B2FFarm, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error: insertError } = await supabase
        .from('b2f_farms')
        .insert([farmData])
        .select()
        .single();

      if (insertError) throw insertError;

      await loadFarms();
      return { success: true, data };
    } catch (err) {
      console.error('Error adding B2F farm:', err);
      return { success: false, error: 'فشل إضافة المزرعة' };
    }
  };

  const updateFarm = async (id: string, farmData: Partial<B2FFarm>) => {
    try {
      const { error: updateError } = await supabase
        .from('b2f_farms')
        .update(farmData)
        .eq('id', id);

      if (updateError) throw updateError;

      await loadFarms();
      return { success: true };
    } catch (err) {
      console.error('Error updating B2F farm:', err);
      return { success: false, error: 'فشل تحديث المزرعة' };
    }
  };

  const deleteFarm = async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('b2f_farms')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      await loadFarms();
      return { success: true };
    } catch (err) {
      console.error('Error deleting B2F farm:', err);
      return { success: false, error: 'فشل حذف المزرعة' };
    }
  };

  const toggleFarmStatus = async (id: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    return await updateFarm(id, { is_active: newStatus });
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
