import { useState, useEffect } from 'react';
import { ArrowRight, Wallet, Plus, TrendingDown, DollarSign, Receipt, Clock, CheckCircle, XCircle, AlertCircle, TrendingUp, RefreshCw, FileText, CreditCard } from 'lucide-react';
import { useWallet } from '../hooks/useWallet';
import { useAuth } from '../contexts/AuthContext';
import { DepositModal } from './DepositModal';
import { WithdrawalModal } from './WithdrawalModal';
import { EarningsDetailsModal } from './EarningsDetailsModal';

interface WalletViewProps {
  onBack: () => void;
}

export function WalletView({ onBack }: WalletViewProps) {
  const { user } = useAuth();
  const { wallet, transactions, commissions, loading, error, refetch, addTransaction, payCommission, fetchSoldAuctions } = useWallet();
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [withdrawalModalOpen, setWithdrawalModalOpen] = useState(false);
  const [earningsModalOpen, setEarningsModalOpen] = useState(false);
  const [soldAuctionsData, setSoldAuctionsData] = useState({ total: 0, count: 0 });
  const [processingCommissionId, setProcessingCommissionId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadSoldAuctions();
    }
  }, [user]);

  const loadSoldAuctions = async () => {
    const data = await fetchSoldAuctions();
    setSoldAuctionsData(data);
  };

  const handleDeposit = async (amount: number, method: string) => {
    const result = await addTransaction(
      'deposit',
      amount,
      `تعبئة محفظة عبر ${method === 'mada' ? 'مدى' : method === 'visa' ? 'فيزا' : 'Apple Pay'}`,
      `DEP-${Date.now()}`
    );

    if (result.success) {
      alert('تم شحن المحفظة بنجاح!');
    } else {
      alert(result.error || 'فشلت العملية');
    }
  };

  const handleWithdraw = async (amount: number, bankAccount: string) => {
    const result = await addTransaction(
      'withdrawal',
      amount,
      `سحب أرباح إلى حساب ${bankAccount.slice(-4)}`,
      `WTH-${Date.now()}`
    );

    if (result.success) {
      alert('تم طلب السحب بنجاح! سيتم التحويل خلال 1-3 أيام عمل.');
    } else {
      alert(result.error || 'فشلت العملية');
    }
  };

  const handlePayCommission = async (commissionId: string, amount: number) => {
    if (!confirm(`هل تريد دفع عمولة بقيمة ${amount.toFixed(2)} ريال؟`)) {
      return;
    }

    setProcessingCommissionId(commissionId);
    const result = await payCommission(commissionId, amount);
    setProcessingCommissionId(null);

    if (result.success) {
      alert('تم دفع العمولة بنجاح!');
    } else {
      alert(result.error || 'فشل دفع العمولة');
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return <Plus className="w-5 h-5" />;
      case 'withdrawal':
        return <TrendingDown className="w-5 h-5" />;
      case 'commission':
        return <Receipt className="w-5 h-5" />;
      case 'refund':
        return <AlertCircle className="w-5 h-5" />;
      default:
        return <DollarSign className="w-5 h-5" />;
    }
  };

  const getTransactionLabel = (type: string) => {
    switch (type) {
      case 'deposit':
        return 'تعبئة رصيد';
      case 'withdrawal':
        return 'سحب مبلغ';
      case 'commission':
        return 'دفع عمولة';
      case 'refund':
        return 'استرجاع مبلغ';
      default:
        return 'عملية مالية';
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'deposit':
        return 'bg-green-100 text-green-700';
      case 'withdrawal':
        return 'bg-red-100 text-red-700';
      case 'commission':
        return 'bg-amber-100 text-amber-700';
      case 'refund':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'مكتملة';
      case 'pending':
        return 'قيد الانتظار';
      case 'failed':
        return 'فاشلة';
      default:
        return status;
    }
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-green-50 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-green-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">جاري تحميل محفظتك...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-green-50" dir="rtl">
        <div className="bg-gradient-to-r from-green-600 to-green-700 p-4 flex items-center gap-3 shadow-lg">
          <button
            onClick={onBack}
            className="text-white hover:bg-white/20 p-2 rounded-full transition-all"
          >
            <ArrowRight className="w-6 h-6" />
          </button>
          <h2 className="text-xl font-bold text-white">محفظتي الزراعية</h2>
        </div>
        <div className="max-w-4xl mx-auto p-6">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
            <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <p className="text-red-800 font-medium mb-4">{error}</p>
            <button
              onClick={refetch}
              className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-all"
            >
              إعادة المحاولة
            </button>
          </div>
        </div>
      </div>
    );
  }

  const pendingCommissions = commissions.filter(c => c.status === 'pending');
  const totalPendingCommissions = pendingCommissions.reduce((sum, c) => sum + Number(c.amount), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-green-50" dir="rtl">
      <div className="bg-gradient-to-r from-green-600 to-green-700 p-4 flex items-center gap-3 shadow-lg">
        <button
          onClick={onBack}
          className="text-white hover:bg-white/20 p-2 rounded-full transition-all"
        >
          <ArrowRight className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-bold text-white flex-1">محفظتي الزراعية</h2>
        <button
          onClick={refetch}
          className="text-white hover:bg-white/20 p-2 rounded-full transition-all"
          title="تحديث"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6 pb-20">
        <div className="bg-gradient-to-br from-green-500 via-green-600 to-amber-500 rounded-3xl shadow-2xl p-6 md:p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full -ml-16 -mb-16"></div>
          <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-white/5 rounded-full"></div>

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <Wallet className="w-6 h-6" />
              <span className="text-sm opacity-90 font-medium">الرصيد الزراعي الحالي</span>
            </div>

            <div className="text-5xl md:text-6xl font-bold mb-8">
              {formatCurrency(wallet?.balance || 0)}
              <span className="text-2xl md:text-3xl mr-2">ريال</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setDepositModalOpen(true)}
                className="bg-white/20 backdrop-blur-sm hover:bg-white/30 py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                <Plus className="w-5 h-5" />
                تعبئة المحفظة
              </button>
              <button
                onClick={() => setWithdrawalModalOpen(true)}
                className="bg-white/20 backdrop-blur-sm hover:bg-white/30 py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                <TrendingDown className="w-5 h-5" />
                سحب الأرباح
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-green-100 hover:border-green-200 transition-all">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div className="text-sm text-gray-600 font-medium">إجمالي الأرباح الزراعية</div>
            </div>
            <div className="text-3xl font-bold text-green-700 mb-3">
              {formatCurrency(soldAuctionsData.total)}
              <span className="text-lg mr-2">ريال</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setEarningsModalOpen(true)}
                className="flex-1 bg-green-50 hover:bg-green-100 text-green-700 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1"
              >
                <FileText className="w-4 h-4" />
                عرض التفاصيل
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-amber-100 hover:border-amber-200 transition-all">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Receipt className="w-6 h-6 text-amber-600" />
              </div>
              <div className="text-sm text-gray-600 font-medium">العمولات المعلقة</div>
            </div>
            <div className="text-3xl font-bold text-amber-700">
              {formatCurrency(totalPendingCommissions)}
              <span className="text-lg mr-2">ريال</span>
            </div>
            <div className="text-xs text-gray-500 mt-2">
              {pendingCommissions.length} عمولة في الذمة
            </div>
          </div>
        </div>

        {pendingCommissions.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg border-2 border-amber-100 overflow-hidden">
            <div className="bg-gradient-to-r from-amber-50 to-amber-100 p-4 border-b-2 border-amber-200">
              <h3 className="font-bold text-gray-800 flex items-center gap-2 text-lg">
                <Receipt className="w-6 h-6 text-amber-600" />
                العمولات والمستحقات
              </h3>
              <p className="text-xs text-gray-600 mt-1">نسبة العمولة: 1% من قيمة البيع</p>
            </div>
            <div className="divide-y divide-gray-100">
              {pendingCommissions.map((commission) => (
                <div key={commission.id} className="p-4 hover:bg-amber-50/50 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-bold text-gray-800 mb-1">
                        عمولة مزاد ({commission.percentage}%)
                      </div>
                      <div className="text-xs text-gray-500 flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(commission.created_at)}
                        </span>
                      </div>
                    </div>
                    <div className="text-left mr-4">
                      <div className="font-bold text-amber-700 text-xl mb-2">
                        {formatCurrency(Number(commission.amount))} ريال
                      </div>
                      <button
                        onClick={() => handlePayCommission(commission.id, Number(commission.amount))}
                        disabled={processingCommissionId === commission.id}
                        className="text-xs bg-amber-500 text-white px-4 py-2 rounded-full hover:bg-amber-600 transition-all font-bold shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        {processingCommissionId === commission.id ? (
                          <>
                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            جاري الدفع...
                          </>
                        ) : (
                          <>
                            <CreditCard className="w-3 h-3" />
                            سدّد الآن
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-lg border-2 border-green-100 overflow-hidden">
          <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 border-b-2 border-green-200">
            <h3 className="font-bold text-gray-800 flex items-center gap-2 text-lg">
              <Clock className="w-6 h-6 text-green-600" />
              سجل العمليات المالية
            </h3>
            <p className="text-xs text-gray-600 mt-1">آخر {transactions.length} عملية</p>
          </div>

          {transactions.length === 0 ? (
            <div className="p-12 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-4">
                <DollarSign className="w-10 h-10 text-gray-300" />
              </div>
              <p className="text-gray-500 font-medium">لا توجد عمليات مالية بعد</p>
              <p className="text-sm text-gray-400 mt-2">ستظهر هنا جميع معاملاتك المالية</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl ${getTransactionColor(transaction.type)} flex-shrink-0`}>
                      {getTransactionIcon(transaction.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-4 mb-2">
                        <div>
                          <div className="font-bold text-gray-800 text-base">
                            {getTransactionLabel(transaction.type)}
                          </div>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {transaction.description}
                          </p>
                        </div>
                        <div className={`font-bold text-xl flex-shrink-0 ${
                          transaction.type === 'deposit' || transaction.type === 'refund'
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}>
                          {transaction.type === 'deposit' || transaction.type === 'refund' ? '+' : '-'}
                          {formatCurrency(Number(transaction.amount))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3 text-gray-500">
                          <span className="flex items-center gap-1">
                            {getStatusIcon(transaction.status)}
                            {getStatusLabel(transaction.status)}
                          </span>
                          <span>{formatDate(transaction.created_at)}</span>
                        </div>
                        {transaction.reference_id && (
                          <div className="text-gray-400 font-mono">
                            #{transaction.reference_id.slice(0, 8)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <DepositModal
        isOpen={depositModalOpen}
        onClose={() => setDepositModalOpen(false)}
        onDeposit={handleDeposit}
      />

      <WithdrawalModal
        isOpen={withdrawalModalOpen}
        onClose={() => setWithdrawalModalOpen(false)}
        onWithdraw={handleWithdraw}
        maxAmount={wallet?.balance || 0}
      />

      <EarningsDetailsModal
        isOpen={earningsModalOpen}
        onClose={() => setEarningsModalOpen(false)}
        userId={user?.id || ''}
      />
    </div>
  );
}
