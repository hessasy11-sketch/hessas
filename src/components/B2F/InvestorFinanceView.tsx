import { useState, useEffect } from 'react';
import {
  DollarSign, TrendingUp, Clock, CheckCircle, AlertCircle, Upload,
  XCircle, Calendar, CreditCard, Copy, Check, Smartphone, Wallet,
  Building2, CircleDollarSign, FileText, Download, Printer
} from 'lucide-react';
import { useInvestorAuth } from '../../contexts/InvestorAuthContext';
import { useFinancialSummary } from '../../hooks/useFinancialSummary';
import { usePaymentGateways } from '../../hooks/usePaymentGateways';
import { supabase } from '../../lib/supabase';
import UploadPaymentDocumentModal from './UploadPaymentDocumentModal';

interface PaymentRequest {
  id: string;
  tree_type: string;
  number_of_trees: number;
  total_amount: number;
  status: string;
  created_at: string;
  investor_name: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  sales_request_id: string;
  total_amount: number;
  status: string;
  payment_method: string | null;
  notes: string | null;
  issued_at: string;
  paid_at: string | null;
  created_at: string;
}

type FilterTab = 'all' | 'paid' | 'pending' | 'under_review';

interface BankAccount {
  bank_name: string;
  account_name: string;
  account_number: string;
  iban: string;
}

export default function InvestorFinanceView() {
  const { account } = useInvestorAuth();
  const { summary, loading, refresh } = useFinancialSummary(account?.contact_phone || null);
  const { gateways } = usePaymentGateways();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PaymentRequest | null>(null);
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  // بيانات الحساب البنكي الثابتة
  const [bankAccount] = useState<BankAccount>({
    bank_name: 'البنك الأهلي السعودي',
    account_name: 'شركة استثمار أشجار المزارع',
    account_number: '1234567890',
    iban: 'SA1234567890123456789012'
  });

  useEffect(() => {
    if (account) {
      loadPaymentRequests();
      loadInvoices();
    }
  }, [account]);

  const loadPaymentRequests = async () => {
    if (!account) return;

    try {
      setLoadingRequests(true);
      const { data, error } = await supabase
        .from('b2f_sales_requests')
        .select('id, tree_type, number_of_trees, total_amount, status, created_at, investor_name')
        .eq('investor_phone', account.contact_phone)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPaymentRequests(data || []);
    } catch (error) {
      console.error('Error loading payment requests:', error);
    } finally {
      setLoadingRequests(false);
    }
  };

  const loadInvoices = async () => {
    if (!account) return;

    try {
      setLoadingInvoices(true);
      const { data, error } = await supabase
        .from('b2f_invoices')
        .select('*')
        .eq('investor_phone', account.contact_phone)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error('Error loading invoices:', error);
    } finally {
      setLoadingInvoices(false);
    }
  };

  const getFilteredRequests = () => {
    switch (activeFilter) {
      case 'paid':
        return paymentRequests.filter(r =>
          ['receipt_approved', 'contract_issued', 'transferred_to_operations', 'payment_confirmed'].includes(r.status)
        );
      case 'under_review':
        return paymentRequests.filter(r =>
          ['receipt_uploaded', 'receipt_under_review', 'payment_pending_verification'].includes(r.status)
        );
      case 'pending':
        return paymentRequests.filter(r =>
          ['payment_open', 'receipt_rejected'].includes(r.status)
        );
      default:
        return paymentRequests;
    }
  };

  const filteredRequests = getFilteredRequests();

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleBankTransferUpload = (request: PaymentRequest) => {
    setSelectedRequest(request);
    setShowUploadModal(true);
  };

  const getPaymentMethodName = (method: string) => {
    switch (method) {
      case 'mada': return 'مدى';
      case 'apple_pay': return 'Apple Pay';
      case 'stc_pay': return 'STC Pay';
      case 'tabby': return 'تابي';
      case 'tamara': return 'تمارا';
      case 'bank_transfer': return 'تحويل بنكي';
      default: return method;
    }
  };

  const getPaymentStatus = (status: string) => {
    if (['receipt_approved', 'contract_issued', 'transferred_to_operations', 'payment_confirmed'].includes(status)) {
      return {
        label: 'مدفوع مؤكد',
        icon: CheckCircle,
        color: 'text-emerald-600',
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        step: 4
      };
    }

    if (['receipt_uploaded', 'receipt_under_review', 'payment_pending_verification'].includes(status)) {
      return {
        label: 'مدفوع مؤقتاً - بانتظار المراجعة',
        icon: Clock,
        color: 'text-amber-600',
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        step: 3
      };
    }

    if (status === 'receipt_rejected') {
      return {
        label: 'مرفوض - يحتاج إعادة رفع',
        icon: XCircle,
        color: 'text-red-600',
        bg: 'bg-red-50',
        border: 'border-red-200',
        step: 2
      };
    }

    return {
      label: 'في انتظار الدفع',
      icon: AlertCircle,
      color: 'text-red-600',
      bg: 'bg-red-50',
      border: 'border-red-200',
      step: 1
    };
  };

  const getStatusProgress = (step: number) => {
    const steps = [
      { num: 1, label: 'في انتظار الدفع' },
      { num: 2, label: 'تم الدفع' },
      { num: 3, label: 'تحت المراجعة' },
      { num: 4, label: 'مؤكد' }
    ];

    return (
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between mb-2">
          {steps.map((s, idx) => (
            <div key={s.num} className="flex items-center flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                s.num <= step
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}>
                {s.num <= step ? <Check className="w-4 h-4" /> : s.num}
              </div>
              {idx < steps.length - 1 && (
                <div className={`flex-1 h-1 mx-1 ${
                  s.num < step ? 'bg-emerald-500' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between">
          {steps.map((s) => (
            <div key={s.num} className="flex-1 text-center">
              <p className={`text-[9px] font-bold ${
                s.num <= step ? 'text-emerald-600' : 'text-gray-400'
              }`}>
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const getInvoiceStatus = (status: string) => {
    switch (status) {
      case 'issued_pending_payment':
        return {
          label: 'صادرة - بانتظار السداد',
          icon: Clock,
          color: 'text-blue-600',
          bg: 'bg-blue-50',
          border: 'border-blue-200'
        };
      case 'paid':
        return {
          label: 'مدفوعة',
          icon: CheckCircle,
          color: 'text-emerald-600',
          bg: 'bg-emerald-50',
          border: 'border-emerald-200'
        };
      case 'cancelled':
        return {
          label: 'ملغاة',
          icon: XCircle,
          color: 'text-gray-600',
          bg: 'bg-gray-50',
          border: 'border-gray-200'
        };
      default:
        return {
          label: 'قيد الانتظار',
          icon: Clock,
          color: 'text-yellow-600',
          bg: 'bg-yellow-50',
          border: 'border-yellow-200'
        };
    }
  };

  const getVisibleGateways = () => {
    return gateways.filter(g => g.visibility_status !== 'hidden' && g.code !== 'bank_transfer');
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
        {/* Header - الملخص المالي */}
        <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black">الملخص المالي</h3>
              <p className="text-sm text-emerald-50">حالة المدفوعات والمبالغ</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <p className="text-xs text-white/80 mb-1">إجمالي المبالغ</p>
              <p className="text-2xl font-black">{summary.totalAmount.toLocaleString('ar-SA')}</p>
              <p className="text-xs text-white/80">ريال سعودي</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <p className="text-xs text-white/80 mb-1">المبالغ المدفوعة</p>
              <p className="text-2xl font-black">{summary.approvedAmount.toLocaleString('ar-SA')}</p>
              <p className="text-xs text-white/80">ريال سعودي</p>
            </div>
          </div>
        </div>

        {/* بيانات الحساب البنكي */}
        {bankAccount && (
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border-2 border-blue-200 p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h4 className="font-black text-gray-900 text-sm">بيانات الحساب البنكي</h4>
                <p className="text-xs text-gray-600">للتحويل البنكي المباشر</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="bg-white rounded-lg p-3 border border-blue-100">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs text-gray-600 mb-1">اسم البنك</p>
                    <p className="text-sm font-black text-gray-900">{bankAccount.bank_name}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-3 border border-blue-100">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs text-gray-600 mb-1">اسم الحساب</p>
                    <p className="text-sm font-black text-gray-900">{bankAccount.account_name}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-3 border border-blue-100">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-xs text-gray-600 mb-1">رقم الحساب</p>
                    <p className="text-sm font-black text-gray-900 font-mono">{bankAccount.account_number}</p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(bankAccount.account_number, 'account')}
                    className="bg-blue-100 hover:bg-blue-200 text-blue-600 p-2 rounded-lg transition-colors"
                  >
                    {copiedField === 'account' ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-lg p-3 border border-blue-100">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-xs text-gray-600 mb-1">رقم الآيبان (IBAN)</p>
                    <p className="text-sm font-black text-gray-900 font-mono">{bankAccount.iban}</p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(bankAccount.iban, 'iban')}
                    className="bg-blue-100 hover:bg-blue-200 text-blue-600 p-2 rounded-lg transition-colors"
                  >
                    {copiedField === 'iban' ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* بطاقات طرق الدفع الإلكترونية */}
        {getVisibleGateways().length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <Wallet className="w-5 h-5 text-purple-600" />
              <h4 className="font-black text-gray-900 text-sm">طرق الدفع الإلكترونية</h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {getVisibleGateways()
                .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
                .map((gateway) => {
                  const isActive = gateway.visibility_status === 'visible';
                  const isDisabled = gateway.visibility_status === 'disabled_visible';

                  const getGatewayIcon = () => {
                    if (gateway.code === 'mada' || gateway.code === 'cards') return CreditCard;
                    if (gateway.code === 'tabby' || gateway.code === 'tamara') return Wallet;
                    return Smartphone;
                  };

                  const Icon = getGatewayIcon();

                  const getGatewayColor = () => {
                    if (!isActive) return {
                      gradient: 'from-gray-200 to-gray-300',
                      iconBg: 'bg-gray-100',
                      iconText: 'text-gray-500',
                      border: 'border-gray-300'
                    };
                    if (gateway.type === 'bnpl') return {
                      gradient: 'from-orange-500 to-amber-600',
                      iconBg: 'bg-white/20',
                      iconText: 'text-white',
                      border: 'border-orange-400'
                    };
                    return {
                      gradient: 'from-blue-500 to-cyan-600',
                      iconBg: 'bg-white/20',
                      iconText: 'text-white',
                      border: 'border-blue-400'
                    };
                  };

                  const colors = getGatewayColor();

                  return (
                    <div
                      key={gateway.id}
                      className={`bg-gradient-to-br ${colors.gradient} rounded-xl p-4 border-2 ${colors.border} shadow-lg ${
                        !isActive ? 'opacity-60' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-10 h-10 ${colors.iconBg} rounded-lg flex items-center justify-center`}>
                          <Icon className={`w-5 h-5 ${colors.iconText}`} />
                        </div>
                        <div className="flex-1">
                          <h5 className={`font-black text-sm ${isActive ? 'text-white' : 'text-gray-700'}`}>
                            {gateway.name_ar}
                          </h5>
                          <p className={`text-xs ${isActive ? 'text-white/80' : 'text-gray-600'}`}>
                            {gateway.type === 'bnpl' ? 'دفع بالتقسيط' : 'دفع فوري'}
                          </p>
                        </div>
                      </div>

                      {isDisabled && (
                        <div className="bg-white/90 rounded-lg p-3 border border-amber-300">
                          <p className="text-xs text-amber-900 text-center font-bold leading-relaxed">
                            {gateway.disabled_message || 'سيتم تفعيل هذه الطريقة قريباً بعد الربط الرسمي'}
                          </p>
                        </div>
                      )}

                      {isActive && (
                        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                          <p className="text-xs text-white/90 text-center font-bold">
                            جاهزة للاستخدام
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* قسم الفواتير */}
        {loadingInvoices ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          </div>
        ) : invoices.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <h4 className="font-black text-gray-900 text-sm">فواتير الاستثمار</h4>
              </div>
              <span className="text-xs text-gray-500 font-bold">
                {invoices.length} فاتورة
              </span>
            </div>

            {invoices.map((invoice) => {
              const statusInfo = getInvoiceStatus(invoice.status);
              const StatusIcon = statusInfo.icon;

              return (
                <div
                  key={invoice.id}
                  className={`bg-white rounded-xl border-2 ${statusInfo.border} p-4 hover:shadow-md transition-all`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h5 className="font-black text-blue-600 text-sm mb-1">
                        {invoice.invoice_number}
                      </h5>
                      <p className="text-xs text-gray-600">
                        تاريخ الإصدار: {new Date(invoice.issued_at).toLocaleDateString('ar-SA')}
                      </p>
                    </div>
                    <div className={`${statusInfo.bg} px-3 py-1.5 rounded-lg flex items-center gap-1.5 ${statusInfo.border} border`}>
                      <StatusIcon className={`w-3.5 h-3.5 ${statusInfo.color}`} />
                      <span className={`text-xs font-bold ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3 mb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-gray-600" />
                        <span className="text-xs text-gray-600 font-bold">المبلغ المطلوب</span>
                      </div>
                      <span className="text-lg font-black text-gray-900">
                        {Number(invoice.total_amount).toLocaleString('ar-SA')} ر.س
                      </span>
                    </div>
                  </div>

                  {invoice.payment_method && (
                    <div className="bg-blue-50 rounded-lg p-3 mb-3">
                      <div className="flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-blue-600" />
                        <span className="text-xs text-blue-600 font-bold">
                          طريقة الدفع: {getPaymentMethodName(invoice.payment_method)}
                        </span>
                      </div>
                    </div>
                  )}

                  {invoice.notes && (
                    <div className="bg-gray-50 rounded-lg p-3 mb-3">
                      <p className="text-xs text-gray-700">{invoice.notes}</p>
                    </div>
                  )}

                  {invoice.status === 'issued_pending_payment' && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
                      <p className="text-xs text-blue-900 flex items-center gap-2 font-bold">
                        <Clock className="w-3.5 h-3.5" />
                        يرجى سداد الفاتورة عبر التحويل البنكي ثم رفع الإيصال
                      </p>
                    </div>
                  )}

                  {invoice.status === 'paid' && invoice.paid_at && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mt-3">
                      <p className="text-xs text-emerald-900 flex items-center gap-2 font-bold">
                        <CheckCircle className="w-3.5 h-3.5" />
                        تم السداد في: {new Date(invoice.paid_at).toLocaleDateString('ar-SA')}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2 mt-3">
                    <button className="flex-1 bg-blue-100 hover:bg-blue-200 text-blue-700 font-bold py-2 px-4 rounded-lg transition-colors text-xs flex items-center justify-center gap-2">
                      <Printer className="w-3.5 h-3.5" />
                      طباعة
                    </button>
                    <button className="flex-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-bold py-2 px-4 rounded-lg transition-colors text-xs flex items-center justify-center gap-2">
                      <Download className="w-3.5 h-3.5" />
                      تحميل PDF
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        {/* Stats Cards - Filters */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setActiveFilter('all')}
            className={`bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border-2 transition-all hover:shadow-md ${
              activeFilter === 'all' ? 'border-blue-500 ring-2 ring-blue-300' : 'border-blue-100'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span className="text-xs text-blue-600 font-bold">جميع المعاملات</span>
            </div>
            <p className="text-2xl font-black text-gray-900">{summary.totalRequestsCount}</p>
            <p className="text-xs text-gray-600 mt-1">معاملة</p>
          </button>

          <button
            onClick={() => setActiveFilter('paid')}
            className={`bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-4 border-2 transition-all hover:shadow-md ${
              activeFilter === 'paid' ? 'border-emerald-500 ring-2 ring-emerald-300' : 'border-emerald-100'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span className="text-xs text-emerald-600 font-bold">مدفوع</span>
            </div>
            <p className="text-2xl font-black text-gray-900">{summary.approvedCount}</p>
            <p className="text-xs text-gray-600 mt-1">
              {summary.approvedAmount.toLocaleString('ar-SA')} ر.س
            </p>
          </button>

          <button
            onClick={() => setActiveFilter('under_review')}
            className={`bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border-2 transition-all hover:shadow-md ${
              activeFilter === 'under_review' ? 'border-amber-500 ring-2 ring-amber-300' : 'border-amber-100'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <span className="text-xs text-amber-600 font-bold">قيد المراجعة</span>
            </div>
            <p className="text-2xl font-black text-gray-900">{summary.pendingReviewCount}</p>
            <p className="text-xs text-gray-600 mt-1">معاملة</p>
          </button>

          <button
            onClick={() => setActiveFilter('pending')}
            className={`bg-gradient-to-br from-red-50 to-rose-50 rounded-xl p-4 border-2 transition-all hover:shadow-md ${
              activeFilter === 'pending' ? 'border-red-500 ring-2 ring-red-300' : 'border-red-100'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span className="text-xs text-red-600 font-bold">في انتظار الدفع</span>
            </div>
            <p className="text-2xl font-black text-gray-900">{summary.pendingPaymentCount}</p>
            <p className="text-xs text-gray-600 mt-1">معاملة</p>
          </button>
        </div>

        {/* Payment Requests List */}
        {loadingRequests ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-500"></div>
          </div>
        ) : filteredRequests.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h4 className="font-black text-gray-900 text-sm">
                {activeFilter === 'all' && 'جميع المعاملات المالية'}
                {activeFilter === 'paid' && 'المعاملات المدفوعة'}
                {activeFilter === 'under_review' && 'المعاملات قيد المراجعة'}
                {activeFilter === 'pending' && 'المعاملات في انتظار الدفع'}
              </h4>
              <span className="text-xs text-gray-500 font-bold">
                {filteredRequests.length} معاملة
              </span>
            </div>

            {filteredRequests.map((request) => {
              const statusInfo = getPaymentStatus(request.status);
              const StatusIcon = statusInfo.icon;
              const needsPayment = ['payment_open', 'receipt_rejected'].includes(request.status);
              const isPaid = ['receipt_approved', 'contract_issued', 'transferred_to_operations', 'payment_confirmed'].includes(request.status);

              return (
                <div
                  key={request.id}
                  className={`bg-white rounded-xl border-2 ${statusInfo.border} p-4 hover:shadow-md transition-all`}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h5 className="font-black text-gray-900 text-sm mb-1">
                        {request.tree_type}
                      </h5>
                      <p className="text-xs text-gray-600">
                        {request.number_of_trees} شجرة
                      </p>
                    </div>
                    <div className={`${statusInfo.bg} px-3 py-1.5 rounded-lg flex items-center gap-1.5 ${statusInfo.border} border`}>
                      <StatusIcon className={`w-3.5 h-3.5 ${statusInfo.color}`} />
                      <span className={`text-xs font-bold ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                  </div>

                  {/* المبلغ */}
                  <div className="bg-gray-50 rounded-lg p-3 mb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-gray-600" />
                        <span className="text-xs text-gray-600 font-bold">المبلغ الإجمالي</span>
                      </div>
                      <span className="text-lg font-black text-gray-900">
                        {request.total_amount.toLocaleString('ar-SA')} ر.س
                      </span>
                    </div>
                  </div>

                  {/* تاريخ الطلب */}
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>تاريخ الطلب: {new Date(request.created_at).toLocaleDateString('ar-SA')}</span>
                  </div>

                  {/* شريط الحالة */}
                  {getStatusProgress(statusInfo.step)}

                  {/* زر رفع الإيصال للتحويل البنكي */}
                  {needsPayment && (
                    <button
                      onClick={() => handleBankTransferUpload(request)}
                      className="w-full mt-4 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold py-3 px-4 rounded-lg transition-all shadow-sm text-sm flex items-center justify-center gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      رفع إيصال التحويل البنكي
                    </button>
                  )}

                  {/* رسائل الحالة */}
                  {['receipt_uploaded', 'receipt_under_review', 'payment_pending_verification'].includes(request.status) && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-4">
                      <p className="text-xs text-amber-900 flex items-center gap-2 font-bold">
                        <Clock className="w-3.5 h-3.5" />
                        مدفوع مؤقتاً - قيد المراجعة من قبل الإدارة المالية
                      </p>
                    </div>
                  )}

                  {isPaid && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mt-4">
                      <p className="text-xs text-emerald-900 flex items-center gap-2 font-bold">
                        <CheckCircle className="w-3.5 h-3.5" />
                        تم اعتماد الدفع - سيتم إصدار العقد قريباً
                      </p>
                    </div>
                  )}

                  {request.status === 'receipt_rejected' && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-4">
                      <p className="text-xs text-red-900 flex items-center gap-2 font-bold">
                        <XCircle className="w-3.5 h-3.5" />
                        تم رفض إثبات السداد - يرجى رفع إثبات صحيح
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-xl border-2 border-gray-200 p-8 text-center">
            <DollarSign className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500 font-bold">
              {activeFilter === 'all' && 'لا توجد معاملات مالية'}
              {activeFilter === 'paid' && 'لا توجد معاملات مدفوعة'}
              {activeFilter === 'under_review' && 'لا توجد معاملات قيد المراجعة'}
              {activeFilter === 'pending' && 'لا توجد معاملات في انتظار الدفع'}
            </p>
          </div>
        )}

        {/* معلومات مهمة */}
        <div className="bg-white border-2 border-gray-200 rounded-xl p-4">
          <h4 className="font-bold text-gray-900 mb-3 text-sm">معلومات مهمة</h4>
          <ul className="space-y-2 text-xs text-gray-600">
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 mt-0.5">•</span>
              <span>التحويل البنكي هو الطريقة المتاحة حالياً - قم برفع الإيصال بعد التحويل</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 mt-0.5">•</span>
              <span>طرق الدفع الإلكترونية (مدى، STC Pay) جاهزة برمجياً وسيتم تفعيلها لاحقاً</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 mt-0.5">•</span>
              <span>التحويل البنكي يتم مراجعته خلال 24 ساعة من رفع الإيصال</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 mt-0.5">•</span>
              <span>لن يتم إصدار العقد إلا بعد موافقة الإدارة المالية على إثبات السداد</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 mt-0.5">•</span>
              <span>يمكنك متابعة حالة الدفع من خلال شريط التقدم أعلاه</span>
            </li>
          </ul>
        </div>
      </div>

      {showUploadModal && selectedRequest && (
        <UploadPaymentDocumentModal
          isOpen={showUploadModal}
          onClose={() => {
            setShowUploadModal(false);
            setSelectedRequest(null);
          }}
          onSuccess={() => {
            // إعادة تحميل البيانات فوراً عند النجاح
            loadPaymentRequests();
            loadInvoices();
            refresh();
          }}
          investorPhone={account.contact_phone}
          investorName={account.contact_name}
          salesRequestId={selectedRequest.id}
        />
      )}
    </>
  );
}
