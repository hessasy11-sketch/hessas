import { useState, useEffect } from 'react';
import { FileText, Clock, CheckCircle, XCircle, AlertCircle, Calendar, TreePine, DollarSign } from 'lucide-react';
import { useInvestorAuth } from '../../contexts/InvestorAuthContext';
import { supabase } from '../../lib/supabase';

interface SalesRequest {
  id: string;
  tree_type: string;
  number_of_trees: number;
  total_amount: number;
  status: string;
  created_at: string;
  payment_receipt_url: string | null;
  investor_name: string;
  investor_phone: string;
}

export default function InvestorMyRequestsView() {
  const { account } = useInvestorAuth();
  const [requests, setRequests] = useState<SalesRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (account) {
      loadRequests();
    }
  }, [account]);

  const loadRequests = async () => {
    if (!account) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('b2f_sales_requests')
        .select('*')
        .eq('investor_phone', account.contact_phone)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error loading requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'collection_queue':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
            <Clock className="w-3 h-3" />
            في قائمة الحجز
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">
            <Clock className="w-3 h-3" />
            قيد المراجعة
          </span>
        );
      case 'payment_open':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
            <DollarSign className="w-3 h-3" />
            جاهز للدفع
          </span>
        );
      case 'receipt_uploaded':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">
            <DollarSign className="w-3 h-3" />
            تم رفع الإيصال
          </span>
        );
      case 'receipt_under_review':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
            <Clock className="w-3 h-3" />
            تحت المراجعة
          </span>
        );
      case 'receipt_approved':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">
            <CheckCircle className="w-3 h-3" />
            مدفوع ومعتمد
          </span>
        );
      case 'transferred_to_operations':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
            <TreePine className="w-3 h-3" />
            في مرحلة التشغيل
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">
            <XCircle className="w-3 h-3" />
            مرفوض
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 text-xs font-bold rounded-full">
            {status}
          </span>
        );
    }
  };

  if (!account) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">يجب تسجيل الدخول أولاً</p>
      </div>
    );
  }

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
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black">طلباتي</h3>
              <p className="text-sm text-emerald-50">
                {requests.length} طلب استثماري
              </p>
            </div>
          </div>
        </div>

        {/* Message for Collection Queue */}
        {requests.length > 0 && requests.some(r => r.status === 'collection_queue') && (
          <div className="bg-gradient-to-br from-blue-50 via-white to-emerald-50 rounded-2xl border-2 border-blue-200 shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-emerald-500 px-6 py-3">
              <h4 className="text-white font-black text-lg flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                مرحبًا بك، تم تسجيل حجزك بنجاح
              </h4>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-gray-700 text-base leading-relaxed font-semibold">
                طلبك الآن في قائمة الحجز، وسيتم إشعارك عند اكتمال العدد المطلوب لفتح السداد.
                لا تحتاج لاتخاذ أي إجراء في الوقت الحالي، فقط انتظر إشعار الإدارة لاحقًا.
              </p>

              <div className="bg-amber-50 border-r-4 border-amber-400 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800 leading-relaxed">
                    <span className="font-bold">ملاحظة:</span> تحديث حالة الطلب يتم من الإدارة عند اكتمال حجوزات المزرعة وفتح السداد.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
                <Clock className="w-4 h-4" />
                <span>يُرجى متابعة الإشعارات للحصول على آخر التحديثات</span>
              </div>
            </div>
          </div>
        )}

        {/* Message for Payment Open */}
        {requests.length > 0 && requests.some(r => r.status === 'payment_open') && (
          <div className="bg-gradient-to-br from-purple-50 via-white to-blue-50 rounded-2xl border-2 border-purple-200 shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500 to-blue-500 px-6 py-3">
              <h4 className="text-white font-black text-lg flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                طلبك جاهز للدفع
              </h4>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-gray-700 text-base leading-relaxed font-semibold">
                تم فتح السداد لطلبك! يمكنك الآن رفع إثبات السداد من تبويب المالية.
              </p>

              <div className="bg-purple-50 border-r-4 border-purple-400 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <DollarSign className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-purple-800 leading-relaxed">
                    <span className="font-bold">انتقل إلى تبويب "المالية"</span> لرفع إثبات السداد الخاص بك. ستجد هناك جميع الطلبات التي تحتاج إلى سداد.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Requests List */}
        {requests.length === 0 ? (
          <div className="bg-white rounded-xl border-2 border-gray-200 p-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-bold mb-2">لا توجد طلبات بعد</p>
            <p className="text-sm text-gray-400">
              يمكنك تقديم طلب جديد من صفحة الفرص الاستثمارية
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((request) => (
              <div
                key={request.id}
                className="bg-white rounded-xl border-2 border-gray-200 p-4 hover:shadow-lg transition-all"
              >
                {/* Request Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1">
                    <h4 className="font-black text-gray-900 mb-1">
                      {request.tree_type}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {request.number_of_trees} شجرة • {request.total_amount.toLocaleString('ar-SA')} ريال
                    </p>
                  </div>
                  {getStatusBadge(request.status)}
                </div>

                {/* Request Date */}
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Calendar className="w-3 h-3" />
                  <span>
                    تاريخ الطلب: {new Date(request.created_at).toLocaleDateString('ar-SA')}
                  </span>
                </div>

                {/* Info for payment_open status */}
                {request.status === 'payment_open' && (
                  <div className="mt-3 bg-purple-50 border border-purple-200 rounded-lg p-3">
                    <p className="text-xs text-purple-700 flex items-center gap-2">
                      <DollarSign className="w-3 h-3" />
                      لرفع إثبات السداد، انتقل إلى تبويب "المالية"
                    </p>
                  </div>
                )}

                {request.payment_receipt_url && (
                  <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                    <p className="text-xs text-emerald-700 flex items-center gap-2">
                      <CheckCircle className="w-3 h-3" />
                      تم رفع مستند الدفع - قيد المراجعة
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
