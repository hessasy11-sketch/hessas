import { useState, useEffect } from 'react';
import { CheckCircle, Eye, XCircle, ArrowRight, Calendar, User, Phone } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface ApprovedPayment {
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

export default function ApprovedPaymentsView() {
  const [payments, setPayments] = useState<ApprovedPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadPayments();

    const channel = supabase
      .channel('approved-payments-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'b2f_sales_requests'
      }, () => {
        loadPayments();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadPayments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('b2f_sales_requests')
        .select('*')
        .eq('status', 'payment_verified')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error('Error loading approved payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTransferToOperations = async (paymentId: string) => {
    if (!confirm('هل تريد نقل هذا الطلب إلى مرحلة التشغيل؟')) return;

    try {
      setProcessingId(paymentId);
      const { error } = await supabase
        .from('b2f_sales_requests')
        .update({ status: 'transferred_to_operations' })
        .eq('id', paymentId);

      if (error) throw error;
      loadPayments();
    } catch (error) {
      console.error('Error transferring to operations:', error);
      alert('حدث خطأ أثناء النقل');
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
        <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black">إيصالات معتمدة</h3>
              <p className="text-sm text-emerald-50">
                {payments.length} إيصال معتمد جاهز للعقود
              </p>
            </div>
          </div>
        </div>

        {/* Payments List */}
        {payments.length === 0 ? (
          <div className="bg-white rounded-xl border-2 border-gray-200 p-12 text-center">
            <CheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-bold mb-2">لا توجد إيصالات معتمدة</p>
            <p className="text-sm text-gray-400">
              الإيصالات المعتمدة ستظهر هنا
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="bg-white rounded-xl border-2 border-emerald-200 p-4 hover:shadow-lg transition-all"
              >
                {/* Payment Info */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1">
                    <h4 className="font-black text-gray-900 mb-2">
                      {payment.opportunity_name}
                    </h4>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <div className="bg-emerald-50 px-2 py-1 rounded-md">
                          <span className="font-bold">{payment.tree_count} شجرة</span>
                        </div>
                        <div className="bg-blue-50 px-2 py-1 rounded-md">
                          <span className="font-bold">{payment.total_amount.toLocaleString('ar-SA')} ريال</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <User className="w-3 h-3" />
                        <span className="font-bold">المستثمر:</span>
                        <span>{payment.investor_name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <Phone className="w-3 h-3" />
                        <span>{payment.investor_phone}</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
                    <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      معتمد
                    </span>
                  </div>
                </div>

                {/* Date */}
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-3 pb-3 border-b border-gray-100">
                  <Calendar className="w-3 h-3" />
                  <span>
                    تاريخ الاعتماد: {new Date(payment.created_at).toLocaleDateString('ar-SA')}
                  </span>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-2">
                  {payment.payment_receipt_url && (
                    <button
                      onClick={() => setSelectedImage(payment.payment_receipt_url)}
                      className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold py-2.5 px-4 rounded-lg transition-all text-sm flex items-center justify-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      عرض الإيصال
                    </button>
                  )}

                  <button
                    onClick={() => handleTransferToOperations(payment.id)}
                    disabled={processingId === payment.id}
                    className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold py-2.5 px-4 rounded-lg transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50 col-span-2"
                  >
                    <ArrowRight className="w-4 h-4" />
                    نقل للتشغيل
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info */}
        <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-4">
          <h4 className="font-bold text-emerald-900 mb-2 text-sm flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            ملاحظات مهمة
          </h4>
          <ul className="space-y-2 text-xs text-emerald-700">
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 mt-0.5">•</span>
              <span>جميع الإيصالات هنا معتمدة ومدفوعة بالكامل</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 mt-0.5">•</span>
              <span>جاهزة للنقل إلى مرحلة التشغيل وإصدار العقود</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 mt-0.5">•</span>
              <span>قائمة التجميع لا تُلمَس وتعمل بشكل ممتاز</span>
            </li>
          </ul>
        </div>
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
