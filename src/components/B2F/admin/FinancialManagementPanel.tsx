import { useState } from 'react';
import { Eye, CheckCircle, XCircle, AlertCircle, ExternalLink, TrendingUp } from 'lucide-react';
import { usePaymentDocuments, type PaymentDocument, type AIDecision } from '../../../hooks/usePaymentDocuments';

export default function FinancialManagementPanel() {
  const [activeTab, setActiveTab] = useState<AIDecision | 'all'>('needs_review');
  const { documents, loading, approveDocument, rejectDocument, reopenDocument } = usePaymentDocuments(activeTab);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [viewingDocument, setViewingDocument] = useState<PaymentDocument | null>(null);

  const handleApprove = async (documentId: string) => {
    try {
      setProcessingId(documentId);
      await approveDocument(documentId);
    } catch (error) {
      alert('حدث خطأ في اعتماد المستند');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (documentId: string) => {
    const reason = prompt('يرجى إدخال سبب الرفض:');
    if (!reason) return;

    try {
      setProcessingId(documentId);
      await rejectDocument(documentId, reason);
    } catch (error) {
      alert('حدث خطأ في رفض المستند');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReopen = async (documentId: string) => {
    try {
      setProcessingId(documentId);
      await reopenDocument(documentId);
    } catch (error) {
      alert('حدث خطأ في إعادة فتح المستند');
    } finally {
      setProcessingId(null);
    }
  };

  const getDecisionBadge = (decision: string | null, status: string) => {
    if (status === 'approved') {
      return <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">معتمد نهائياً</span>;
    }
    if (status === 'rejected') {
      return <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">مرفوض</span>;
    }

    switch (decision) {
      case 'auto_approved':
        return <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">اعتماد آلي</span>;
      case 'needs_review':
        return <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">يحتاج مراجعة</span>;
      case 'auto_rejected':
        return <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">رفض آلي</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-bold rounded-full">قيد المعالجة</span>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-black">الإدارة المالية</h3>
            <p className="text-sm text-emerald-50">مراجعة واعتماد مستندات الدفع</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border-2 border-gray-200 p-2">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('needs_review')}
            className={`flex-1 py-2 px-4 rounded-lg font-bold text-sm transition-all ${
              activeTab === 'needs_review'
                ? 'bg-blue-500 text-white shadow-md'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
            }`}
          >
            قيد المراجعة
          </button>
          <button
            onClick={() => setActiveTab('auto_approved')}
            className={`flex-1 py-2 px-4 rounded-lg font-bold text-sm transition-all ${
              activeTab === 'auto_approved'
                ? 'bg-emerald-500 text-white shadow-md'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
            }`}
          >
            معتمدة آلياً
          </button>
          <button
            onClick={() => setActiveTab('auto_rejected')}
            className={`flex-1 py-2 px-4 rounded-lg font-bold text-sm transition-all ${
              activeTab === 'auto_rejected'
                ? 'bg-red-500 text-white shadow-md'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
            }`}
          >
            مرفوضة آلياً
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
        </div>
      ) : documents.length === 0 ? (
        <div className="bg-white rounded-xl border-2 border-gray-200 p-12 text-center">
          <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">لا توجد مستندات في هذا القسم</p>
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => (
            <div key={doc.id} className="bg-white rounded-xl border-2 border-gray-200 p-4">
              <h4 className="font-black text-gray-900">{doc.investor_name}</h4>
              <p className="text-sm text-gray-600">{doc.investor_phone}</p>
              <div className="flex gap-2 mt-3">
                <button className="flex-1 bg-gray-100 text-gray-700 font-bold py-2 px-4 rounded-lg text-sm">
                  عرض المستند
                </button>
                <button onClick={() => handleApprove(doc.id)} className="flex-1 bg-emerald-500 text-white font-bold py-2 px-4 rounded-lg text-sm">
                  اعتماد
                </button>
                <button onClick={() => handleReject(doc.id)} className="flex-1 bg-red-500 text-white font-bold py-2 px-4 rounded-lg text-sm">
                  رفض
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}