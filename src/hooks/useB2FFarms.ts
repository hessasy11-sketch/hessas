import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { adminSessionManager } from '../utils/adminSessionManager';

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
      const session = adminSessionManager.getSession();
      if (!session?.staff_id) {
        return { success: false, error: 'يجب تسجيل الدخول أولاً' };
      }

      const { data, error: rpcError } = await supabase.rpc('admin_add_farm', {
        p_staff_id: session.staff_id,
        p_name: farmData.name,
        p_location: farmData.location,
        p_city: farmData.city || '',
        p_total_trees_available: farmData.total_trees_available || 0,
        p_description: farmData.description || null,
        p_tree_type: null,
        p_area_size: null,
        p_area_unit: 'acre'
      });

      if (rpcError) {
        console.error('RPC error:', rpcError);
        throw rpcError;
      }

      if (data && !data.success) {
        return { success: false, error: data.message || 'فشل إضافة المزرعة' };
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
      const session = adminSessionManager.getSession();
      if (!session?.staff_id) {
        return { success: false, error: 'يجب تسجيل الدخول أولاً' };
      }

      const { data, error: rpcError } = await supabase.rpc('admin_update_farm', {
        p_staff_id: session.staff_id,
        p_farm_id: id,
        p_name: farmData.name || null,
        p_location: farmData.location || null,
        p_city: farmData.city || null,
        p_total_trees_available: farmData.total_trees_available || null,
        p_description: farmData.description || null,
        p_tree_type: null,
        p_area_size: null,
        p_area_unit: null,
        p_is_active: farmData.is_active !== undefined ? farmData.is_active : null
      });

      if (rpcError) {
        console.error('RPC error:', rpcError);
        throw rpcError;
      }

      if (data && !data.success) {
        return { success: false, error: data.message || 'فشل تحديث المزرعة' };
      }

      await loadFarms();
      return { success: true };
    } catch (err: any) {
      console.error('Error updating B2B farm:', err);
      return { success: false, error: err.message || 'فشل تحديث المزرعة' };
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
