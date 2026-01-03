import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface PaymentGateway {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  type: 'electronic' | 'bank_transfer' | 'bnpl';
  description: string;
  icon_color: string;
  enabled: boolean;
  config: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export function usePaymentGateways() {
  const [gateways, setGateways] = useState<PaymentGateway[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGateways();
  }, []);

  const fetchGateways = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('b2f_payment_gateways_config')
        .select('*')
        .order('code');

      if (error) throw error;
      setGateways(data || []);
    } catch (error) {
      console.error('Error fetching gateways:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleGateway = async (id: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('b2f_payment_gateways_config')
        .update({ enabled })
        .eq('id', id);

      if (error) throw error;

      // تحديث الحالة المحلية
      setGateways(prev =>
        prev.map(g => g.id === id ? { ...g, enabled } : g)
      );

      return { success: true };
    } catch (error) {
      console.error('Error toggling gateway:', error);
      return { success: false, error };
    }
  };

  const updateGatewayConfig = async (id: string, config: Record<string, any>) => {
    try {
      const { error } = await supabase
        .from('b2f_payment_gateways_config')
        .update({ config })
        .eq('id', id);

      if (error) throw error;

      // تحديث الحالة المحلية
      setGateways(prev =>
        prev.map(g => g.id === id ? { ...g, config } : g)
      );

      return { success: true };
    } catch (error) {
      console.error('Error updating gateway config:', error);
      return { success: false, error };
    }
  };

  const getEnabledGateways = () => {
    return gateways.filter(g => g.enabled);
  };

  return {
    gateways,
    loading,
    toggleGateway,
    updateGatewayConfig,
    getEnabledGateways,
    refreshGateways: fetchGateways
  };
}
