import { useState, useEffect } from 'react';
import { FileText, Search, Calendar, DollarSign, User, CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface Invoice {
  request_id: string;
  investor_name: string;
  investor_phone: string;
  investor_email: string;
  number_of_trees: number;
  tree_type: string;
  total_amount: number;
  request_status: string;
  request_created_at: string;
  farm_name: string;
  payment_document_id: string;
  finance_status: string;
  receipt_url: string;
  amount_detected: number | null;
  ai_confidence: number | null;
  ai_decision: string | null;
  receipt_uploaded_at: string;
  reviewed_at: string | null;
}

export default function InvestmentInvoicesTab() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('v_b2f_investment_invoices')
        .select('*')
        .order('receipt_uploaded_at', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string; icon: any }> = {
      'pending_review': {
        label: 'قيد المراجعة',
        className: 'bg-blue-100 text-blue-700',
        icon: AlertCircle
      },
      'auto_approved': {
        label: 'تم القبول آلياً',
        className: 'bg-cyan-100 text-cyan-700',
        icon: CheckCircle
      },
      'manually_approved': {
        label: 'معتمد يدوياً',
        className: 'bg-green-100 text-green-700',
        icon: CheckCircle
      },
      'approved_for_contract': {
        label: 'جاهز للعقود',
        className: 'bg-emerald-100 text-emerald-700',
        icon: CheckCircle
      },
      'rejected_final': {
        label: 'مرفوض',
        className: 'bg-red-100 text-red-700',
        icon: XCircle
      },
      'auto_rejected': {
        label: 'مرفوض آلياً',
        className: 'bg-rose-100 text-rose-700',
        icon: XCircle
      }
    };

    const config = statusConfig[status] || statusConfig['pending_review'];
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${config.className}`}>
        <Icon className="w-3.5 h-3.5" />
        {config.label}
      </span>
    );
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch =
      inv.investor_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.investor_phone.includes(searchQuery);

    const matchesStatus = statusFilter === 'all' || inv.finance_status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: invoices.length,
    approved: invoices.filter(i => i.finance_status === 'manually_approved' || i.finance_status === 'approved_for_contract').length,
    pending: invoices.filter(i => i.finance_status === 'pending_review').length,
    rejected: invoices.filter(i => i.finance_status === 'rejected_final').length,
    totalAmount: invoices.reduce((sum, inv) => sum + parseFloat(inv.total_amount.toString()), 0),
    approvedAmount: invoices.filter(i => i.finance_status === 'manually_approved' || i.finance_status === 'approved_for_contract').reduce((sum, inv) => sum + parseFloat(inv.total_amount.toString()), 0)
  };

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">إجمالي الفواتير</p>
            <FileText className="w-8 h-8 text-blue-500 opacity-20" />
          </div>
          <p className="text-2xl font-black text-blue-600">{stats.total}</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">معتمدة</p>
            <CheckCircle className="w-8 h-8 text-green-500 opacity-20" />
          </div>
          <p className="text-2xl font-black text-green-600">{stats.approved}</p>
          <p className="text-xs text-gray-500 mt-1">
            {stats.approvedAmount.toLocaleString('ar-SA')} ريال
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">قيد المراجعة</p>
            <AlertCircle className="w-8 h-8 text-blue-500 opacity-20" />
          </div>
          <p className="text-2xl font-black text-blue-600">{stats.pending}</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">مرفوضة</p>
            <XCircle className="w-8 h-8 text-red-500 opacity-20" />
          </div>
          <p className="text-2xl font-black text-red-600">{stats.rejected}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-lg p-4 space-y-4">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="ابحث بالاسم، رقم الهاتف، أو رقم الفاتورة..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${
              statusFilter === 'all'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            الكل ({invoices.length})
          </button>
          <button
            onClick={() => setStatusFilter('manually_approved')}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${
              statusFilter === 'manually_approved'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            معتمدة ({stats.approved})
          </button>
          <button
            onClick={() => setStatusFilter('pending_review')}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${
              statusFilter === 'pending_review'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            قيد المراجعة ({stats.pending})
          </button>
          <button
            onClick={() => setStatusFilter('rejected_final')}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${
              statusFilter === 'rejected_final'
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            مرفوضة ({stats.rejected})
          </button>
        </div>
      </div>

      {/* Invoices List */}
      <div className="space-y-4">
        {filteredInvoices.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-bold">لا توجد فواتير</p>
          </div>
        ) : (
          filteredInvoices.map((invoice) => (
            <div key={invoice.payment_document_id} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-black text-gray-900">{invoice.investor_name}</h3>
                    {getStatusBadge(invoice.finance_status)}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>{invoice.investor_phone}</span>
                    {invoice.investor_email && (
                      <>
                        <span>•</span>
                        <span>{invoice.investor_email}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-left">
                  <div className="text-2xl font-black text-purple-600">
                    {parseFloat(invoice.total_amount.toString()).toLocaleString('ar-SA')} ريال
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(invoice.receipt_uploaded_at).toLocaleDateString('ar-SA')}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 rounded-lg p-4 text-sm">
                <div>
                  <p className="text-gray-600 mb-1">المزرعة</p>
                  <p className="font-bold">{invoice.farm_name || 'غير محدد'}</p>
                </div>
                <div>
                  <p className="text-gray-600 mb-1">عدد الأشجار</p>
                  <p className="font-bold">{invoice.number_of_trees}</p>
                </div>
                <div>
                  <p className="text-gray-600 mb-1">نوع الشجرة</p>
                  <p className="font-bold">{invoice.tree_type}</p>
                </div>
                <div>
                  <p className="text-gray-600 mb-1">المبلغ المكتشف</p>
                  <p className="font-bold text-blue-600">
                    {invoice.amount_detected ? `${invoice.amount_detected.toLocaleString('ar-SA')} ريال` : 'غير متاح'}
                  </p>
                </div>
              </div>

              {invoice.ai_confidence && invoice.ai_confidence > 0 && (
                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-blue-700">ثقة الذكاء الصناعي</span>
                    <span className="font-bold text-blue-900">{(invoice.ai_confidence * 100).toFixed(1)}%</span>
                  </div>
                </div>
              )}

              {invoice.finance_status === 'rejected_final' && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                  تم رفض الإيصال. يجب على المستثمر رفع إيصال جديد.
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
