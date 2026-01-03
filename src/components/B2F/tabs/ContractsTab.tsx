import React, { useState, useEffect } from 'react';
import {
  FileSignature,
  ExternalLink,
  Calendar,
  Trees,
  AlertCircle,
  Award,
  DollarSign,
  CheckCircle,
  FileCheck,
  User,
  MapPin,
  Phone,
  FileEdit,
  Download,
  Users,
  ArrowRightLeft,
  X,
  Save,
  Check,
  Edit3,
  Eye,
  CheckSquare
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface ReadyRequest {
  request_id: string;
  investor_name: string;
  investor_phone: string;
  investor_email: string;
  farm_id: string;
  farm_name: string;
  city: string;
  region: string;
  opportunity_id: string;
  opportunity_title: string;
  opportunity_tree_type: string;
  contract_duration_years: number;
  number_of_trees: number;
  total_amount: number;
  request_tree_type: string;
  payment_document_id: string;
  receipt_url: string;
  finance_status: string;
  amount_detected: number;
  amount_expected: number;
  staff_decision: string;
  reviewed_at: string;
  payment_approved_at: string;
}

interface Contract {
  id: string;
  contract_number: string;
  investor_phone: string;
  farm_id: string;
  farm_name: string;
  opportunity_title: string;
  trees_count: number;
  amount_total: number;
  start_date: string;
  end_date: string;
  duration_months: number;
  status: string;
  document_url: string;
  created_at: string;
  current_beneficiary_phone: string;
  current_beneficiary_name: string;
  original_beneficiary_phone: string;
  original_beneficiary_name: string;
  is_transferred: boolean;
  transfer_count: number;
  contract_content: string;
  pdf_url: string;
}

interface ContractDraft {
  id: string;
  draft_number: string;
  sales_request_id: string;
  investor_phone: string;
  investor_name: string;
  farm_id: string;
  trees_count: number;
  total_amount: number;
  draft_content: string;
  status: string;
  duration_months: number;
  start_date: string;
  end_date: string;
  created_at: string;
  issued: boolean;
  last_edited_at: string;
  created_by: string;
}

interface ContractTransfer {
  id: string;
  transfer_number: string;
  contract_id: string;
  from_phone: string;
  from_name: string;
  to_phone: string;
  to_name: string;
  to_national_id: string;
  transfer_reason: string;
  transferred_at: string;
  requested_by: string;
}

export default function ContractsTab() {
  const [activeTab, setActiveTab] = useState<'ready' | 'drafts' | 'issued' | 'transfers'>('ready');
  const [readyRequests, setReadyRequests] = useState<ReadyRequest[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [drafts, setDrafts] = useState<ContractDraft[]>([]);
  const [transfers, setTransfers] = useState<ContractTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [issuing, setIssuing] = useState<string | null>(null);

  // للإصدار الجماعي
  const [selectedRequests, setSelectedRequests] = useState<Set<string>>(new Set());
  const [bulkIssuing, setBulkIssuing] = useState(false);

  // مودال المسودة
  const [draftModal, setDraftModal] = useState<{
    show: boolean;
    draft: ContractDraft | null;
    requestId: string | null;
  }>({
    show: false,
    draft: null,
    requestId: null
  });

  // مودال نقل الانتفاع
  const [transferModal, setTransferModal] = useState<{
    show: boolean;
    contract: Contract | null;
  }>({
    show: false,
    contract: null
  });

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'ready') {
        await loadReadyRequests();
      } else if (activeTab === 'drafts') {
        await loadDrafts();
      } else if (activeTab === 'issued') {
        await loadContracts();
      } else if (activeTab === 'transfers') {
        await loadTransfers();
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadReadyRequests = async () => {
    const { data, error } = await supabase
      .from('v_contracts_ready_for_issuance')
      .select('*')
      .order('payment_approved_at', { ascending: false });

    if (error) {
      console.error('Error loading ready requests:', error);
      return;
    }

    setReadyRequests(data || []);
  };

  const loadContracts = async () => {
    const { data: contractsData, error } = await supabase
      .from('b2f_contracts')
      .select(`
        id, contract_number, investor_phone, farm_id, trees_count,
        amount_total, start_date, end_date, duration_months, status,
        document_url, created_at, current_beneficiary_phone,
        current_beneficiary_name, original_beneficiary_phone,
        original_beneficiary_name, is_transferred, transfer_count,
        contract_content, pdf_url
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading contracts:', error);
      return;
    }

    if (!contractsData || contractsData.length === 0) {
      setContracts([]);
      return;
    }

    const contractsWithNames = await Promise.all(
      contractsData.map(async (contract: any) => {
        const { data: farm } = await supabase
          .from('b2f_farms')
          .select('name')
          .eq('id', contract.farm_id)
          .single();

        return {
          ...contract,
          farm_name: farm?.name || 'غير محدد',
          opportunity_title: 'عرض استثماري'
        };
      })
    );

    setContracts(contractsWithNames);
  };

  const loadDrafts = async () => {
    const { data, error } = await supabase
      .from('b2f_contract_drafts')
      .select('*')
      .eq('status', 'draft')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading drafts:', error);
      return;
    }

    setDrafts(data || []);
  };

  const loadTransfers = async () => {
    const { data, error } = await supabase
      .from('b2f_contract_transfers')
      .select('*')
      .order('transferred_at', { ascending: false });

    if (error) {
      console.error('Error loading transfers:', error);
      return;
    }

    setTransfers(data || []);
  };

  // إنشاء مسودة عقد
  const handleCreateDraft = async (requestId: string) => {
    setIssuing(requestId);
    try {
      const { data, error } = await supabase.rpc('create_contract_draft', {
        p_request_id: requestId,
        p_created_by: 'Admin'
      });

      if (error) throw error;

      if (!data?.success) {
        alert('فشل إنشاء المسودة: ' + (data?.error || 'خطأ غير معروف'));
        return;
      }

      // فتح مودال المسودة
      const { data: draftData } = await supabase
        .from('b2f_contract_drafts')
        .select('*')
        .eq('id', data.draft_id)
        .single();

      if (draftData) {
        setDraftModal({
          show: true,
          draft: draftData,
          requestId: requestId
        });
      }

      alert('تم إنشاء مسودة العقد بنجاح!');
    } catch (error: any) {
      console.error('Error creating draft:', error);
      alert('حدث خطأ: ' + error.message);
    } finally {
      setIssuing(null);
    }
  };

  // إصدار وثيقة فردية مباشر
  const handleDirectIssue = async (requestId: string) => {
    if (!confirm('هل تريد إصدار عقد مباشرة لهذا الطلب بدون مسودة؟')) return;

    setIssuing(requestId);
    try {
      // إنشاء مسودة
      const { data: draftResult, error: draftError } = await supabase.rpc('create_contract_draft', {
        p_request_id: requestId,
        p_created_by: 'Admin'
      });

      if (draftError) throw draftError;
      if (!draftResult?.success) {
        alert('فشل إنشاء المسودة: ' + (draftResult?.error || 'خطأ'));
        return;
      }

      // إصدار العقد من المسودة
      const { data: issueResult, error: issueError } = await supabase.rpc('issue_contract_from_draft', {
        p_draft_id: draftResult.draft_id,
        p_issued_by: 'Admin'
      });

      if (issueError) throw issueError;
      if (!issueResult?.success) {
        alert('فشل إصدار العقد: ' + (issueResult?.error || 'خطأ'));
        return;
      }

      alert('✅ تم إصدار العقد بنجاح!\nرقم العقد: ' + issueResult.contract_number);
      loadData();
    } catch (error: any) {
      console.error('Error issuing contract:', error);
      alert('حدث خطأ: ' + error.message);
    } finally {
      setIssuing(null);
    }
  };

  // إصدار جماعي
  const handleBulkIssue = async () => {
    if (selectedRequests.size === 0) {
      alert('الرجاء اختيار طلب واحد على الأقل');
      return;
    }

    if (!confirm(`هل تريد إصدار ${selectedRequests.size} عقد دفعة واحدة؟`)) return;

    setBulkIssuing(true);
    try {
      const requestIds = Array.from(selectedRequests);

      const { data, error } = await supabase.rpc('bulk_issue_contracts', {
        p_request_ids: requestIds,
        p_issued_by: 'Admin'
      });

      if (error) throw error;

      alert(`✅ تم إصدار ${data.success_count} عقد بنجاح من أصل ${data.total}`);

      setSelectedRequests(new Set());
      loadData();
    } catch (error: any) {
      console.error('Error bulk issuing:', error);
      alert('حدث خطأ: ' + error.message);
    } finally {
      setBulkIssuing(false);
    }
  };

  // تبديل تحديد طلب
  const toggleSelectRequest = (requestId: string) => {
    const newSelected = new Set(selectedRequests);
    if (newSelected.has(requestId)) {
      newSelected.delete(requestId);
    } else {
      newSelected.add(requestId);
    }
    setSelectedRequests(newSelected);
  };

  // تحديد الكل
  const selectAll = () => {
    if (selectedRequests.size === readyRequests.length) {
      setSelectedRequests(new Set());
    } else {
      setSelectedRequests(new Set(readyRequests.map(r => r.request_id)));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border-2 border-amber-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl blur-md opacity-50"></div>
              <div className="relative bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-3 shadow-lg">
                <Award className="w-8 h-8 text-white" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">إدارة العقود المتطورة</h2>
              <p className="text-gray-600 mt-1">مسودات - إصدار فردي - إصدار جماعي - نقل الانتفاع</p>
            </div>
          </div>
        </div>
      </div>

      {/* ملاحظة المسار الجديد */}
      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-2">النظام المتطور - 4 مراحل</p>
            <ul className="space-y-1 text-xs">
              <li>✅ <strong>المرحلة 1:</strong> إعداد مسودة عقد قابلة للتعديل</li>
              <li>✅ <strong>المرحلة 2:</strong> إصدار وثيقة فردية أو جماعي</li>
              <li>✅ <strong>المرحلة 3:</strong> ظهور فوري في "عقودي" للمستثمر</li>
              <li>✅ <strong>المرحلة 4:</strong> نقل مدة الانتفاع لآخر</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b-2 border-gray-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab('ready')}
          className={`px-6 py-3 font-bold text-sm transition-all whitespace-nowrap ${
            activeTab === 'ready'
              ? 'border-b-4 border-emerald-500 text-emerald-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <FileCheck className="w-5 h-5" />
            1. طلبات جاهزة للعقد
            {readyRequests.length > 0 && (
              <span className="bg-emerald-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                {readyRequests.length}
              </span>
            )}
          </div>
        </button>

        <button
          onClick={() => setActiveTab('drafts')}
          className={`px-6 py-3 font-bold text-sm transition-all whitespace-nowrap ${
            activeTab === 'drafts'
              ? 'border-b-4 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <FileEdit className="w-5 h-5" />
            2. المسودات قيد الإعداد
            {drafts.length > 0 && (
              <span className="bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                {drafts.length}
              </span>
            )}
          </div>
        </button>

        <button
          onClick={() => setActiveTab('issued')}
          className={`px-6 py-3 font-bold text-sm transition-all whitespace-nowrap ${
            activeTab === 'issued'
              ? 'border-b-4 border-amber-500 text-amber-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <FileSignature className="w-5 h-5" />
            3. العقود المُصدرة
            {contracts.length > 0 && (
              <span className="bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                {contracts.length}
              </span>
            )}
          </div>
        </button>

        <button
          onClick={() => setActiveTab('transfers')}
          className={`px-6 py-3 font-bold text-sm transition-all whitespace-nowrap ${
            activeTab === 'transfers'
              ? 'border-b-4 border-purple-500 text-purple-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5" />
            4. سجل نقل الانتفاع
            {transfers.length > 0 && (
              <span className="bg-purple-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                {transfers.length}
              </span>
            )}
          </div>
        </button>
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden">
        <div className="p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto"></div>
              <p className="text-gray-600 mt-4">جاري التحميل...</p>
            </div>
          ) : activeTab === 'ready' ? (
            <ReadyRequestsView
              requests={readyRequests}
              onCreateDraft={handleCreateDraft}
              onDirectIssue={handleDirectIssue}
              issuing={issuing}
              selectedRequests={selectedRequests}
              onToggleSelect={toggleSelectRequest}
              onSelectAll={selectAll}
              onBulkIssue={handleBulkIssue}
              bulkIssuing={bulkIssuing}
            />
          ) : activeTab === 'drafts' ? (
            <DraftsView
              drafts={drafts}
              onEdit={(draft) => setDraftModal({ show: true, draft, requestId: null })}
            />
          ) : activeTab === 'issued' ? (
            <IssuedContractsView
              contracts={contracts}
              onTransfer={(contract) => setTransferModal({ show: true, contract })}
            />
          ) : (
            <TransfersView transfers={transfers} />
          )}
        </div>
      </div>

      {/* مودال المسودة */}
      {draftModal.show && draftModal.draft && (
        <DraftModal
          draft={draftModal.draft}
          onClose={() => {
            setDraftModal({ show: false, draft: null, requestId: null });
            loadData();
          }}
        />
      )}

      {/* مودال نقل الانتفاع */}
      {transferModal.show && transferModal.contract && (
        <TransferModal
          contract={transferModal.contract}
          onClose={() => {
            setTransferModal({ show: false, contract: null });
            loadData();
          }}
        />
      )}
    </div>
  );
}

// عرض الطلبات الجاهزة
function ReadyRequestsView({
  requests,
  onCreateDraft,
  onDirectIssue,
  issuing,
  selectedRequests,
  onToggleSelect,
  onSelectAll,
  onBulkIssue,
  bulkIssuing
}: {
  requests: ReadyRequest[];
  onCreateDraft: (id: string) => void;
  onDirectIssue: (id: string) => void;
  issuing: string | null;
  selectedRequests: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onBulkIssue: () => void;
  bulkIssuing: boolean;
}) {
  if (requests.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileCheck className="w-10 h-10 text-gray-400" />
        </div>
        <p className="text-gray-600 text-lg">لا توجد طلبات جاهزة لإصدار العقد</p>
        <p className="text-gray-500 text-sm mt-2">الطلبات ستظهر هنا بعد اعتمادها من مالية 2</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* شريط الإصدار الجماعي */}
      {requests.length > 0 && (
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onSelectAll}
                className="flex items-center gap-2 bg-white border-2 border-purple-300 rounded-lg px-4 py-2 font-bold text-sm text-purple-700 hover:bg-purple-50 transition-all"
              >
                <CheckSquare className="w-4 h-4" />
                {selectedRequests.size === requests.length ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
              </button>

              {selectedRequests.size > 0 && (
                <div className="text-sm text-purple-700 font-bold">
                  تم تحديد {selectedRequests.size} طلب
                </div>
              )}
            </div>

            {selectedRequests.size > 0 && (
              <button
                onClick={onBulkIssue}
                disabled={bulkIssuing}
                className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white px-6 py-3 rounded-xl font-bold text-sm hover:from-purple-600 hover:to-pink-700 transition-all shadow-lg disabled:opacity-50"
              >
                {bulkIssuing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    جاري الإصدار الجماعي...
                  </>
                ) : (
                  <>
                    <Users className="w-4 h-4" />
                    إصدار الوثائق جماعياً ({selectedRequests.size})
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* قائمة الطلبات */}
      {requests.map((request) => (
        <div
          key={request.request_id}
          className={`group bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border-2 p-6 transition-all ${
            selectedRequests.has(request.request_id)
              ? 'border-purple-400 shadow-lg'
              : 'border-emerald-200 hover:border-emerald-400'
          }`}
        >
          <div className="flex items-start gap-4">
            {/* Checkbox */}
            <button
              onClick={() => onToggleSelect(request.request_id)}
              className={`flex-shrink-0 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                selectedRequests.has(request.request_id)
                  ? 'bg-purple-500 border-purple-500'
                  : 'bg-white border-gray-300 hover:border-purple-400'
              }`}
            >
              {selectedRequests.has(request.request_id) && (
                <Check className="w-4 h-4 text-white" />
              )}
            </button>

            {/* المعلومات */}
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-emerald-700 font-semibold">المستثمر</p>
                  <p className="text-base font-bold text-gray-900">{request.investor_name}</p>
                  <p className="text-xs text-gray-600 flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {request.investor_phone}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white/60 rounded-lg p-3 border border-emerald-200">
                  <p className="text-xs text-emerald-700 font-semibold mb-1">عدد الأشجار</p>
                  <div className="flex items-center gap-1">
                    <Trees className="w-4 h-4 text-emerald-600" />
                    <p className="text-sm font-bold text-gray-900">{request.number_of_trees}</p>
                  </div>
                </div>
                <div className="bg-white/60 rounded-lg p-3 border border-emerald-200">
                  <p className="text-xs text-emerald-700 font-semibold mb-1">المبلغ</p>
                  <p className="text-sm font-bold text-gray-900">{request.total_amount.toLocaleString()} ر.س</p>
                </div>
                <div className="bg-white/60 rounded-lg p-3 border border-emerald-200">
                  <p className="text-xs text-emerald-700 font-semibold mb-1">المدة</p>
                  <p className="text-sm font-bold text-gray-900">{request.contract_duration_years} سنوات</p>
                </div>
              </div>
            </div>

            {/* الأزرار */}
            <div className="flex flex-col gap-2">
              <button
                onClick={() => onCreateDraft(request.request_id)}
                disabled={issuing === request.request_id}
                className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white px-4 py-2 rounded-lg font-bold text-xs hover:from-blue-600 hover:to-cyan-700 transition-all shadow-md disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
              >
                <FileEdit className="w-4 h-4" />
                إعداد مسودة
              </button>

              <button
                onClick={() => onDirectIssue(request.request_id)}
                disabled={issuing === request.request_id}
                className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-4 py-2 rounded-lg font-bold text-xs hover:from-emerald-600 hover:to-teal-700 transition-all shadow-md disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
              >
                {issuing === request.request_id ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
                    جاري...
                  </>
                ) : (
                  <>
                    <FileSignature className="w-4 h-4" />
                    إصدار فوري
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// عرض العقود المصدرة
function IssuedContractsView({
  contracts,
  onTransfer
}: {
  contracts: Contract[];
  onTransfer: (contract: Contract) => void;
}) {
  if (contracts.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileSignature className="w-10 h-10 text-gray-400" />
        </div>
        <p className="text-gray-600 text-lg">لا توجد عقود مُصدرة حالياً</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {contracts.map((contract) => (
        <div
          key={contract.id}
          className="group relative bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border-4 border-amber-200 p-6 hover:border-amber-400 transition-all"
        >
          {/* رقم العقد */}
          <div className="mb-4 pb-4 border-b-2 border-amber-300">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-amber-700 font-semibold mb-1">رقم العقد</p>
                <p className="text-lg font-black text-amber-900 font-mono">
                  {contract.contract_number}
                </p>
              </div>
              {contract.is_transferred && (
                <div className="bg-purple-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                  تم النقل {contract.transfer_count} مرة
                </div>
              )}
            </div>
          </div>

          {/* المنتفع الحالي */}
          <div className="space-y-3 mb-4">
            <div className="bg-white/60 rounded-lg p-3 border border-amber-200">
              <p className="text-xs text-amber-700 font-semibold mb-1">المنتفع الحالي</p>
              <p className="text-base font-bold text-gray-900">
                {contract.current_beneficiary_name || contract.investor_phone}
              </p>
              <p className="text-xs text-gray-600">{contract.current_beneficiary_phone}</p>
            </div>

            {contract.is_transferred && (
              <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                <p className="text-xs text-purple-700 font-semibold mb-1">المنتفع الأصلي</p>
                <p className="text-sm font-bold text-gray-900">
                  {contract.original_beneficiary_name}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/60 rounded-lg p-3 border border-amber-200">
                <p className="text-xs text-amber-700 font-semibold mb-1">المزرعة</p>
                <p className="text-sm font-bold text-gray-900">{contract.farm_name}</p>
              </div>
              <div className="bg-white/60 rounded-lg p-3 border border-amber-200">
                <p className="text-xs text-amber-700 font-semibold mb-1">عدد الأشجار</p>
                <div className="flex items-center gap-1">
                  <Trees className="w-4 h-4 text-emerald-600" />
                  <p className="text-sm font-bold text-gray-900">{contract.trees_count}</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-lg p-3 text-white shadow-md">
              <p className="text-xs font-semibold mb-1">قيمة العقد</p>
              <div className="flex items-center gap-1">
                <DollarSign className="w-5 h-5" />
                <p className="text-xl font-black">{contract.amount_total.toLocaleString()} ر.س</p>
              </div>
            </div>
          </div>

          {/* الأزرار */}
          <div className="pt-4 border-t-2 border-amber-300 flex gap-2">
            {contract.pdf_url && (
              <button
                onClick={() => window.open(contract.pdf_url, '_blank')}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:from-amber-600 hover:to-orange-700 transition-all"
              >
                <Download className="w-4 h-4" />
                تحميل PDF
              </button>
            )}

            <button
              onClick={() => onTransfer(contract)}
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:from-purple-600 hover:to-pink-700 transition-all"
            >
              <ArrowRightLeft className="w-4 h-4" />
              نقل الانتفاع
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// عرض المسودات قيد الإعداد
function DraftsView({
  drafts,
  onEdit
}: {
  drafts: ContractDraft[];
  onEdit: (draft: ContractDraft) => void;
}) {
  if (drafts.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileEdit className="w-10 h-10 text-gray-400" />
        </div>
        <p className="text-gray-600 text-lg">لا توجد مسودات قيد الإعداد</p>
        <p className="text-gray-500 text-sm mt-2">المسودات ستظهر هنا عند إنشائها من الطلبات الجاهزة</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {drafts.map((draft) => (
        <div
          key={draft.id}
          className="group relative bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border-4 border-blue-200 p-6 hover:border-blue-400 transition-all"
        >
          {/* رقم المسودة */}
          <div className="mb-4 pb-4 border-b-2 border-blue-300">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-blue-700 font-semibold mb-1">رقم المسودة</p>
                <p className="text-lg font-black text-blue-900 font-mono">
                  {draft.draft_number}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  أُنشئت: {new Date(draft.created_at).toLocaleDateString('ar-SA')}
                </p>
                {draft.last_edited_at && (
                  <p className="text-xs text-gray-600">
                    آخر تعديل: {new Date(draft.last_edited_at).toLocaleDateString('ar-SA')}
                  </p>
                )}
              </div>
              <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                مسودة
              </div>
            </div>
          </div>

          {/* المعلومات */}
          <div className="space-y-3 mb-4">
            <div className="bg-white/60 rounded-lg p-3 border border-blue-200">
              <p className="text-xs text-blue-700 font-semibold mb-1">المستثمر</p>
              <p className="text-base font-bold text-gray-900">{draft.investor_name}</p>
              <p className="text-xs text-gray-600">{draft.investor_phone}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/60 rounded-lg p-3 border border-blue-200">
                <p className="text-xs text-blue-700 font-semibold mb-1">عدد الأشجار</p>
                <div className="flex items-center gap-1">
                  <Trees className="w-4 h-4 text-emerald-600" />
                  <p className="text-sm font-bold text-gray-900">{draft.trees_count}</p>
                </div>
              </div>
              <div className="bg-white/60 rounded-lg p-3 border border-blue-200">
                <p className="text-xs text-blue-700 font-semibold mb-1">المبلغ</p>
                <p className="text-sm font-bold text-gray-900">{draft.total_amount.toLocaleString()} ر.س</p>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-500 to-cyan-600 rounded-lg p-3 text-white shadow-md">
              <p className="text-xs font-semibold mb-1">المدة</p>
              <p className="text-lg font-black">{draft.duration_months} شهر</p>
            </div>
          </div>

          {/* زر التعديل */}
          <button
            onClick={() => onEdit(draft)}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-600 text-white px-4 py-3 rounded-lg font-bold text-sm hover:from-blue-600 hover:to-cyan-700 transition-all"
          >
            <Edit3 className="w-4 h-4" />
            تعديل وإصدار
          </button>
        </div>
      ))}
    </div>
  );
}

// عرض سجل نقل الانتفاع
function TransfersView({ transfers }: { transfers: ContractTransfer[] }) {
  if (transfers.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <ArrowRightLeft className="w-10 h-10 text-gray-400" />
        </div>
        <p className="text-gray-600 text-lg">لا توجد عمليات نقل انتفاع</p>
        <p className="text-gray-500 text-sm mt-2">سجل عمليات النقل سيظهر هنا</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {transfers.map((transfer) => (
        <div
          key={transfer.id}
          className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200 p-6 hover:border-purple-400 transition-all"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* رقم النقل */}
            <div className="md:col-span-3 pb-4 border-b-2 border-purple-300">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-purple-700 font-semibold mb-1">رقم النقل</p>
                  <p className="text-lg font-black text-purple-900 font-mono">
                    {transfer.transfer_number}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    تاريخ النقل: {new Date(transfer.transferred_at).toLocaleDateString('ar-SA')} الساعة {new Date(transfer.transferred_at).toLocaleTimeString('ar-SA')}
                  </p>
                </div>
                {transfer.requested_by && (
                  <div className="text-xs text-gray-600">
                    طلب بواسطة: {transfer.requested_by}
                  </div>
                )}
              </div>
            </div>

            {/* من */}
            <div className="bg-red-50 rounded-lg p-4 border-2 border-red-200">
              <p className="text-xs text-red-700 font-semibold mb-2 flex items-center gap-1">
                <User className="w-3 h-3" />
                المنتفع السابق
              </p>
              <p className="text-base font-bold text-gray-900">{transfer.from_name}</p>
              <p className="text-sm text-gray-600">{transfer.from_phone}</p>
            </div>

            {/* السهم */}
            <div className="flex items-center justify-center">
              <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center shadow-lg">
                <ArrowRightLeft className="w-6 h-6 text-white" />
              </div>
            </div>

            {/* إلى */}
            <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200">
              <p className="text-xs text-green-700 font-semibold mb-2 flex items-center gap-1">
                <User className="w-3 h-3" />
                المنتفع الجديد
              </p>
              <p className="text-base font-bold text-gray-900">{transfer.to_name}</p>
              <p className="text-sm text-gray-600">{transfer.to_phone}</p>
              {transfer.to_national_id && (
                <p className="text-xs text-gray-500 mt-1">الهوية: {transfer.to_national_id}</p>
              )}
            </div>

            {/* السبب */}
            {transfer.transfer_reason && (
              <div className="md:col-span-3 bg-purple-100 rounded-lg p-4 border border-purple-300">
                <p className="text-xs text-purple-700 font-semibold mb-1">سبب النقل</p>
                <p className="text-sm text-gray-900">{transfer.transfer_reason}</p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// مودال المسودة
function DraftModal({ draft, onClose }: { draft: ContractDraft; onClose: () => void }) {
  const [content, setContent] = useState(draft.draft_content);
  const [saving, setSaving] = useState(false);
  const [issuing, setIssuing] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data, error } = await supabase.rpc('update_draft_content', {
        p_draft_id: draft.id,
        p_new_content: content,
        p_edited_by: 'Admin'
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error);

      alert('✅ تم حفظ المسودة بنجاح');
    } catch (error: any) {
      alert('حدث خطأ: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleIssue = async () => {
    if (!confirm('هل تريد إصدار العقد من هذه المسودة؟')) return;

    setIssuing(true);
    try {
      const { data, error } = await supabase.rpc('issue_contract_from_draft', {
        p_draft_id: draft.id,
        p_issued_by: 'Admin'
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error);

      alert('✅ تم إصدار العقد بنجاح!\nرقم العقد: ' + data.contract_number);
      onClose();
    } catch (error: any) {
      alert('حدث خطأ: ' + error.message);
    } finally {
      setIssuing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-cyan-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold">مسودة العقد</h3>
              <p className="text-sm opacity-90 mt-1">رقم المسودة: {draft.draft_number}</p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-800">
              <strong>التعليمات:</strong> يمكنك تعديل نص العقد ليتوافق مع سياسة المنصة. بعد التعديل، احفظ المسودة أو أصدر العقد مباشرة.
            </p>
          </div>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full h-96 p-4 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 font-mono text-sm"
            placeholder="نص العقد..."
          />
        </div>

        {/* Footer */}
        <div className="border-t-2 border-gray-200 p-6 bg-gray-50">
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-blue-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Save className="w-5 h-5" />
              {saving ? 'جاري الحفظ...' : 'حفظ المسودة'}
            </button>

            <button
              onClick={handleIssue}
              disabled={issuing}
              className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-6 py-3 rounded-xl font-bold hover:from-emerald-600 hover:to-teal-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <FileSignature className="w-5 h-5" />
              {issuing ? 'جاري الإصدار...' : 'اعتماد وإصدار العقد'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// مودال نقل الانتفاع
function TransferModal({ contract, onClose }: { contract: Contract; onClose: () => void }) {
  const [formData, setFormData] = useState({
    toPhone: '',
    toName: '',
    toNationalId: '',
    transferReason: ''
  });
  const [transferring, setTransferring] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.toPhone || !formData.toName) {
      alert('الرجاء إدخال رقم الجوال والاسم');
      return;
    }

    if (!confirm('هل تريد نقل مدة الانتفاع لهذا المستثمر الجديد؟')) return;

    setTransferring(true);
    try {
      const { data, error } = await supabase.rpc('transfer_beneficiary', {
        p_contract_id: contract.id,
        p_to_phone: formData.toPhone,
        p_to_name: formData.toName,
        p_to_national_id: formData.toNationalId || null,
        p_transfer_reason: formData.transferReason || null,
        p_requested_by: 'Admin'
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error);

      alert('✅ تم نقل مدة الانتفاع بنجاح!\nرقم النقل: ' + data.transfer_number);
      onClose();
    } catch (error: any) {
      alert('حدث خطأ: ' + error.message);
    } finally {
      setTransferring(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold">نقل مدة الانتفاع لآخر</h3>
              <p className="text-sm opacity-90 mt-1">عقد رقم: {contract.contract_number}</p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* المنتفع الحالي */}
          <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4">
            <p className="text-xs text-amber-700 font-semibold mb-2">المنتفع الحالي</p>
            <p className="text-base font-bold text-gray-900">{contract.current_beneficiary_name}</p>
            <p className="text-sm text-gray-600">{contract.current_beneficiary_phone}</p>
          </div>

          {/* بيانات المنتفع الجديد */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                رقم جوال المنتفع الجديد *
              </label>
              <input
                type="tel"
                value={formData.toPhone}
                onChange={(e) => setFormData({ ...formData, toPhone: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                placeholder="05XXXXXXXX"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                اسم المنتفع الجديد *
              </label>
              <input
                type="text"
                value={formData.toName}
                onChange={(e) => setFormData({ ...formData, toName: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                placeholder="الاسم الكامل"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                رقم الهوية (اختياري)
              </label>
              <input
                type="text"
                value={formData.toNationalId}
                onChange={(e) => setFormData({ ...formData, toNationalId: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                placeholder="1XXXXXXXXX"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                سبب النقل (اختياري)
              </label>
              <textarea
                value={formData.transferReason}
                onChange={(e) => setFormData({ ...formData, transferReason: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                rows={3}
                placeholder="مثال: تنازل، بيع، هبة..."
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-xl font-bold hover:bg-gray-300 transition-all"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={transferring}
              className="flex-1 bg-gradient-to-r from-purple-500 to-pink-600 text-white px-6 py-3 rounded-xl font-bold hover:from-purple-600 hover:to-pink-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {transferring ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  جاري النقل...
                </>
              ) : (
                <>
                  <ArrowRightLeft className="w-5 h-5" />
                  تأكيد النقل
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
