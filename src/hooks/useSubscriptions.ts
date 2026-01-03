import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface SubscriptionPlan {
  id: string;
  name: string;
  name_ar: string;
  description_ar: string;
  price: number;
  duration_days: number;
  features_ar: string[];
  is_active: boolean;
  display_order: number;
}

export interface BankTransfer {
  id: string;
  tracking_number: string;
  amount: number;
  expected_amount: number;
  ai_status: string;
  ai_confidence: number;
  ai_notes: string;
  ai_extracted_data: any;
  admin_decision: string;
  admin_notes: string;
  status: string;
  receipt_url: string;
  created_at: string;
}

export function useSubscriptions() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [transfers, setTransfers] = useState<BankTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlans = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (fetchError) throw fetchError;
      setPlans(data || []);
    } catch (err) {
      console.error('Error fetching plans:', err);
      setError('حدث خطأ أثناء تحميل الباقات');
    }
  }, []);

  const fetchTransfers = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('bank_transfers')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setTransfers(data || []);
    } catch (err) {
      console.error('Error fetching transfers:', err);
    }
  }, [user]);

  const createTransfer = async (planId: string, amount: number): Promise<string | null> => {
    if (!user) return null;

    try {
      const { data: trackingData } = await supabase.rpc('generate_tracking_number');
      const trackingNumber = trackingData || `TRX-${Date.now()}`;

      const { data: subscription, error: subError } = await supabase
        .from('user_subscriptions')
        .insert({
          user_id: user.id,
          plan_id: planId,
          status: 'pending'
        })
        .select()
        .single();

      if (subError) throw subError;

      const { data: transfer, error: transferError } = await supabase
        .from('bank_transfers')
        .insert({
          tracking_number: trackingNumber,
          user_id: user.id,
          subscription_id: subscription.id,
          amount: 0,
          expected_amount: amount,
          status: 'pending_upload'
        })
        .select()
        .single();

      if (transferError) throw transferError;

      await fetchTransfers();
      return transfer.id;
    } catch (err) {
      console.error('Error creating transfer:', err);
      return null;
    }
  };

  const uploadReceipt = async (transferId: string, file: File): Promise<boolean> => {
    if (!user) return false;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${transferId}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('receipts')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('bank_transfers')
        .update({
          receipt_url: publicUrl,
          status: 'analyzing'
        })
        .eq('id', transferId);

      if (updateError) throw updateError;

      await fetchTransfers();
      return true;
    } catch (err) {
      console.error('Error uploading receipt:', err);
      return false;
    }
  };

  const analyzeReceipt = async (transferId: string, expectedAmount: number): Promise<boolean> => {
    try {
      const transfer = transfers.find(t => t.id === transferId);
      if (!transfer) return false;

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-receipt`;
      const headers = {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          transferId,
          receiptUrl: transfer.receipt_url,
          expectedAmount
        })
      });

      const result = await response.json();

      if (result.success) {
        await fetchTransfers();
        return true;
      }

      return false;
    } catch (err) {
      console.error('Error analyzing receipt:', err);
      return false;
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchPlans(), fetchTransfers()]);
      setLoading(false);
    };

    loadData();
  }, [fetchPlans, fetchTransfers]);

  return {
    plans,
    transfers,
    loading,
    error,
    createTransfer,
    uploadReceipt,
    analyzeReceipt,
    refetch: async () => {
      await Promise.all([fetchPlans(), fetchTransfers()]);
    }
  };
}
