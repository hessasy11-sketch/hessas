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
      const adminUserId = sessionStorage.getItem('adminUserId');
      if (!adminUserId) {
        return { success: false, error: 'يجب تسجيل الدخول أولاً' };
      }

      const { data, error: rpcError } = await supabase.rpc('add_farm_as_admin', {
        p_user_id: adminUserId,
        p_name: farmData.name,
        p_location: farmData.location,
        p_total_trees_available: farmData.total_trees_available,
        p_description: farmData.description,
        p_city: farmData.city,
        p_is_active: farmData.is_active
      });

      if (rpcError) {
        console.error('RPC error:', rpcError);
        throw rpcError;
      }

      if (data && !data.success) {
        return { success: false, error: data.error || 'فشل إضافة المزرعة' };
      }

      await loadFarms();
      return { success: true, data };
    } catch (err: any) {
      console.error('Error adding B2F farm:', err);
      return {
        success: false,
        error: err.message || 'فشل إضافة المزرعة'
      };
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
