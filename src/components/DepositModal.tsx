import { useState } from 'react';
import { X, CreditCard, Smartphone, DollarSign } from 'lucide-react';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeposit: (amount: number, method: string) => Promise<void>;
}

export function DepositModal({ isOpen, onClose, onDeposit }: DepositModalProps) {
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'mada' | 'visa' | 'apple_pay'>('mada');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);

    if (isNaN(numAmount) || numAmount <= 0) {
      alert('الرجاء إدخال مبلغ صحيح');
      return;
    }

    setLoading(true);
    try {
      await onDeposit(numAmount, paymentMethod);
      setAmount('');
      onClose();
    } catch (error) {
      console.error('Error depositing:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickAmounts = [100, 250, 500, 1000, 2000, 5000];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" dir="rtl">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-green-600 to-green-700 p-6 flex items-center justify-between rounded-t-3xl">
          <h3 className="text-2xl font-bold text-white flex items-center gap-2">
            <DollarSign className="w-7 h-7" />
            تعبئة المحفظة
          </h3>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 p-2 rounded-full transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-gray-700 font-bold mb-3 text-lg">
              المبلغ المراد تعبئته
            </label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent text-2xl font-bold text-gray-800 text-center"
                step="0.01"
                min="1"
                required
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-lg">
                ريال
              </span>
            </div>
          </div>

          <div>
            <label className="block text-gray-700 font-bold mb-3 text-sm">
              المبالغ السريعة
            </label>
            <div className="grid grid-cols-3 gap-2">
              {quickAmounts.map((quickAmount) => (
                <button
                  key={quickAmount}
                  type="button"
                  onClick={() => setAmount(quickAmount.toString())}
                  className="py-2 px-3 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg font-bold text-sm transition-all border-2 border-transparent hover:border-green-300"
                >
                  {quickAmount} ر.س
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-gray-700 font-bold mb-3 text-lg">
              طريقة الدفع
            </label>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('mada')}
                className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${
                  paymentMethod === 'mada'
                    ? 'border-green-500 bg-green-50 shadow-md'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  paymentMethod === 'mada' ? 'border-green-500' : 'border-gray-300'
                }`}>
                  {paymentMethod === 'mada' && (
                    <div className="w-3 h-3 bg-green-500 rounded-full" />
                  )}
                </div>
                <CreditCard className="w-6 h-6 text-gray-600" />
                <div className="flex-1 text-right">
                  <div className="font-bold text-gray-800">مدى</div>
                  <div className="text-xs text-gray-500">بطاقة مدى السعودية</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('visa')}
                className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${
                  paymentMethod === 'visa'
                    ? 'border-green-500 bg-green-50 shadow-md'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  paymentMethod === 'visa' ? 'border-green-500' : 'border-gray-300'
                }`}>
                  {paymentMethod === 'visa' && (
                    <div className="w-3 h-3 bg-green-500 rounded-full" />
                  )}
                </div>
                <CreditCard className="w-6 h-6 text-gray-600" />
                <div className="flex-1 text-right">
                  <div className="font-bold text-gray-800">فيزا / ماستركارد</div>
                  <div className="text-xs text-gray-500">بطاقات ائتمانية دولية</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('apple_pay')}
                className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${
                  paymentMethod === 'apple_pay'
                    ? 'border-green-500 bg-green-50 shadow-md'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  paymentMethod === 'apple_pay' ? 'border-green-500' : 'border-gray-300'
                }`}>
                  {paymentMethod === 'apple_pay' && (
                    <div className="w-3 h-3 bg-green-500 rounded-full" />
                  )}
                </div>
                <Smartphone className="w-6 h-6 text-gray-600" />
                <div className="flex-1 text-right">
                  <div className="font-bold text-gray-800">Apple Pay</div>
                  <div className="text-xs text-gray-500">الدفع عبر آبل</div>
                </div>
              </button>
            </div>
          </div>

          <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-600 font-medium">المبلغ:</span>
              <span className="text-gray-800 font-bold text-lg">
                {amount || '0.00'} ريال
              </span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-600 font-medium">رسوم المعاملة:</span>
              <span className="text-gray-800 font-bold">مجانًا</span>
            </div>
            <div className="border-t-2 border-green-200 pt-2 mt-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-700 font-bold text-lg">الإجمالي:</span>
                <span className="text-green-700 font-bold text-2xl">
                  {amount || '0.00'} ريال
                </span>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !amount}
            className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                جاري المعالجة...
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5" />
                تأكيد التعبئة
              </>
            )}
          </button>

          <p className="text-xs text-gray-500 text-center leading-relaxed">
            بالضغط على "تأكيد التعبئة"، أنت توافق على تحويل المبلغ المحدد إلى محفظتك الزراعية.
            العملية آمنة ومشفرة بالكامل.
          </p>
        </form>
      </div>
    </div>
  );
}
