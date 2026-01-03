import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface InvestorJourneyData {
  // بيانات الهوية
  name: string;
  classification: string;
  totalTrees: number;
  currentStage: string;

  // بيانات المسار
  latestStatus: string;
  contractNumber?: string;
  operationalStatus?: string;

  // بيانات آخر طلب
  latestRequest?: {
    id: string;
    tree_type: string;
    number_of_trees: number;
    total_amount: number;
    status: string;
    created_at: string;
  };

  // حالات التحميل
  loading: boolean;
  error: string | null;
}

/**
 * Hook لجلب بيانات مسار المستثمر بشكل لحظي
 * يجلب البيانات مباشرة من قاعدة البيانات ويستخدم Realtime
 */
export function useInvestorJourney(investorPhone: string | null): InvestorJourneyData {
  const [data, setData] = useState<InvestorJourneyData>({
    name: 'مستثمر',
    classification: 'مستثمر جديد',
    totalTrees: 0,
    currentStage: 'جديد',
    latestStatus: 'pending',
    latestRequest: undefined,
    loading: true,
    error: null
  });

  useEffect(() => {
    if (!investorPhone) {
      setData(prev => ({ ...prev, loading: false }));
      return;
    }

    // جلب البيانات مباشرة
    fetchJourneyData();

    // الاشتراك في التحديثات اللحظية
    const channel = supabase
      .channel(`investor_journey_${investorPhone}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'b2f_sales_requests',
          filter: `investor_phone=eq.${investorPhone}`
        },
        (payload) => {
          console.log('🔄 تحديث فوري - طلب جديد:', payload);
          fetchJourneyData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'b2f_investor_accounts',
          filter: `contact_phone=eq.${investorPhone}`
        },
        (payload) => {
          console.log('🔄 تحديث فوري - حساب محدث:', payload);
          fetchJourneyData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [investorPhone]);

  const fetchJourneyData = async () => {
    if (!investorPhone) return;

    try {
      setData(prev => ({ ...prev, loading: true, error: null }));

      // 1. جلب بيانات الحساب
      const { data: account, error: accountError } = await supabase
        .from('b2f_investor_accounts')
        .select('contact_name, total_trees, investor_classification, current_stage')
        .eq('contact_phone', investorPhone)
        .maybeSingle();

      if (accountError) throw accountError;

      // 2. جلب آخر طلب للمستثمر
      const { data: latestRequest, error: requestError } = await supabase
        .from('b2f_sales_requests')
        .select('id, tree_type, number_of_trees, total_amount, status, contract_number, created_at')
        .eq('investor_phone', investorPhone)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (requestError) throw requestError;

      console.log('📊 بيانات مسار المستثمر:', {
        account,
        latestRequest
      });

      // 3. تحديد المرحلة الحالية من الحالة الفعلية
      const currentStage = getCurrentStageFromStatus(latestRequest?.status || 'pending');

      // 4. تحديد التصنيف
      const classification = getClassificationFromTrees(account?.total_trees || 0);

      // 5. تحديث البيانات
      setData({
        name: account?.contact_name || 'مستثمر',
        classification: classification,
        totalTrees: account?.total_trees || 0,
        currentStage: currentStage,
        latestStatus: latestRequest?.status || 'pending',
        contractNumber: latestRequest?.contract_number,
        operationalStatus: undefined,
        latestRequest: latestRequest ? {
          id: latestRequest.id,
          tree_type: latestRequest.tree_type,
          number_of_trees: latestRequest.number_of_trees,
          total_amount: latestRequest.total_amount,
          status: latestRequest.status,
          created_at: latestRequest.created_at
        } : undefined,
        loading: false,
        error: null
      });

    } catch (err: any) {
      console.error('❌ خطأ في جلب بيانات المسار:', err);
      setData(prev => ({
        ...prev,
        loading: false,
        error: err.message
      }));
    }
  };

  return data;
}

/**
 * تحديد المرحلة الحالية من حالة الطلب
 */
function getCurrentStageFromStatus(status: string): string {
  switch (status) {
    case 'pending':
    case 'payment_open':
    case 'receipt_uploaded':
    case 'receipt_under_review':
    case 'receipt_rejected':
      return 'حجز';

    case 'receipt_approved':
      return 'دفع';

    case 'contract_issued':
      return 'عقد';

    case 'transferred_to_operations':
      return 'تشغيل';

    default:
      return 'حجز';
  }
}

/**
 * تحديد التصنيف من عدد الأشجار
 */
function getClassificationFromTrees(trees: number): string {
  if (trees === 0) return 'مستثمر جديد';
  if (trees >= 1 && trees <= 9) return 'غرسة';
  if (trees >= 10 && trees <= 49) return 'حديقة';
  if (trees >= 50 && trees <= 199) return 'بستان';
  if (trees >= 200 && trees <= 499) return 'مزرعة صغيرة';
  if (trees >= 500 && trees <= 999) return 'مزرعة تشغيلية';
  return 'مزرعة استثمارية';
}
