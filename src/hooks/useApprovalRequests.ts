import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface ApprovalRequest {
  id: string;
  request_type: string;
  farm_id: string;
  requested_by: string;
  request_data: any;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
  requester: {
    name_ar: string;
  } | null;
  farm: {
    name: string;
  } | null;
}

export function useApprovalRequests() {
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: queryError } = await supabase
        .from('fc_approval_requests')
        .select(`
          *,
          requester:platform_staff!requested_by(name_ar),
          farm:b2f_farms(name)
        `)
        .order('created_at', { ascending: false });

      if (queryError) throw queryError;

      setRequests(data || []);
    } catch (err: any) {
      console.error('Error loading approval requests:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const approveRequest = async (
    requestId: string,
    reviewedBy: string,
    reviewNotes?: string
  ) => {
    try {
      const { data, error } = await supabase.rpc('approve_request', {
        p_request_id: requestId,
        p_reviewed_by: reviewedBy,
        p_review_notes: reviewNotes
      });

      if (error) throw error;

      await loadRequests();
      return { success: true, data };
    } catch (err: any) {
      console.error('Error approving request:', err);
      return { success: false, error: err.message };
    }
  };

  const rejectRequest = async (
    requestId: string,
    reviewedBy: string,
    reviewNotes: string
  ) => {
    try {
      const { data, error } = await supabase.rpc('reject_request', {
        p_request_id: requestId,
        p_reviewed_by: reviewedBy,
        p_review_notes: reviewNotes
      });

      if (error) throw error;

      await loadRequests();
      return { success: true, data };
    } catch (err: any) {
      console.error('Error rejecting request:', err);
      return { success: false, error: err.message };
    }
  };

  const getRequestTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      publish_farm: 'نشر المزرعة',
      change_status: 'تغيير حالة التشغيل',
      change_manager: 'تغيير مدير المزرعة',
      large_expense: 'مصروف كبير',
      activate_facility: 'تفعيل منشأة'
    };
    return labels[type] || type;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'قيد الانتظار',
      approved: 'تمت الموافقة',
      rejected: 'مرفوض',
      cancelled: 'ملغي'
    };
    return labels[status] || status;
  };

  return {
    requests,
    loading,
    error,
    refetch: loadRequests,
    approveRequest,
    rejectRequest,
    getRequestTypeLabel,
    getStatusLabel
  };
}
