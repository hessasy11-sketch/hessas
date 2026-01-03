import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface OperationFee {
  id: string;
  certificate_id: string | null;
  investor_phone: string | null;
  farm_name: string;
  certificate_number: string | null;
  trees_count: number;
  fee_per_tree: number;
  total_fee: number;
  status: 'active' | 'will_change_soon' | 'under_review' | 'suspended';
  effective_from: string;
  effective_to: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  is_recently_updated?: boolean;
  investor_name?: string;
  certificate_issue_date?: string;
  contract_start_date?: string;
  contract_end_date?: string;
}

export function useOperationFees(phoneNumber?: string) {
  const [fees, setFees] = useState<OperationFee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  useEffect(() => {
    if (!phoneNumber) {
      setFees([]);
      setLoading(false);
      return;
    }

    fetchOperationFees();
  }, [phoneNumber]);

  const fetchOperationFees = async () => {
    if (!phoneNumber) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('b2f_operation_fees_with_certificates')
        .select('*')
        .eq('investor_phone', phoneNumber)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const feesData = (data || []) as OperationFee[];
      setFees(feesData);

      if (feesData.length > 0) {
        const latestUpdate = feesData.reduce((latest, fee) => {
          const feeDate = new Date(fee.updated_at);
          return !latest || feeDate > new Date(latest) ? fee.updated_at : latest;
        }, '');
        setLastUpdate(latestUpdate);
      }
    } catch (err) {
      console.error('Error fetching operation fees:', err);
      setError(err instanceof Error ? err.message : 'حدث خطأ في تحميل رسوم التشغيل');
    } finally {
      setLoading(false);
    }
  };

  const getFeeById = async (feeId: string): Promise<OperationFee | null> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('b2f_operation_fees_with_certificates')
        .select('*')
        .eq('id', feeId)
        .single();

      if (fetchError) throw fetchError;

      return data as OperationFee;
    } catch (err) {
      console.error('Error fetching fee details:', err);
      return null;
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const getStatusBadgeColor = (status: OperationFee['status']): string => {
    const colorMap = {
      active: 'bg-green-500',
      will_change_soon: 'bg-yellow-500',
      under_review: 'bg-blue-500',
      suspended: 'bg-red-500'
    };
    return colorMap[status] || 'bg-gray-500';
  };

  const isRecentlyUpdated = (fee: OperationFee): boolean => {
    if (fee.is_recently_updated !== undefined) {
      return fee.is_recently_updated;
    }

    const updatedDate = new Date(fee.updated_at);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return updatedDate > sevenDaysAgo;
  };

  return {
    fees,
    loading,
    error,
    lastUpdate,
    getFeeById,
    formatDate,
    formatCurrency,
    getStatusBadgeColor,
    isRecentlyUpdated,
    refresh: fetchOperationFees
  };
}
