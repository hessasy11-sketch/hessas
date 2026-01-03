import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export type PaymentDocumentStatus = 'pending' | 'approved' | 'rejected' | 'needs_review';
export type AIDecision = 'auto_approved' | 'needs_review' | 'auto_rejected';

export interface PaymentDocument {
  id: string;
  sales_request_id: string;
  document_url: string;
  document_type: string;
  uploaded_at: string;
  status: PaymentDocumentStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  admin_notes: string | null;
  ai_analysis_result: any;
  ai_extracted_amount: number | null;
  ai_confidence_score: number | null;
  ai_decision: AIDecision | null;
  operation_type: string;
  expected_amount: number;
  investor_phone: string;
  investor_name: string;
  sales_request?: {
    opportunity_name: string;
    tree_count: number;
    total_amount: number;
  };
}

export function usePaymentDocuments(filterStatus?: AIDecision | 'all') {
  const [documents, setDocuments] = useState<PaymentDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDocuments();

    const channel = supabase
      .channel('payment_documents_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'b2f_payment_documents'
        },
        () => {
          loadDocuments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filterStatus]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('b2f_payment_documents')
        .select(`
          *,
          sales_request:b2f_sales_requests(
            opportunity_name,
            tree_count,
            total_amount
          )
        `)
        .order('uploaded_at', { ascending: false });

      if (filterStatus && filterStatus !== 'all') {
        query = query.eq('ai_decision', filterStatus);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setDocuments((data || []) as PaymentDocument[]);
    } catch (err) {
      console.error('Error loading payment documents:', err);
      setError(err instanceof Error ? err.message : 'خطأ في تحميل المستندات');
    } finally {
      setLoading(false);
    }
  };

  const approveDocument = async (documentId: string, adminNotes?: string) => {
    try {
      const { error: updateError } = await supabase
        .from('b2f_payment_documents')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          admin_notes: adminNotes || null
        })
        .eq('id', documentId);

      if (updateError) throw updateError;

      await loadDocuments();
      return true;
    } catch (err) {
      console.error('Error approving document:', err);
      throw err;
    }
  };

  const rejectDocument = async (documentId: string, adminNotes: string) => {
    try {
      const { error: updateError } = await supabase
        .from('b2f_payment_documents')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          admin_notes: adminNotes
        })
        .eq('id', documentId);

      if (updateError) throw updateError;

      await loadDocuments();
      return true;
    } catch (err) {
      console.error('Error rejecting document:', err);
      throw err;
    }
  };

  const reopenDocument = async (documentId: string) => {
    try {
      const { error: updateError } = await supabase
        .from('b2f_payment_documents')
        .update({
          status: 'needs_review',
          ai_decision: 'needs_review'
        })
        .eq('id', documentId);

      if (updateError) throw updateError;

      await loadDocuments();
      return true;
    } catch (err) {
      console.error('Error reopening document:', err);
      throw err;
    }
  };

  return {
    documents,
    loading,
    error,
    refresh: loadDocuments,
    approveDocument,
    rejectDocument,
    reopenDocument
  };
}
