import { useState, useEffect } from 'react';
import { Wallet, Eye, Clock, CheckCircle, XCircle, AlertTriangle, FileText, Calendar, User, Phone, Package, RefreshCw, Lock } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface PaymentRequest {
  id: string;
  investor_name: string;
  investor_phone: string;
  number_of_trees: number;
  tree_type: string;
  total_amount: number;
  created_at: string;
  payment_opened_at: string | null;
  farm_id: string;
  farm_name: string;
  payment_document?: {
    id: string;
    finance_status: string;
    uploaded_at: string;
    amount_detected: number | null;
    receipt_image_url: string | null;
  } | null;
}

export default function PaymentOpenView() {
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    loadPaymentOpenRequests();

    // Realtime subscription
    const channel = supabase
      .channel('payment-open-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'b2f_sales_requests'
      }, () => {
        loadPaymentOpenRequests();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'b2f_payment_documents'
      }, () => {
        loadPaymentOpenRequests();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadPaymentOpenRequests = async () => {
    try {
      const { data: requests, error } = await supabase
        .from('b2f_sales_requests')
        .select(`
          id,
          investor_name,
          investor_phone,
          number_of_trees,
          tree_type,
          total_amount,
          created_at,
          payment_opened_at,
          farm_id,
          b2f_farms (
            id,
            name
          )
        `)
        .eq('status', 'payment_open')
        .order('payment_opened_at', { ascending: false });

      if (error) throw error;

      // جلب مستندات الدفع لكل طلب
      const requestsWithPayments = await Promise.all(
        (requests || []).map(async (req: any) => {
          const { data: paymentDoc } = await supabase
            .from('b2f_payment_documents')
            .select('id, finance_status, uploaded_at, amount_detected, receipt_image_url')
            .eq('request_id', req.id)
            .order('uploaded_at', { ascending: false })
            .limit(1)
            .single();

          return {
            ...req,
            farm_name: req.b2f_farms?.name || 'مزرعة غير محددة',
            payment_document: paymentDoc || null
          };
        })
      );

      setRequests(requestsWithPayments);
    } catch (error) {
      console.error('Error loading payment open requests:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPaymentOpenRequests();
  };

  const handleClosePayment = async (requestId: string, investorName: string) => {
    if (!confirm(`هل تريد إغلاق الدفع لطلب المستثمر "${investorName}"؟\n\nسيتم إرجاع الطلب إلى قائمة التجميع.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('b2f_sales_requests')
        .update({
          status: 'collection_queue',
          payment_opened_at: null
        })
        .eq('id', requestId);

      if (error) throw error;

      alert('تم إغلاق الدفع بنجاح');
      await loadPaymentOpenRequests();
    } catch (error) {
      console.error('Error closing payment:', error);
      alert('حدث خطأ أثناء إغلاق الدفع');
    }
  };

  const getPaymentStatusBadge = (request: PaymentRequest) => {
    if (!request.payment_document) {
      return {
        text: 'لم يتم رفع إيصال حتى الآن',
        color: 'bg-gray-100 text-gray-700',
        icon: <AlertTriangle className="w-4 h-4" />
      };
    }

    const status = request.payment_document.finance_status;

    switch (status) {
      case 'pending_review':
        return {
          text: 'إيصال مرفوع - قيد المراجعة في المالية',
          color: 'bg-amber-100 text-amber-700',
          icon: <Clock className="w-4 h-4" />
        };
      case 'auto_approved':
        return {
          text: 'تم القبول آلياً - في انتظار المراجعة اليدوية',
          color: 'bg-blue-100 text-blue-700',
          icon: <CheckCircle className="w-4 h-4" />
        };
      case 'manually_approved':
        return {
          text: 'السداد معتمد - جاهز للعقود',
          color: 'bg-emerald-100 text-emerald-700',
          icon: <CheckCircle className="w-4 h-4" />
        };
      case 'approved_for_contract':
        return {
          text: 'معتمد نهائياً - جاهز للعقود',
          color: 'bg-emerald-100 text-emerald-700',
          icon: <CheckCircle className="w-4 h-4" />
        };
      case 'auto_rejected':
        return {
          text: 'مرفوض آلياً - يحتاج مراجعة',
          color: 'bg-rose-100 text-rose-700',
          icon: <XCircle className="w-4 h-4" />
        };
      case 'rejected_final':
        return {
          text: 'مرفوض نهائياً',
          color: 'bg-red-100 text-red-700',
          icon: <XCircle className="w-4 h-4" />
        };
      default:
        return {
          text: status,
          color: 'bg-gray-100 text-gray-700',
          icon: <FileText className="w-4 h-4" />
        };
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-gray-600">جاري التحميل...</p>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-12">
        <Wallet className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 text-lg font-semibold">لا توجد طلبات مفتوح لها الدفع</p>
        <p className="text-gray-400 text-sm mt-2">ستظهر هنا الطلبات التي تم فتح الدفع لها</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* زر التحديث */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600">
          <span className="font-bold text-gray-800">{requests.length}</span> طلب مفتوح للدفع
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className={`
            flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-200 rounded-lg
            font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all
            ${refreshing ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'جاري التحديث...' : 'تحديث'}
        </button>
      </div>

      {/* قائمة الطلبات */}
      <div className="space-y-4">
        {requests.map((request) => {
          const statusBadge = getPaymentStatusBadge(request);

          return (
            <div
              key={request.id}
              className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden hover:border-blue-300 hover:shadow-lg transition-all"
            >
              {/* رأس البطاقة */}
              <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 border-b border-gray-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <User className="w-5 h-5 text-blue-600" />
                      <h3 className="text-lg font-bold text-gray-800">{request.investor_name}</h3>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="w-4 h-4" />
                      <span>{request.investor_phone}</span>
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="text-sm text-gray-500 mb-1">رقم الطلب</div>
                    <div className="text-xs font-mono bg-white px-3 py-1 rounded border border-gray-200">
                      {request.id.slice(0, 8)}
                    </div>
                  </div>
                </div>
              </div>

              {/* محتوى البطاقة */}
              <div className="p-4">
                {/* معلومات الطلب */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">المزرعة</div>
                    <div className="font-bold text-gray-800">{request.farm_name}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">عدد الأشجار</div>
                    <div className="font-bold text-gray-800">{request.number_of_trees}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">النوع</div>
                    <div className="font-bold text-gray-800">{request.tree_type}</div>
                  </div>
                  <div className="bg-emerald-50 rounded-lg p-3">
                    <div className="text-xs text-emerald-600 mb-1">المبلغ الإجمالي</div>
                    <div className="font-bold text-emerald-700">{request.total_amount.toLocaleString()} ريال</div>
                  </div>
                </div>

                {/* حالة السداد */}
                <div className="mb-4">
                  <div className="text-sm font-bold text-gray-700 mb-2">حالة السداد</div>
                  <div className={`flex items-center gap-2 px-4 py-3 rounded-lg ${statusBadge.color} font-bold`}>
                    {statusBadge.icon}
                    <span>{statusBadge.text}</span>
                  </div>
                </div>

                {/* معلومات الإيصال */}
                {request.payment_document && (
                  <div className="mb-4 bg-gray-50 rounded-lg p-4">
                    <div className="text-sm font-bold text-gray-700 mb-2">تفاصيل الإيصال</div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-500">تاريخ الرفع:</span>
                        <span className="font-bold text-gray-800 mr-2">
                          {new Date(request.payment_document.uploaded_at).toLocaleDateString('ar-SA')}
                        </span>
                      </div>
                      {request.payment_document.amount_detected && (
                        <div>
                          <span className="text-gray-500">المبلغ المكتشف:</span>
                          <span className="font-bold text-gray-800 mr-2">
                            {request.payment_document.amount_detected.toLocaleString()} ريال
                          </span>
                        </div>
                      )}
                    </div>
                    {request.payment_document.receipt_image_url && (
                      <button
                        onClick={() => setSelectedImage(request.payment_document!.receipt_image_url!)}
                        className="mt-3 flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all"
                      >
                        <Eye className="w-4 h-4" />
                        عرض الإيصال
                      </button>
                    )}
                  </div>
                )}

                {/* التواريخ */}
                <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-200">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>تاريخ الحجز: {new Date(request.created_at).toLocaleDateString('ar-SA')}</span>
                  </div>
                  {request.payment_opened_at && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>فُتح الدفع: {new Date(request.payment_opened_at).toLocaleDateString('ar-SA')}</span>
                    </div>
                  )}
                </div>

                {/* زر إغلاق الدفع */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handleClosePayment(request.id, request.investor_name)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg font-bold hover:bg-red-100 transition-all"
                  >
                    <Lock className="w-4 h-4" />
                    إغلاق الدفع (إرجاع لقائمة التجميع)
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* نافذة عرض الصورة */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl w-full">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-12 left-0 text-white hover:text-gray-300 font-bold"
            >
              إغلاق ✕
            </button>
            <img
              src={selectedImage}
              alt="إيصال الدفع"
              className="w-full h-auto rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
