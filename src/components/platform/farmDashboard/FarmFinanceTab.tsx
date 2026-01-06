import { useState, useEffect } from 'react';
import { DollarSign, Plus, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface Expense {
  id: string;
  description: string;
  amount: number;
  expense_date: string;
  category: string;
  approval_status: string;
  approved_by_name?: string;
  created_by_name?: string;
}

interface FarmFinanceTabProps {
  farmId: string;
  canManage: boolean;
}

const FarmFinanceTab = ({ farmId, canManage }: FarmFinanceTabProps) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  useEffect(() => {
    loadExpenses();
  }, [farmId]);

  const loadExpenses = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('farm_expenses')
        .select('*')
        .eq('farm_id', farmId)
        .order('expense_date', { ascending: false });

      if (error) throw error;

      setExpenses(data || []);
    } catch (err: any) {
      console.error('Error loading expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR'
    }).format(amount);
  };

  const filteredExpenses = expenses.filter(expense => {
    if (filter === 'all') return true;
    return expense.approval_status === filter;
  });

  const stats = {
    total: expenses.reduce((sum, e) => sum + e.amount, 0),
    approved: expenses.filter(e => e.approval_status === 'approved').reduce((sum, e) => sum + e.amount, 0),
    pending: expenses.filter(e => e.approval_status === 'pending').length,
    thisMonth: expenses.filter(e => {
      const expenseDate = new Date(e.expense_date);
      const now = new Date();
      return expenseDate.getMonth() === now.getMonth() && expenseDate.getFullYear() === now.getFullYear();
    }).reduce((sum, e) => sum + e.amount, 0)
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">الحاسبة المالية</h2>
        {canManage && (
          <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2">
            <Plus className="w-4 h-4" />
            إضافة مصروف
          </button>
        )}
      </div>

      {/* Financial Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-gray-600" />
            <span className="text-sm text-gray-600">إجمالي المصروفات</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.total)}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-5 h-5 text-red-600" />
            <span className="text-sm text-gray-600">مصروف هذا الشهر</span>
          </div>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.thisMonth)}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <span className="text-sm text-gray-600">معتمد</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.approved)}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-orange-600" />
            <span className="text-sm text-gray-600">قيد الاعتماد</span>
          </div>
          <p className="text-2xl font-bold text-orange-600">{stats.pending}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'all'
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          الكل ({expenses.length})
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'pending'
              ? 'bg-orange-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          قيد الاعتماد ({stats.pending})
        </button>
        <button
          onClick={() => setFilter('approved')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'approved'
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          معتمد
        </button>
        <button
          onClick={() => setFilter('rejected')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'rejected'
              ? 'bg-red-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          مرفوض
        </button>
      </div>

      {/* Expenses List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-right px-4 py-3 text-sm font-semibold text-gray-700">الوصف</th>
              <th className="text-right px-4 py-3 text-sm font-semibold text-gray-700">الفئة</th>
              <th className="text-right px-4 py-3 text-sm font-semibold text-gray-700">المبلغ</th>
              <th className="text-right px-4 py-3 text-sm font-semibold text-gray-700">التاريخ</th>
              <th className="text-right px-4 py-3 text-sm font-semibold text-gray-700">الحالة</th>
              <th className="text-right px-4 py-3 text-sm font-semibold text-gray-700">أنشأ بواسطة</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredExpenses.map((expense) => (
              <tr key={expense.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-900">{expense.description}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{expense.category || '-'}</td>
                <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                  {formatCurrency(expense.amount)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {new Date(expense.expense_date).toLocaleDateString('ar-SA')}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded ${
                    expense.approval_status === 'approved' ? 'bg-green-100 text-green-700' :
                    expense.approval_status === 'pending' ? 'bg-orange-100 text-orange-700' :
                    expense.approval_status === 'rejected' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {expense.approval_status === 'approved' ? 'معتمد' :
                     expense.approval_status === 'pending' ? 'قيد الاعتماد' :
                     expense.approval_status === 'rejected' ? 'مرفوض' : expense.approval_status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{expense.created_by_name || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredExpenses.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            <DollarSign className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>لا توجد مصروفات {filter !== 'all' && `في حالة "${filter}"`}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FarmFinanceTab;
