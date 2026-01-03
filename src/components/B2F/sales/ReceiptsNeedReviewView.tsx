import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Eye, MessageSquare } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useSystemMessages } from '../../../hooks/useSystemMessages';
import SystemMessageBanner from '../SystemMessageBanner';

interface ReceiptWithRequest {
  id: string;
  receipt_url: string;
  ai_classification: string;
  ai_confidence_score: number | null;
  ai_analysis_result: any;
  uploaded_at: string;
  sales_request: {
    id: string;
    investor_name: string;
    investor_phone: string;
    total_amount: number;
    number_of_trees: number;
    tree_type: string;
  };
}

export default function ReceiptsNeedReviewView() {
  const [receipts, setReceipts] = useState<ReceiptWithRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectionNote, setRejectionNote] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const { getMessage } = useSystemMessages('sales');

  useEffect(() => {
    loadReceipts();
  }, []);

  const loadReceipts = async () => {
    try {
      const { data, error } = await supabase
        .from('b2f_payment_receipts')
        .select(`
          id,
          receipt_url,
          ai_classification,
          ai_confidence_score,
          ai_analysis_result,
          uploaded_at,
          sales_request_id,
          b2f_sales_requests!inner (
            id,
            investor_name,
            investor_phone,
            total_amount,
            number_of_trees,
            tree_type,
            status
          )
        `)
        .eq('staff_decision', 'pending')
        .in('b2f_sales_requests.status', ['receipt_needs_revision', 'receipt_under_review'])
        .order('uploaded_at', { ascending: false });

      if (error) throw error;

      const formatted: ReceiptWithRequest[] = data?.map((item: any) => ({
        id: item.id,
        receipt_url: item.receipt_url,
        ai_classification: item.ai_classification || 'pending_analysis',
        ai_confidence_score: item.ai_confidence_score,
        ai_analysis_result: item.ai_analysis_result,
        uploaded_at: item.uploaded_at,
        sales_request: {
          id: item.b2f_sales_requests.id,
          investor_name: item.b2f_sales_requests.investor_name,
          investor_phone: item.b2f_sales_requests.investor_phone,
          total_amount: item.b2f_sales_requests.total_amount,
          number_of_trees: item.b2f_sales_requests.number_of_trees,
          tree_type: item.b2f_sales_requests.tree_type
        }
      })) || [];

      setReceipts(formatted);
    } catch (error) {
      console.error('Error loading receipts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (receiptId: string) => {
    if (!confirm('هل أنت متأكد من اعتماد هذا الإيصال؟')) return;

    try {
      const { error } = await supabase.rpc('approve_receipt', {
        receipt_uuid: receiptId,
        staff_comment_text: 'تم الاعتماد'
      });

      if (error) throw error;

      alert('تم اعتماد الإيصال بنجاح');
      loadReceipts();
    } catch (error) {
      console.error('Error approving receipt:', error);
      alert('حدث خطأ أثناء اعتماد الإيصال');
    }
  };

  const handleReject = async () => {
    if (!selectedReceipt || !rejectionNote.trim()) {
      alert('يرجى كتابة سبب الرفض');
      return;
    }

    try {
      const { error } = await supabase.rpc('reject_receipt_with_note', {
        receipt_uuid: selectedReceipt,
        rejection_note: rejectionNote
      });

      if (error) throw error;

      alert('تم رفض الإيصال وإعادته للعميل');
      setShowRejectModal(false);
      setRejectionNote('');
      setSelectedReceipt(null);
      loadReceipts();
    } catch (error) {
      console.error('Error rejecting receipt:', error);
      alert('حدث خطأ أثناء رفض الإيصال');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-gray-600">جاري التحميل...</p>
      </div>
    );
  }

  if (receipts.length === 0) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 text-lg font-semibold">لا توجد إيصالات تحتاج مراجعة</p>
        <p className="text-gray-400 text-sm mt-2">ستظهر هنا الإيصالات المشتبه بها من الذكاء الصناعي</p>
      </div>
    );
  }

  const needsReviewMsg = getMessage('sales', 'receipt_needs_review');

  return (
    <div className="space-y-4">
      {/* رسالة الإيصالات التي تحتاج مراجعة */}
      {needsReviewMsg && (
        <SystemMessageBanner
          message={needsReviewMsg.message_text}
          icon={needsReviewMsg.icon}
          type="warning"
        />
      )}

      {receipts.map((receipt) => (
        <div key={receipt.id} className="bg-white rounded-xl border-2 border-amber-200 overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-4 text-white">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6" />
              <div>
                <h3 className="font-bold">{receipt.sales_request.investor_name}</h3>
                <p className="text-sm text-white/80">{receipt.sales_request.investor_phone}</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <h4 className="text-sm text-gray-500 mb-3">تفاصيل الطلب</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">عدد الأشجار:</span>
                    <span className="font-bold text-gray-800">{receipt.sales_request.number_of_trees}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">النوع:</span>
                    <span className="font-bold text-gray-800">{receipt.sales_request.tree_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">المبلغ المطلوب:</span>
                    <span className="font-bold text-emerald-600">{receipt.sales_request.total_amount.toLocaleString()} ريال</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm text-gray-500 mb-3">تحليل الذكاء الصناعي</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">التصنيف:</span>
                    <span className={`font-bold ${
                      receipt.ai_classification === 'needs_review' ? 'text-amber-600' : 'text-gray-600'
                    }`}>
                      {receipt.ai_classification === 'needs_review' ? 'يحتاج مراجعة' : 'قيد التحليل'}
                    </span>
                  </div>
                  {receipt.ai_confidence_score && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">نسبة الثقة:</span>
                      <span className="font-bold text-gray-800">{(receipt.ai_confidence_score * 100).toFixed(0)}%</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* معاينة الإيصال */}
            <div className="mb-6">
              <h4 className="text-sm text-gray-500 mb-3">معاينة الإيصال</h4>
              <div className="bg-gray-100 rounded-lg p-4">
                <a
                  href={receipt.receipt_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 text-blue-600 hover:text-blue-700 font-bold"
                >
                  <Eye className="w-5 h-5" />
                  فتح الإيصال في نافذة جديدة
                </a>
              </div>
            </div>

            {/* أزرار الإجراءات */}
            <div className="flex gap-3">
              <button
                onClick={() => handleApprove(receipt.id)}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg font-bold hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                معتمد
              </button>
              <button
                onClick={() => {
                  setSelectedReceipt(receipt.id);
                  setShowRejectModal(true);
                }}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-lg font-bold hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <XCircle className="w-5 h-5" />
                إعادة مع ملاحظة
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* Modal الرفض مع ملاحظة */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" dir="rtl">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <MessageSquare className="w-6 h-6 text-red-500" />
              <h3 className="text-xl font-bold">إعادة الإيصال مع ملاحظة</h3>
            </div>

            <textarea
              value={rejectionNote}
              onChange={(e) => setRejectionNote(e.target.value)}
              placeholder="اكتب الملاحظة للعميل (مثال: المبلغ غير مطابق، الإيصال غير واضح، إلخ...)"
              className="w-full p-3 border-2 border-gray-200 rounded-lg resize-none h-32 mb-4"
            />

            <div className="flex gap-3">
              <button
                onClick={handleReject}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg font-bold hover:bg-red-600"
              >
                إرسال الملاحظة وإعادة الإيصال
              </button>
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionNote('');
                  setSelectedReceipt(null);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-300"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}