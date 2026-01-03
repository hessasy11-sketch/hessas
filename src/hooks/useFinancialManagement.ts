import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface SectionWallet {
  id: string;
  section_name: string;
  total_collected_amount: number;
  total_target_amount: number;
  total_pending_amount: number;
  total_farms: number;
  total_opportunities: number;
  total_investors: number;
  total_receipts: number;
  total_contracts: number;
  overall_completion_percentage: number;
}

export interface FarmWallet {
  id: string;
  farm_id: string;
  farm_name: string;
  opportunity_id: string | null;
  opportunity_name: string | null;
  target_amount: number;
  collected_amount: number;
  pending_amount: number;
  completion_percentage: number;
  status: 'red' | 'green';
  wallet_phase: 'fundraising' | 'operating' | 'completed' | 'paused';
  total_investors: number;
  total_receipts: number;
}

export interface PaymentDocument {
  id: string;
  sales_request_id: string;
  investor_id: string | null;
  farm_id: string | null;
  opportunity_id: string | null;
  document_url: string;
  operation_type: string;
  amount_expected: number;
  amount_detected: number | null;
  payment_date_detected: string | null;
  bank_name: string | null;
  reference_number: string | null;
  ai_confidence: number | null;
  ai_decision: 'pending' | 'auto_approved' | 'needs_review' | 'auto_rejected';
  ai_analysis_notes: string | null;
  finance_status: 'pending_review' | 'approved_for_contract' | 'rejected_final';
  rejection_reason: string | null;
  current_status: string;
  created_at: string;
  updated_at: string;
  sales_request?: {
    investor_name: string;
    investor_phone: string;
    number_of_trees: number;
    tree_type: string;
    total_amount: number;
  };
  farm?: {
    name: string;
  };
  opportunity?: {
    title: string;
  };
}

export const REJECTION_REASONS = [
  'الإيصال غير واضح',
  'المبلغ غير مطابق',
  'التاريخ غير صحيح',
  'معلومات البنك ناقصة',
  'الإيصال مكرر',
  'الإيصال مزور أو معدل',
  'معلومات المستثمر غير مطابقة',
  'سبب آخر'
] as const;

export function useFinancialManagement() {
  const [sectionWallet, setSectionWallet] = useState<SectionWallet | null>(null);
  const [farmWallets, setFarmWallets] = useState<FarmWallet[]>([]);
  const [autoApprovedReceipts, setAutoApprovedReceipts] = useState<PaymentDocument[]>([]);
  const [autoRejectedReceipts, setAutoRejectedReceipts] = useState<PaymentDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedReceipts, setSelectedReceipts] = useState<Set<string>>(new Set());

  // جلب محفظة القسم
  const fetchSectionWallet = async () => {
    try {
      const { data, error } = await supabase
        .from('b2f_section_wallet')
        .select('*')
        .eq('section_name', 'استثمار أشجار المزارع')
        .maybeSingle();

      if (error) throw error;

      // إذا لم توجد بيانات، نستخدم قيم افتراضية
      if (!data) {
        console.warn('⚠️ لا توجد بيانات في b2f_section_wallet، استخدام قيم افتراضية');
        setSectionWallet({
          id: '',
          section_name: 'استثمار أشجار المزارع',
          total_collected_amount: 0,
          total_target_amount: 0,
          total_pending_amount: 0,
          total_farms: 0,
          total_opportunities: 0,
          total_investors: 0,
          total_receipts: 0,
          total_contracts: 0,
          overall_completion_percentage: 0
        });
      } else {
        setSectionWallet(data);
      }
    } catch (error) {
      console.error('Error fetching section wallet:', error);
    }
  };

  // جلب محافظ المزارع
  const fetchFarmWallets = async () => {
    try {
      const { data, error } = await supabase
        .from('b2f_farm_wallets')
        .select(`
          *,
          farm:b2f_farms(name),
          opportunity:b2f_opportunities(title)
        `)
        .order('completion_percentage', { ascending: false })
        .limit(10);

      if (error) throw error;

      const formattedData = data?.map(item => ({
        id: item.id,
        farm_id: item.farm_id,
        farm_name: item.farm?.name || 'غير محدد',
        opportunity_id: item.opportunity_id,
        opportunity_name: item.opportunity?.title || null,
        target_amount: parseFloat(item.target_amount),
        collected_amount: parseFloat(item.collected_amount),
        pending_amount: parseFloat(item.pending_amount),
        completion_percentage: parseFloat(item.completion_percentage),
        status: item.status,
        wallet_phase: item.wallet_phase,
        total_investors: item.total_investors,
        total_receipts: item.total_receipts
      })) || [];

      setFarmWallets(formattedData);
    } catch (error) {
      console.error('Error fetching farm wallets:', error);
    }
  };

  // جلب الطلبات المقبولة آلياً من الذكاء الصناعي
  const fetchAutoApprovedReceipts = async () => {
    try {
      const { data, error } = await supabase
        .from('b2f_sales_requests')
        .select(`
          *,
          farm:b2f_farms(name),
          opportunity:b2f_opportunities(title)
        `)
        .eq('status', 'auto_approved')
        .order('ai_verified_at', { ascending: false });

      if (error) throw error;

      const formattedData = data?.map(item => ({
        id: item.id,
        sales_request_id: item.id,
        investor_id: null,
        farm_id: item.farm_id,
        opportunity_id: item.opportunity_id,
        document_url: item.payment_receipt_url || '',
        operation_type: 'tree_investment',
        amount_expected: item.total_amount,
        amount_detected: item.expected_amount || item.total_amount,
        payment_date_detected: null,
        bank_name: null,
        reference_number: null,
        ai_confidence: item.ai_confidence_score || 0,
        ai_decision: 'auto_approved' as const,
        ai_analysis_notes: item.ai_verification_notes,
        finance_status: 'pending_review' as const,
        rejection_reason: null,
        current_status: item.status,
        created_at: item.created_at,
        updated_at: item.updated_at,
        sales_request: {
          investor_name: item.investor_name,
          investor_phone: item.investor_phone,
          number_of_trees: item.number_of_trees,
          tree_type: item.tree_type,
          total_amount: item.total_amount
        },
        farm: item.farm,
        opportunity: item.opportunity
      })) || [];

      setAutoApprovedReceipts(formattedData);
    } catch (error) {
      console.error('Error fetching auto approved requests:', error);
    }
  };

  // جلب الطلبات المرفوضة آلياً من الذكاء الصناعي
  const fetchAutoRejectedReceipts = async () => {
    try {
      const { data, error } = await supabase
        .from('b2f_sales_requests')
        .select(`
          *,
          farm:b2f_farms(name),
          opportunity:b2f_opportunities(title)
        `)
        .eq('status', 'auto_rejected')
        .order('ai_verified_at', { ascending: false });

      if (error) throw error;

      const formattedData = data?.map(item => ({
        id: item.id,
        sales_request_id: item.id,
        investor_id: null,
        farm_id: item.farm_id,
        opportunity_id: item.opportunity_id,
        document_url: item.payment_receipt_url || '',
        operation_type: 'tree_investment',
        amount_expected: item.total_amount,
        amount_detected: item.expected_amount || item.total_amount,
        payment_date_detected: null,
        bank_name: null,
        reference_number: null,
        ai_confidence: item.ai_confidence_score || 0,
        ai_decision: 'auto_rejected' as const,
        ai_analysis_notes: item.ai_verification_notes,
        finance_status: 'pending_review' as const,
        rejection_reason: item.rejection_reason,
        current_status: item.status,
        created_at: item.created_at,
        updated_at: item.updated_at,
        sales_request: {
          investor_name: item.investor_name,
          investor_phone: item.investor_phone,
          number_of_trees: item.number_of_trees,
          tree_type: item.tree_type,
          total_amount: item.total_amount
        },
        farm: item.farm,
        opportunity: item.opportunity
      })) || [];

      setAutoRejectedReceipts(formattedData);
    } catch (error) {
      console.error('Error fetching auto rejected requests:', error);
    }
  };

  // تحديث جميع البيانات
  const refreshData = async () => {
    setLoading(true);
    await Promise.all([
      fetchSectionWallet(),
      fetchFarmWallets(),
      fetchAutoApprovedReceipts(),
      fetchAutoRejectedReceipts()
    ]);
    setLoading(false);
  };

  // اعتماد إيصال واحد - استدعاء دالة SQL مباشرة
  const approveReceipt = async (receiptId: string) => {
    try {
      console.log('🔄 بدء اعتماد الإيصال وإصدار العقد:', receiptId);

      const { data, error } = await supabase.rpc('manually_approve_receipt', {
        request_id: receiptId
      });

      if (error) {
        console.error('❌ خطأ في اعتماد الإيصال:', error);
        throw error;
      }

      console.log('✅ تم اعتماد الإيصال وإصدار العقد:', data);

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to approve receipt');
      }

      await refreshData();
      return { success: true, contract_id: data.contract_id };
    } catch (error) {
      console.error('❌ Error approving receipt:', error);
      return { success: false, error };
    }
  };

  // اعتماد إيصالات متعددة - استدعاء الدالة لكل إيصال
  const approveMultipleReceipts = async (receiptIds: string[]) => {
    try {
      console.log('🔄 بدء اعتماد إيصالات متعددة:', receiptIds.length);

      const results = await Promise.all(
        receiptIds.map(id => supabase.rpc('manually_approve_receipt', { request_id: id }))
      );

      const failedCount = results.filter(r => r.error || !r.data?.success).length;

      if (failedCount > 0) {
        console.warn(`⚠️ فشل اعتماد ${failedCount} من ${receiptIds.length} إيصال`);
      }

      console.log(`✅ تم اعتماد ${receiptIds.length - failedCount} إيصال بنجاح`);
      setSelectedReceipts(new Set());
      await refreshData();
      return {
        success: failedCount === 0,
        approved: receiptIds.length - failedCount,
        failed: failedCount
      };
    } catch (error) {
      console.error('❌ Error approving multiple receipts:', error);
      return { success: false, error };
    }
  };

  // رفض إيصال نهائيًا
  const rejectReceipt = async (receiptId: string, reason: string) => {
    try {
      const { error } = await supabase
        .from('b2f_sales_requests')
        .update({
          status: 'rejected',
          rejection_reason: reason,
          finance_reviewed: true,
          finance_reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', receiptId);

      if (error) throw error;

      await refreshData();
      return { success: true };
    } catch (error) {
      console.error('Error rejecting receipt:', error);
      return { success: false, error };
    }
  };

  // إرجاع إيصال إلى "مقبولة آليًا"
  const returnToAutoApproved = async (receiptId: string) => {
    try {
      const { error } = await supabase
        .from('b2f_sales_requests')
        .update({
          status: 'auto_approved',
          rejection_reason: null,
          finance_reviewed: false,
          finance_reviewed_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', receiptId);

      if (error) throw error;

      await refreshData();
      return { success: true };
    } catch (error) {
      console.error('Error returning receipt to auto approved:', error);
      return { success: false, error };
    }
  };

  // تبديل تحديد إيصال
  const toggleReceiptSelection = (receiptId: string) => {
    setSelectedReceipts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(receiptId)) {
        newSet.delete(receiptId);
      } else {
        newSet.add(receiptId);
      }
      return newSet;
    });
  };

  // تحديد الكل
  const selectAll = () => {
    setSelectedReceipts(new Set(autoApprovedReceipts.map(r => r.id)));
  };

  // إلغاء تحديد الكل
  const clearSelection = () => {
    setSelectedReceipts(new Set());
  };

  useEffect(() => {
    refreshData();
  }, []);

  return {
    sectionWallet,
    farmWallets,
    autoApprovedReceipts,
    autoRejectedReceipts,
    loading,
    selectedReceipts,
    approveReceipt,
    approveMultipleReceipts,
    rejectReceipt,
    returnToAutoApproved,
    toggleReceiptSelection,
    selectAll,
    clearSelection,
    refreshData
  };
}
