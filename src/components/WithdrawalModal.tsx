import { useState } from 'react';
import { X, TrendingDown, AlertCircle, DollarSign } from 'lucide-react';

interface WithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWithdraw: (amount: number, bankAccount: string) => Promise<void>;
  maxAmount: number;
}

export function WithdrawalModal({ isOpen, onClose, onWithdraw, maxAmount }: WithdrawalModalProps) {
  const [amount, setAmount] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);

    if (isNaN(numAmount) || numAmount <= 0) {
      alert('الرجاء إدخال مبلغ صحيح');
      return;
    }

    if (numAmount > maxAmount) {
      alert(`لا يمكن سحب أكثر من ${maxAmount.toFixed(2)} ريال`);
      return;
    }

    if (!bankAccount || bankAccount.length < 10) {
      alert('الرجاء إدخال رقم حساب بنكي صحيح (IBAN)');
      return;
    }

    setLoading(true);
    try {
      await onWithdraw(numAmount, bankAccount);
      setAmount('');
      setBankAccount('');
      onClose();
    } catch (error) {
      console.error('Error withdrawing:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickAmounts = [100, 250, 500, 1000];
  const filteredQuickAmounts = quickAmounts.filter(a => a <= maxAmount);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" dir="rtl">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-amber-600 to-amber-700 p-6 flex items-center justify-between rounded-t-3xl">
          <h3 className="text-2xl font-bold text-white flex items-center gap-2">
            <TrendingDown className="w-7 h-7" />
            سحب الأرباح
          </h3>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 p-2 rounded-full transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-bold mb-1">ملاحظات مهمة:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>الحد الأدنى للسحب: 100 ريال</li>
                <li>مدة التحويل: 1-3 أيام عمل</li>
                <li>رقم الحساب يجب أن يكون IBAN سعودي</li>
              </ul>
            </div>
          </div>

          <div>
            <label className="block text-gray-700 font-bold mb-2">
              الرصيد المتاح للسحب
            </label>
            <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-green-700">
                {maxAmount.toFixed(2)} ريال
              </div>
            </div>
          </div>

          <div>
            <label className="block text-gray-700 font-bold mb-3 text-lg">
              المبلغ المراد سحبه
            </label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent text-2xl font-bold text-gray-800 text-center"
                step="0.01"
                min="100"
                max={maxAmount}
                required
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-lg">
                ريال
              </span>
            </div>
          </div>

          {filteredQuickAmounts.length > 0 && (
            <div>
              <label className="block text-gray-700 font-bold mb-3 text-sm">
                المبالغ السريعة
              </label>
              <div className="grid grid-cols-3 gap-2">
                {filteredQuickAmounts.map((quickAmount) => (
                  <button
                    key={quickAmount}
                    type="button"
                    onClick={() => setAmount(quickAmount.toString())}
                    className="py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg font-bold text-sm transition-all border-2 border-transparent hover:border-amber-300"
                  >
                    {quickAmount} ر.س
                  </button>
                ))}
                {maxAmount >= 100 && (
                  <button
                    type="button"
                    onClick={() => setAmount(maxAmount.toString())}
                    className="py-2 px-3 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg font-bold text-sm transition-all border-2 border-transparent hover:border-amber-400"
                  >
                    الكل
                  </button>
                )}
              </div>
            </div>
          )}

          <div>
            <label className="block text-gray-700 font-bold mb-3 text-lg">
              رقم الحساب البنكي (IBAN)
            </label>
            <input
              type="text"
              value={bankAccount}
              onChange={(e) => setBankAccount(e.target.value)}
              placeholder="SA00 0000 0000 0000 0000 0000"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent font-mono text-gray-800"
              minLength={10}
              required
            />
            <p className="text-xs text-gray-500 mt-2">
              أدخل رقم IBAN الخاص بحسابك البنكي السعودي
            </p>
          </div>

          <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-600 font-medium">المبلغ:</span>
              <span className="text-gray-800 font-bold text-lg">
                {amount || '0.00'} ريال
              </span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-600 font-medium">رسوم التحويل:</span>
              <span className="text-gray-800 font-bold">مجانًا</span>
            </div>
            <div className="border-t-2 border-amber-200 pt-2 mt-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-700 font-bold text-lg">الإجمالي:</span>
                <span className="text-amber-700 font-bold text-2xl">
                  {amount || '0.00'} ريال
                </span>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !amount || !bankAccount}
            className="w-full bg-gradient-to-r from-amber-600 to-amber-700 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                جاري المعالجة...
              </>
            ) : (
              <>
                <DollarSign className="w-5 h-5" />
                تأكيد السحب
              </>
            )}
          </button>

          <p className="text-xs text-gray-500 text-center leading-relaxed">
            سيتم تحويل المبلغ إلى حسابك البنكي خلال 1-3 أيام عمل.
            تأكد من صحة رقم الحساب قبل التأكيد.
          </p>
        </form>
      </div>
    </div>
  );
}
