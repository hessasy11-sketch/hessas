import React, { useState, useEffect } from 'react';
import { Plus, TrendingUp, TrendingDown, DollarSign, Trash2, Edit2, Check, X, Calendar } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface FinancialEntry {
  id: string;
  farm_id: string;
  entry_type: 'income' | 'expense';
  amount: number;
  entry_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface FinanceCalculatorViewProps {
  farmId: string;
}

interface FinancialSummary {
  total_income: number;
  total_expense: number;
  balance: number;
  income_count: number;
  expense_count: number;
}

const FinanceCalculatorView: React.FC<FinanceCalculatorViewProps> = ({ farmId }) => {
  const [entries, setEntries] = useState<FinancialEntry[]>([]);
  const [summary, setSummary] = useState<FinancialSummary>({
    total_income: 0,
    total_expense: 0,
    balance: 0,
    income_count: 0,
    expense_count: 0
  });
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [formData, setFormData] = useState({
    entry_type: 'expense' as 'income' | 'expense',
    amount: '',
    entry_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  useEffect(() => {
    loadEntries();
    loadSummary();
  }, [farmId, filter]);

  const loadEntries = async () => {
    try {
      let query = supabase
        .from('farm_financial_entries')
        .select('*')
        .eq('farm_id', farmId);

      if (filter !== 'all') {
        query = query.eq('entry_type', filter);
      }

      const { data, error } = await query.order('entry_date', { ascending: false });

      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error('Error loading entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = async () => {
    try {
      const { data, error } = await supabase.rpc('get_farm_financial_summary', {
        p_farm_id: farmId
      });

      if (error) throw error;
      if (data) setSummary(data);
    } catch (error) {
      console.error('Error loading summary:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const amount = parseFloat(formData.amount);
      if (isNaN(amount) || amount <= 0) {
        alert('الرجاء إدخال مبلغ صحيح');
        return;
      }

      if (editingId) {
        const { error } = await supabase
          .from('farm_financial_entries')
          .update({
            entry_type: formData.entry_type,
            amount,
            entry_date: formData.entry_date,
            notes: formData.notes || null
          })
          .eq('id', editingId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('farm_financial_entries')
          .insert({
            farm_id: farmId,
            entry_type: formData.entry_type,
            amount,
            entry_date: formData.entry_date,
            notes: formData.notes || null
          });

        if (error) throw error;
      }

      setFormData({
        entry_type: 'expense',
        amount: '',
        entry_date: new Date().toISOString().split('T')[0],
        notes: ''
      });
      setShowAddModal(false);
      setEditingId(null);
      loadEntries();
      loadSummary();
    } catch (error) {
      console.error('Error saving entry:', error);
      alert('حدث خطأ في حفظ العملية');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه العملية؟')) return;

    try {
      const { error } = await supabase
        .from('farm_financial_entries')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadEntries();
      loadSummary();
    } catch (error) {
      console.error('Error deleting entry:', error);
      alert('حدث خطأ في حذف العملية');
    }
  };

  const startEdit = (item: FinancialEntry) => {
    setFormData({
      entry_type: item.entry_type,
      amount: item.amount.toString(),
      entry_date: item.entry_date,
      notes: item.notes || ''
    });
    setEditingId(item.id);
    setShowAddModal(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">جاري التحميل...</div>
      </div>
    );
  }

  const balanceClass = summary.balance >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200';
  const balanceIconClass = summary.balance >= 0 ? 'text-blue-600' : 'text-orange-600';
  const balanceTitleClass = summary.balance >= 0 ? 'text-blue-700' : 'text-orange-700';
  const balanceAmountClass = summary.balance >= 0 ? 'text-blue-900' : 'text-orange-900';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-green-50 rounded-lg border border-green-200 p-4">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <div className="text-sm text-green-700">إجمالي المدخولات</div>
          </div>
          <div className="text-2xl font-bold text-green-900">{formatCurrency(summary.total_income)}</div>
          <div className="text-xs text-green-600 mt-1">{summary.income_count} عملية</div>
        </div>

        <div className="bg-red-50 rounded-lg border border-red-200 p-4">
          <div className="flex items-center gap-3 mb-2">
            <TrendingDown className="w-5 h-5 text-red-600" />
            <div className="text-sm text-red-700">إجمالي المصروفات</div>
          </div>
          <div className="text-2xl font-bold text-red-900">{formatCurrency(summary.total_expense)}</div>
          <div className="text-xs text-red-600 mt-1">{summary.expense_count} عملية</div>
        </div>

        <div className={`${balanceClass} rounded-lg border p-4`}>
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className={`w-5 h-5 ${balanceIconClass}`} />
            <div className={`text-sm ${balanceTitleClass}`}>الرصيد</div>
          </div>
          <div className={`text-2xl font-bold ${balanceAmountClass}`}>
            {formatCurrency(summary.balance)}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <h3 className="text-lg font-bold text-gray-900">الحاسبة التشغيلية</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-lg text-sm font-semibold ${
                filter === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              الكل
            </button>
            <button
              onClick={() => setFilter('income')}
              className={`px-3 py-1 rounded-lg text-sm font-semibold ${
                filter === 'income' ? 'bg-green-600 text-white' : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
            >
              مدخول
            </button>
            <button
              onClick={() => setFilter('expense')}
              className={`px-3 py-1 rounded-lg text-sm font-semibold ${
                filter === 'expense' ? 'bg-red-600 text-white' : 'bg-red-100 text-red-700 hover:bg-red-200'
              }`}
            >
              مصروف
            </button>
          </div>
        </div>
        <button
          onClick={() => {
            setFormData({
              entry_type: 'expense',
              amount: '',
              entry_date: new Date().toISOString().split('T')[0],
              notes: ''
            });
            setEditingId(null);
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          تسجيل عملية
        </button>
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">لا توجد عمليات مالية مسجلة</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-4 text-blue-600 hover:text-blue-700 font-semibold"
          >
            تسجيل أول عملية
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${entry.entry_type === 'income' ? 'bg-green-100' : 'bg-red-100'}`}>
                    {entry.entry_type === 'income' ? (
                      <TrendingUp className="w-5 h-5 text-green-600" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className={`text-xl font-bold ${entry.entry_type === 'income' ? 'text-green-900' : 'text-red-900'}`}>
                        {formatCurrency(entry.amount)}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${entry.entry_type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {entry.entry_type === 'income' ? 'مدخول' : 'مصروف'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(entry.entry_date).toLocaleDateString('ar-SA')}
                      </div>
                      {entry.notes && <span>• {entry.notes}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => startEdit(entry)}
                    className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {editingId ? 'تعديل عملية مالية' : 'تسجيل عملية مالية جديدة'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  النوع *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, entry_type: 'income' })}
                    className={`p-3 rounded-lg border-2 font-semibold ${
                      formData.entry_type === 'income'
                        ? 'border-green-600 bg-green-50 text-green-900'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <TrendingUp className="w-5 h-5 mx-auto mb-1" />
                    مدخول
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, entry_type: 'expense' })}
                    className={`p-3 rounded-lg border-2 font-semibold ${
                      formData.entry_type === 'expense'
                        ? 'border-red-600 bg-red-50 text-red-900'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <TrendingDown className="w-5 h-5 mx-auto mb-1" />
                    مصروف
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  المبلغ * (ريال)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  التاريخ *
                </label>
                <input
                  type="date"
                  value={formData.entry_date}
                  onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  ملاحظات
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="أي تفاصيل إضافية..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                >
                  <Check className="w-4 h-4" />
                  {editingId ? 'حفظ التعديلات' : 'تسجيل'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingId(null);
                    setFormData({
                      entry_type: 'expense',
                      amount: '',
                      entry_date: new Date().toISOString().split('T')[0],
                      notes: ''
                    });
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold"
                >
                  <X className="w-4 h-4" />
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinanceCalculatorView;
