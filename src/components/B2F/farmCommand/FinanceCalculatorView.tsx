import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Loader2, Calendar } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface FinancialSummary {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
}

interface FinancialEntry {
  id: string;
  entry_type: 'revenue' | 'expense';
  amount: number;
  category: string;
  description: string;
  transaction_date: string;
}

export default function FinanceCalculatorView({ farmId }: { farmId: string }) {
  const [summary, setSummary] = useState<FinancialSummary>({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    profitMargin: 0
  });
  const [entries, setEntries] = useState<FinancialEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'revenue' | 'expense'>('all');

  useEffect(() => {
    loadFinancialData();
  }, [farmId, filter]);

  const loadFinancialData = async () => {
    try {
      let query = supabase
        .from('fc_financial_ledger')
        .select('*')
        .eq('farm_id', farmId)
        .order('transaction_date', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('entry_type', filter);
      }

      const { data, error } = await query;

      if (error) throw error;

      const entriesData = data || [];
      setEntries(entriesData);

      const revenue = entriesData
        .filter(e => e.entry_type === 'revenue')
        .reduce((sum, e) => sum + (e.amount || 0), 0);

      const expenses = entriesData
        .filter(e => e.entry_type === 'expense')
        .reduce((sum, e) => sum + (e.amount || 0), 0);

      const netProfit = revenue - expenses;
      const profitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

      setSummary({
        totalRevenue: revenue,
        totalExpenses: expenses,
        netProfit,
        profitMargin
      });
    } catch (error) {
      console.error('Error loading financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-green-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">الحاسبة المالية</h2>
        <p className="text-sm text-gray-600 mt-1">
          تتبع الإيرادات والمصروفات وحساب الأرباح
        </p>
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-6 h-6 opacity-80" />
            <DollarSign className="w-8 h-8 opacity-50" />
          </div>
          <div className="text-2xl font-bold mb-1">
            {formatCurrency(summary.totalRevenue)}
          </div>
          <p className="text-sm opacity-90">إجمالي الإيرادات</p>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-pink-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <TrendingDown className="w-6 h-6 opacity-80" />
            <DollarSign className="w-8 h-8 opacity-50" />
          </div>
          <div className="text-2xl font-bold mb-1">
            {formatCurrency(summary.totalExpenses)}
          </div>
          <p className="text-sm opacity-90">إجمالي المصروفات</p>
        </div>

        <div className={`bg-gradient-to-br ${
          summary.netProfit >= 0
            ? 'from-blue-500 to-cyan-600'
            : 'from-orange-500 to-red-600'
        } rounded-xl p-6 text-white`}>
          <div className="flex items-center justify-between mb-2">
            {summary.netProfit >= 0 ? (
              <TrendingUp className="w-6 h-6 opacity-80" />
            ) : (
              <TrendingDown className="w-6 h-6 opacity-80" />
            )}
            <DollarSign className="w-8 h-8 opacity-50" />
          </div>
          <div className="text-2xl font-bold mb-1">
            {formatCurrency(summary.netProfit)}
          </div>
          <p className="text-sm opacity-90">صافي الربح</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <div className="text-3xl font-bold">
              {summary.profitMargin.toFixed(1)}%
            </div>
          </div>
          <p className="text-sm opacity-90">هامش الربح</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {['all', 'revenue', 'expense'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {f === 'all' && 'الكل'}
              {f === 'revenue' && 'الإيرادات'}
              {f === 'expense' && 'المصروفات'}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions List */}
      {entries.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">لا توجد عمليات مالية</p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {entry.entry_type === 'revenue' ? (
                      <TrendingUp className="w-5 h-5 text-green-600" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-red-600" />
                    )}
                    <span
                      className={`text-xl font-bold ${
                        entry.entry_type === 'revenue' ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {formatCurrency(entry.amount)}
                    </span>
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                      {entry.category}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{entry.description}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Calendar className="w-4 h-4" />
                    {new Date(entry.transaction_date).toLocaleDateString('ar-SA')}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
