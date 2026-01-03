import { useState, useEffect } from 'react';
import { CheckCircle2, FileText, Zap, CheckSquare } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useSystemMessages } from '../../../hooks/useSystemMessages';
import SystemMessageBanner from '../SystemMessageBanner';

interface ApprovedReceipt {
  id: string;
  request_id: string;
  investor_name: string;
  investor_phone: string;
  total_amount: number;
  number_of_trees: number;
  tree_type: string;
  approved_at: string;
  receipt_url: string;
}

export default function ApprovedReceiptsView() {
  const [receipts, setReceipts] = useState<ApprovedReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);
  const { getMessage } = useSystemMessages('sales');

  useEffect(() => {
    loadApprovedReceipts();
  }, []);

  const loadApprovedReceipts = async () => {
    try {
      const { data, error } = await supabase
        .from('b2f_sales_requests')
        .select(`
          id,
          investor_name,
          investor_phone,
          total_amount,
          number_of_trees,
          tree_type,
          approved_at,
          b2f_payment_receipts!inner (
            id,
            receipt_url
          )
        `)
        .eq('status', 'receipt_approved')
        .order('approved_at', { ascending: false });

      if (error) throw error;

      const formatted: ApprovedReceipt[] = data?.map((item: any) => ({
        id: item.b2f_payment_receipts[0]?.id || '',
        request_id: item.id,
        investor_name: item.investor_name,
        investor_phone: item.investor_phone,
        total_amount: item.total_amount,
        number_of_trees: item.number_of_trees,
        tree_type: item.tree_type,
        approved_at: item.approved_at,
        receipt_url: item.b2f_payment_receipts[0]?.receipt_url || ''
      })) || [];

      setReceipts(formatted);
    } catch (error) {
      console.error('Error loading approved receipts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRequest = (requestId: string) => {
    setSelectedRequests(prev =>
      prev.includes(requestId)
        ? prev.filter(id => id !== requestId)
        : [...prev, requestId]
    );
  };

  const handleSelectAll = () => {
    const allRequestIds = receipts.map(r => r.request_id);
    const allSelected = allRequestIds.every(id => selectedRequests.includes(id));

    if (allSelected) {
      setSelectedRequests([]);
    } else {
      setSelectedRequests(allRequestIds);
    }
  };

  const handleIssueContracts = async () => {
    if (selectedRequests.length === 0) return;

    if (!confirm(`هل تريد إصدار العقود لـ ${selectedRequests.length} طلب؟`)) return;

    try {
      const { error } = await supabase.rpc('issue_contracts_for_approved_requests', {
        request_ids: selectedRequests
      });

      if (error) throw error;

      alert('تم إصدار العقود بنجاح');
      setSelectedRequests([]);
      loadApprovedReceipts();
    } catch (error) {
      console.error('Error issuing contracts:', error);
      alert('حدث خطأ أثناء إصدار العقود');
    }
  };

  const handleIssueSingleContract = async (requestId: string) => {
    if (!confirm('هل تريد إصدار عقد لهذا الطلب؟')) return;

    try {
      const { error } = await supabase.rpc('issue_contracts_for_approved_requests', {
        request_ids: [requestId]
      });

      if (error) throw error;

      alert('تم إصدار العقد بنجاح');
      loadApprovedReceipts();
    } catch (error) {
      console.error('Error issuing contract:', error);
      alert('حدث خطأ أثناء إصدار العقد');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-gray-600">جاري التحميل...</p>
      </div>
    );
  }

  if (receipts.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 text-lg font-semibold">لا توجد إيصالات معتمدة</p>
        <p className="text-gray-400 text-sm mt-2">ستظهر هنا الإيصالات المعتمدة الجاهزة لإصدار العقود</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* رسالة استلام الإيصال */}
      {getMessage('sales', 'receipt_uploaded') && (
        <SystemMessageBanner
          message={getMessage('sales', 'receipt_uploaded')?.message_text || ''}
          icon={getMessage('sales', 'receipt_uploaded')?.icon}
          type="info"
        />
      )}

      {/* شريط الإجراءات */}
      <div className="flex items-center justify-between bg-white rounded-xl border-2 border-gray-200 p-4">
        <div className="flex items-center gap-3">
          <button
            onClick={handleSelectAll}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-bold text-sm transition-all"
          >
            {receipts.every(r => selectedRequests.includes(r.request_id)) ? 'إلغاء الكل' : 'تحديد الكل'}
          </button>
          {selectedRequests.length > 0 && (
            <span className="text-sm text-gray-600">
              تم تحديد {selectedRequests.length} من {receipts.length}
            </span>
          )}
        </div>

        {selectedRequests.length > 0 && (
          <button
            onClick={handleIssueContracts}
            className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg font-bold hover:shadow-lg transition-all flex items-center gap-2"
          >
            <Zap className="w-4 h-4" />
            إصدار العقود للمحددة
          </button>
        )}
      </div>

      {/* قائمة الإيصالات المعتمدة */}
      <div className="grid gap-4">
        {receipts.map((receipt) => (
          <div
            key={receipt.request_id}
            className={`bg-white rounded-xl border-2 overflow-hidden transition-all ${
              selectedRequests.includes(receipt.request_id)
                ? 'border-emerald-500 shadow-lg'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedRequests.includes(receipt.request_id)}
                    onChange={() => handleSelectRequest(receipt.request_id)}
                    className="w-5 h-5 text-emerald-600 rounded"
                  />
                  <CheckCircle2 className="w-6 h-6" />
                  <div>
                    <h3 className="font-bold">{receipt.investor_name}</h3>
                    <p className="text-sm text-white/80">{receipt.investor_phone}</p>
                  </div>
                </div>
                <div className="text-xs text-white/80">
                  تم الاعتماد: {new Date(receipt.approved_at).toLocaleDateString('ar-SA')}
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <span className="text-sm text-gray-500">عدد الأشجار:</span>
                  <p className="font-bold text-gray-800">{receipt.number_of_trees}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">النوع:</span>
                  <p className="font-bold text-gray-800">{receipt.tree_type}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">المبلغ:</span>
                  <p className="font-bold text-emerald-600">{receipt.total_amount.toLocaleString()} ريال</p>
                </div>
              </div>

              <button
                onClick={() => handleIssueSingleContract(receipt.request_id)}
                className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-lg font-bold hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <FileText className="w-5 h-5" />
                إصدار عقد استنفاع الأشجار
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}