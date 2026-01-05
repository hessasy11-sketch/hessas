import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useMasterActions() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleFarmBookings = useCallback(async (
    farmId: string,
    enabled: boolean,
    staffId: string,
    notes?: string
  ): Promise<{ success: boolean; data?: any; error?: string }> => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('master_toggle_farm_bookings', {
        p_farm_id: farmId,
        p_enabled: enabled,
        p_staff_id: staffId,
        p_notes: notes || (enabled ? 'فتح الحجوزات من غرفة العمليات' : 'إيقاف الحجوزات من غرفة العمليات')
      });

      if (rpcError) {
        console.error('Error toggling farm bookings:', rpcError);
        setError(rpcError.message);
        return { success: false, error: rpcError.message };
      }

      if (!data || !data.success) {
        const errorMsg = data?.error || 'فشل في تغيير حالة الحجوزات';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }

      return { success: true, data };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'خطأ غير متوقع';
      console.error('Unexpected error:', err);
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, []);

  const extendAuctionTime = useCallback(async (
    auctionId: string,
    minutes: number,
    staffId: string,
    notes?: string
  ): Promise<{ success: boolean; data?: any; error?: string }> => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('master_extend_auction_time', {
        p_auction_id: auctionId,
        p_minutes: minutes,
        p_staff_id: staffId,
        p_notes: notes || `تمديد ${minutes} دقيقة من غرفة العمليات`
      });

      if (rpcError) {
        console.error('Error extending auction time:', rpcError);
        setError(rpcError.message);
        return { success: false, error: rpcError.message };
      }

      if (!data || !data.success) {
        const errorMsg = data?.error || 'فشل في تمديد وقت المزاد';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }

      return { success: true, data };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'خطأ غير متوقع';
      console.error('Unexpected error:', err);
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    toggleFarmBookings,
    extendAuctionTime,
    loading,
    error
  };
}
