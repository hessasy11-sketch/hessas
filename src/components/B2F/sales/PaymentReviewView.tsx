import { useState, useEffect } from 'react';
import { FileText, CheckCircle, XCircle, Eye, Clock, AlertCircle, Calendar } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface PaymentRequest {
  id: string;
  opportunity_name: string;
  tree_count: number;
  total_amount: number;
  investor_name: string;
  investor_phone: string;
  payment_receipt_url: string | null;
  status: string;
  created_at: string;
}

export default function PaymentReviewView() {
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadRequests();

    const channel = supabase
      .channel('payment-review-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'b2f_sales_requests'
      }, () => {
        loadRequests();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('b2f_sales_requests')
        .select('*')
        .not('payment_receipt_url', 'is', null)
        .in('status', ['approved_pending_payment'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error loading payment requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    if (!confirm('هل أنت متأكد من اعتماد هذا المستند؟')) return;

    try {
      setProcessingId(requestId);
      const { error } = await supabase
        .from('b2f_sales_requests')
        .update({ status: 'payment_verified' })
        .eq('id', requestId);

      if (error) throw error;
      loadRequests();
    } catch (error) {
      console.error('Error approving payment:', error);
      alert('حدث خطأ أثناء الاعتماد');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    const reason = prompt('سبب الرفض:');
    if (!reason) return;

    try {
      setProcessingId(requestId);
      const { error } = await supabase
        .from('b2f_sales_requests')
        .update({
          status: 'approved',
          payment_receipt_url: null
        })
        .eq('id', requestId);

      if (error) throw error;
      loadRequests();
    } catch (error) {
      console.error('Error rejecting payment:', error);
      alert('حدث خطأ أثناء الرفض');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black">إيصالات تحت المراجعة</h3>
              <p className="text-sm text-amber-50">
                {requests.length} إيصال ينتظر المراجعة
              </p>
            </div>
          </div>
        </div>

        {/* Requests List */}
        {requests.length === 0 ? (
          <div className="bg-white rounded-xl border-2 border-gray-200 p-12 text-center">
            <CheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-bold mb-2">لا توجد إيصالات للمراجعة</p>
            <p className="text-sm text-gray-400">
              جميع المستندات تمت مراجعتها
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((request) => (
              <div
                key={request.id}
                className="bg-white rounded-xl border-2 border-amber-200 p-4 hover:shadow-lg transition-all"
              >
                {/* Request Info */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1">
                    <h4 className="font-black text-gray-900 mb-1">
                      {request.opportunity_name}
                    </h4>
                    <div className="space-y-1 text-xs text-gray-600">
                      <p>
                        {request.tree_count} شجرة • {request.total_amount.toLocaleString('ar-SA')} ريال
                      </p>
                      <p className="flex items-center gap-1">
                        <span className="font-bold">المستثمر:</span> {request.investor_name}
                      </p>
                      <p>{request.investor_phone}</p>
                    </div>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg">
                    <span className="text-xs font-bold text-amber-700 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      تحت المراجعة
                    </span>
                  </div>
                </div>

                {/* Date */}
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-3 pb-3 border-b border-gray-100">
                  <Calendar className="w-3 h-3" />
                  <span>
                    تاريخ الرفع: {new Date(request.created_at).toLocaleDateString('ar-SA')}
                  </span>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setSelectedImage(request.payment_receipt_url)}
                    className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold py-2 px-3 rounded-lg transition-all text-xs flex items-center justify-center gap-1"
                  >
                    <Eye className="w-3 h-3" />
                    عرض
                  </button>

                  <button
                    onClick={() => handleApprove(request.id)}
                    disabled={processingId === request.id}
                    className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold py-2 px-3 rounded-lg transition-all text-xs flex items-center justify-center gap-1 disabled:opacity-50"
                  >
                    <CheckCircle className="w-3 h-3" />
                    اعتماد
                  </button>

                  <button
                    onClick={() => handleReject(request.id)}
                    disabled={processingId === request.id}
                    className="bg-red-50 hover:bg-red-100 text-red-700 font-bold py-2 px-3 rounded-lg transition-all text-xs flex items-center justify-center gap-1 disabled:opacity-50"
                  >
                    <XCircle className="w-3 h-3" />
                    رفض
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl w-full">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-12 right-0 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-all"
            >
              <XCircle className="w-6 h-6" />
            </button>
            <img
              src={selectedImage}
              alt="Payment Receipt"
              className="w-full h-auto rounded-xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </>
  );
}
