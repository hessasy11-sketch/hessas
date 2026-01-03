import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface WalletData {
  user_id: string;
  balance: number;
  total_earnings: number;
  pending_commissions: number;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: 'deposit' | 'withdrawal' | 'commission' | 'refund';
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  description: string;
  reference_id: string | null;
  created_at: string;
}

export interface Commission {
  id: string;
  user_id: string;
  auction_id: string | null;
  amount: number;
  percentage: number;
  status: 'pending' | 'paid';
  paid_at: string | null;
  created_at: string;
}

export function useWallet() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWallet = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!data) {
        const { data: newWallet, error: insertError } = await supabase
          .from('wallets')
          .insert([{ user_id: user.id }])
          .select()
          .single();

        if (insertError) throw insertError;
        setWallet(newWallet);
      } else {
        setWallet(data);
      }
    } catch (err) {
      console.error('Error fetching wallet:', err);
      setError('فشل تحميل بيانات المحفظة');
    }
  }, [user]);

  const fetchTransactions = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (fetchError) throw fetchError;
      setTransactions(data || []);
    } catch (err) {
      console.error('Error fetching transactions:', err);
    }
  }, [user]);

  const fetchCommissions = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('commissions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setCommissions(data || []);
    } catch (err) {
      console.error('Error fetching commissions:', err);
    }
  }, [user]);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      await Promise.all([
        fetchWallet(),
        fetchTransactions(),
        fetchCommissions()
      ]);
    } catch (err) {
      console.error('Error fetching wallet data:', err);
      setError('حدث خطأ أثناء تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }, [fetchWallet, fetchTransactions, fetchCommissions]);

  const fetchSoldAuctions = useCallback(async () => {
    if (!user) return { total: 0, count: 0 };

    try {
      const { data, error: fetchError } = await supabase
        .from('auctions')
        .select('current_price')
        .eq('owner_id', user.id)
        .eq('status', 'sold');

      if (fetchError) throw fetchError;

      const total = data?.reduce((sum, auction) => sum + Number(auction.current_price), 0) || 0;
      return { total, count: data?.length || 0 };
    } catch (err) {
      console.error('Error fetching sold auctions:', err);
      return { total: 0, count: 0 };
    }
  }, [user]);

  const addTransaction = async (
    type: Transaction['type'],
    amount: number,
    description: string,
    referenceId?: string
  ) => {
    if (!user) return { success: false, error: 'المستخدم غير مسجل' };

    try {
      const { data, error: insertError } = await supabase
        .from('transactions')
        .insert([
          {
            user_id: user.id,
            type,
            amount,
            description,
            reference_id: referenceId || null,
            status: 'completed'
          }
        ])
        .select()
        .single();

      if (insertError) throw insertError;

      if (type === 'deposit') {
        const { error: updateError } = await supabase
          .from('wallets')
          .update({
            balance: (wallet?.balance || 0) + amount,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);

        if (updateError) throw updateError;
      } else if (type === 'withdrawal') {
        const { error: updateError } = await supabase
          .from('wallets')
          .update({
            balance: (wallet?.balance || 0) - amount,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);

        if (updateError) throw updateError;
      }

      await fetchAllData();
      return { success: true, data };
    } catch (err) {
      console.error('Error adding transaction:', err);
      return { success: false, error: 'فشل إضافة العملية' };
    }
  };

  const payCommission = async (commissionId: string, amount: number) => {
    if (!user) return { success: false, error: 'المستخدم غير مسجل' };

    try {
      const { error: commissionError } = await supabase
        .from('commissions')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString()
        })
        .eq('id', commissionId);

      if (commissionError) throw commissionError;

      const { error: transactionError } = await supabase
        .from('transactions')
        .insert([
          {
            user_id: user.id,
            type: 'commission',
            amount,
            description: `دفع عمولة مزاد`,
            reference_id: commissionId,
            status: 'completed'
          }
        ]);

      if (transactionError) throw transactionError;

      const { error: walletError } = await supabase
        .from('wallets')
        .update({
          balance: (wallet?.balance || 0) - amount,
          pending_commissions: (wallet?.pending_commissions || 0) - amount,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (walletError) throw walletError;

      await fetchAllData();
      return { success: true };
    } catch (err) {
      console.error('Error paying commission:', err);
      return { success: false, error: 'فشل دفع العمولة' };
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  return {
    wallet,
    transactions,
    commissions,
    loading,
    error,
    refetch: fetchAllData,
    addTransaction,
    payCommission,
    fetchSoldAuctions
  };
}
