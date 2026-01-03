import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Eye, Loader2, Search, FileText, DollarSign, User, X, AlertCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface PaymentDocument {
  payment_document_id: string;
  request_id: string;
  receipt_url: string;
  finance_status: string;
  amount_expected: number;
  amount_detected: number | null;
  ai_confidence: number | null;
  ai_decision: string | null;
  ai_analysis_notes: string | null;
  uploaded_at: string;
  updated_at: string;
  investor_name: string;
  investor_phone: string;
  investor_email: string | null;
  number_of_trees: number;
  tree_type: string;
  total_amount: number;
  request_status: string;
  farm_name: string | null;
  farm_id: string;
  opportunity_title: string | null;
}

export default function PaymentsCollectionTab() {
  const [payments, setPayments] = useState<PaymentDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [receiptError, setReceiptError] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('v_b2f_payments_under_review')
        .select('*')
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (paymentDocId: string) => {
    if (!confirm('هل أنت متأكد من اعتماد هذا السداد؟')) return;

    try {
      setProcessing(paymentDocId);
      const { data, error } = await supabase
        .rpc('approve_payment_document', {
          p_document_id: paymentDocId,
          p_approved_by: 'Admin'
        });

      if (error) throw error;

      if (data && data.success) {
        alert('تم اعتماد السداد بنجاح!');
        fetchPayments();
      }
    } catch (error) {
      console.error('Error approving payment:', error);
      alert('حدث خطأ في اعتماد السداد');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async () => {
    if (!selectedPayment) return;
    if (!rejectionReason.trim()) {
      alert('يرجى إدخال سبب الرفض');
      return;
    }

    try {
      setProcessing(selectedPayment);
      const { data, error } = await supabase
        .rpc('reject_payment_document', {
          p_document_id: selectedPayment,
          p_rejection_reason: rejectionReason,
          p_rejected_by: 'Admin'
        });

      if (error) throw error;

      if (data && data.success) {
        alert('تم رفض السداد');
        setShowRejectionModal(false);
        setRejectionReason('');
        setSelectedPayment(null);
        fetchPayments();
      }
    } catch (error) {
      console.error('Error rejecting payment:', error);
      alert('حدث خطأ في رفض السداد');
    } finally {
      setProcessing(null);
    }
  };

  const openRejectionModal = (paymentDocId: string) => {
    setSelectedPayment(paymentDocId);
    setShowRejectionModal(true);
  };

  const filteredPayments = payments.filter(p =>
    p.investor_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.investor_phone.includes(searchQuery)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="bg-white rounded-xl shadow-lg p-4">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="ابحث بالاسم أو رقم الهاتف..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">قيد المراجعة</p>
              <p className="text-2xl font-black text-blue-600">{payments.length}</p>
            </div>
            <FileText className="w-10 h-10 text-blue-500 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">إجمالي المبالغ</p>
              <p className="text-2xl font-black text-green-600">
                {payments.reduce((sum, p) => sum + parseFloat(p.total_amount.toString()), 0).toLocaleString('ar-SA')} ريال
              </p>
            </div>
            <DollarSign className="w-10 h-10 text-green-500 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">مستثمرين</p>
              <p className="text-2xl font-black text-purple-600">
                {new Set(payments.map(p => p.investor_phone)).size}
              </p>
            </div>
            <User className="w-10 h-10 text-purple-500 opacity-20" />
          </div>
        </div>
      </div>

      {/* Payments List */}
      <div className="space-y-4">
        {filteredPayments.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-bold">لا توجد مدفوعات قيد المراجعة</p>
          </div>
        ) : (
          filteredPayments.map((payment) => (
            <div key={payment.payment_document_id} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* المعلومات الأساسية */}
                <div className="lg:col-span-2 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-black text-gray-900">{payment.investor_name}</h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                        <span>{payment.investor_phone}</span>
                        {payment.investor_email && <span>{payment.investor_email}</span>}
                      </div>
                    </div>
                    <div className="text-left">
                      <div className="text-2xl font-black text-green-600">
                        {parseFloat(payment.total_amount.toString()).toLocaleString('ar-SA')} ريال
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(payment.uploaded_at).toLocaleDateString('ar-SA')}
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3 text-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-gray-600">المزرعة: </span>
                        <span className="font-bold">{payment.farm_name || 'غير محدد'}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">عدد الأشجار: </span>
                        <span className="font-bold">{payment.number_of_trees}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-600">نوع الشجرة: </span>
                        <span className="font-bold">{payment.tree_type}</span>
                      </div>
                    </div>
                  </div>

                  {payment.ai_confidence && payment.ai_confidence > 0 && (
                    <div className="bg-blue-50 rounded-lg p-3 text-sm">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-blue-700 font-bold">تحليل الذكاء الصناعي</span>
                        <span className="text-blue-900 font-black">{(payment.ai_confidence * 100).toFixed(1)}%</span>
                      </div>
                      {payment.ai_analysis_notes && (
                        <p className="text-blue-600 text-xs">{payment.ai_analysis_notes}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* الإجراءات */}
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      setSelectedReceipt(payment.receipt_url);
                      setReceiptLoading(true);
                      setReceiptError(false);
                    }}
                    className="w-full bg-blue-500 text-white font-bold py-2.5 px-4 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    عرض الإيصال
                  </button>

                  <button
                    onClick={() => handleApprove(payment.payment_document_id)}
                    disabled={processing === payment.payment_document_id}
                    className="w-full bg-green-500 text-white font-bold py-2.5 px-4 rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {processing === payment.payment_document_id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    اعتماد السداد
                  </button>

                  <button
                    onClick={() => openRejectionModal(payment.payment_document_id)}
                    disabled={processing === payment.payment_document_id}
                    className="w-full bg-red-500 text-white font-bold py-2.5 px-4 rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                    رفض السداد
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Receipt Modal */}
      {selectedReceipt && (
        <>
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            onClick={() => {
              setSelectedReceipt(null);
              setReceiptLoading(false);
              setReceiptError(false);
            }}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => {
            setSelectedReceipt(null);
            setReceiptLoading(false);
            setReceiptError(false);
          }}>
            <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[95vh] overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-5 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-6 h-6" />
                    <h3 className="font-black text-xl">عرض الإيصال</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={selectedReceipt}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-white/20 hover:bg-white/30 rounded-lg px-4 py-2 text-sm font-bold transition-colors flex items-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      فتح في تبويب جديد
                    </a>
                    <button
                      onClick={() => {
                        setSelectedReceipt(null);
                        setReceiptLoading(false);
                        setReceiptError(false);
                      }}
                      className="bg-white/20 hover:bg-white/30 rounded-lg p-2 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="relative overflow-auto max-h-[calc(95vh-80px)] bg-gray-50 p-4">
                {selectedReceipt.toLowerCase().endsWith('.pdf') ? (
                  <div className="bg-white rounded-xl overflow-hidden shadow-lg">
                    {receiptLoading && (
                      <div className="absolute inset-0 bg-white/90 flex items-center justify-center z-10">
                        <div className="text-center">
                          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-3" />
                          <p className="text-gray-600 font-bold">جاري تحميل الإيصال...</p>
                        </div>
                      </div>
                    )}
                    <iframe
                      src={selectedReceipt}
                      className="w-full h-[75vh] border-0"
                      title="Receipt PDF"
                      onLoad={() => setReceiptLoading(false)}
                      onError={() => {
                        setReceiptLoading(false);
                        setReceiptError(true);
                      }}
                    />
                    {receiptError && (
                      <div className="absolute inset-0 bg-white flex items-center justify-center">
                        <div className="text-center px-4">
                          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                          <p className="text-red-600 font-bold text-lg mb-2">فشل تحميل الإيصال</p>
                          <p className="text-gray-600 text-sm mb-4">قد يكون الملف تالفاً أو غير متوفر</p>
                          <a
                            href={selectedReceipt}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-bold"
                          >
                            <Eye className="w-4 h-4" />
                            حاول فتحه في تبويب جديد
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-white rounded-xl p-4 shadow-lg">
                    {receiptLoading && (
                      <div className="absolute inset-0 bg-white/90 flex items-center justify-center z-10">
                        <div className="text-center">
                          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-3" />
                          <p className="text-gray-600 font-bold">جاري تحميل الصورة...</p>
                        </div>
                      </div>
                    )}
                    <img
                      src={selectedReceipt}
                      alt="Receipt"
                      className="w-full h-auto rounded-lg"
                      onLoad={() => setReceiptLoading(false)}
                      onError={() => {
                        setReceiptLoading(false);
                        setReceiptError(true);
                      }}
                    />
                    {receiptError && (
                      <div className="text-center py-16">
                        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                        <p className="text-red-600 font-bold text-lg mb-2">فشل تحميل الصورة</p>
                        <p className="text-gray-600 text-sm mb-4">قد تكون الصورة تالفة أو غير متوفرة</p>
                        <a
                          href={selectedReceipt}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-bold"
                        >
                          <Eye className="w-4 h-4" />
                          حاول فتحها في تبويب جديد
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Rejection Modal */}
      {showRejectionModal && (
        <>
          <div
            className="fixed inset-0 bg-black/70 z-50"
            onClick={() => setShowRejectionModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6">
              <h3 className="text-xl font-black text-gray-900 mb-4">رفض السداد</h3>
              <p className="text-sm text-gray-600 mb-4">
                يرجى توضيح سبب رفض السداد. سيتم إرسال السبب للمستثمر.
              </p>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="اكتب سبب الرفض..."
                rows={4}
                className="w-full border-2 border-gray-200 rounded-lg p-3 focus:border-red-500 focus:outline-none"
              />
              <div className="flex gap-3 mt-4">
                <button
                  onClick={handleReject}
                  disabled={!rejectionReason.trim() || processing === selectedPayment}
                  className="flex-1 bg-red-500 text-white font-bold py-2.5 px-4 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  {processing === selectedPayment ? (
                    <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                  ) : (
                    'تأكيد الرفض'
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowRejectionModal(false);
                    setRejectionReason('');
                    setSelectedPayment(null);
                  }}
                  className="px-6 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
