import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface InvestorIdentity {
  name: string;
  classification: string;
  totalTrees: number;
  currentStage: string;
  currentStatus: string;
  contractNumber?: string;
  operationalStatus?: string;
  loading: boolean;
  error: string | null;
}

export function useInvestorIdentity(accountId: string | null): InvestorIdentity {
  const [data, setData] = useState<InvestorIdentity>({
    name: 'مستثمر',
    classification: 'مستثمر جديد',
    totalTrees: 0,
    currentStage: 'جديد',
    currentStatus: 'pending',
    contractNumber: undefined,
    operationalStatus: undefined,
    loading: true,
    error: null
  });

  useEffect(() => {
    if (!accountId) {
      setData(prev => ({ ...prev, loading: false }));
      return;
    }

    fetchInvestorIdentity();

    // الاشتراك في تحديثات الحساب
    const subscription = supabase
      .channel(`investor_identity_${accountId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'b2f_investor_accounts',
          filter: `id=eq.${accountId}`
        },
        () => {
          fetchInvestorIdentity();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'b2f_sales_requests',
          filter: `investor_account_id=eq.${accountId}`
        },
        () => {
          fetchInvestorIdentity();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [accountId]);

  const fetchInvestorIdentity = async () => {
    if (!accountId) return;

    try {
      setData(prev => ({ ...prev, loading: true, error: null }));

      // جلب بيانات الحساب
      const { data: account, error: accountError } = await supabase
        .from('b2f_investor_accounts')
        .select('contact_name, total_trees, investor_classification, current_stage, contact_phone')
        .eq('id', accountId)
        .single();

      if (accountError) throw accountError;

      // جلب أحدث طلب للمستثمر للحصول على حالة المسار
      const { data: latestRequest } = await supabase
        .from('b2f_sales_requests')
        .select('status')
        .eq('investor_phone', account.contact_phone)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();


      // إذا لم يكن التصنيف موجود، احسبه
      if (!account.investor_classification || !account.total_trees) {
        // استدعاء دالة التحديث
        await supabase.rpc('update_investor_classification', {
          account_uuid: accountId
        });

        // إعادة جلب البيانات
        const { data: updatedAccount, error: updateError } = await supabase
          .from('b2f_investor_accounts')
          .select('contact_name, total_trees, investor_classification, current_stage')
          .eq('id', accountId)
          .single();

        if (updateError) throw updateError;

        setData({
          name: updatedAccount.contact_name || 'مستثمر',
          classification: updatedAccount.investor_classification || 'مستثمر جديد',
          totalTrees: updatedAccount.total_trees || 0,
          currentStage: updatedAccount.current_stage || 'جديد',
          currentStatus: latestRequest?.status || 'pending',
          contractNumber: undefined,
          operationalStatus: undefined,
          loading: false,
          error: null
        });
      } else {
        // استخدام البيانات الموجودة
        setData({
          name: account.contact_name || 'مستثمر',
          classification: account.investor_classification || 'مستثمر جديد',
          totalTrees: account.total_trees || 0,
          currentStage: account.current_stage || 'جديد',
          currentStatus: latestRequest?.status || 'pending',
          contractNumber: undefined,
          operationalStatus: undefined,
          loading: false,
          error: null
        });
      }

      // تحديث المرحلة الحالية
      const { data: stageData } = await supabase.rpc('get_investor_current_stage', {
        account_uuid: accountId
      });

      if (stageData) {
        setData(prev => ({ ...prev, currentStage: stageData }));
      }
    } catch (err: any) {
      console.error('Error fetching investor identity:', err);
      setData(prev => ({
        ...prev,
        loading: false,
        error: err.message
      }));
    }
  };

  return data;
}
