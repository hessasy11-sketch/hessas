import { useState, useEffect } from 'react';
import {
  Plus,
  TrendingDown,
  TrendingUp,
  Calendar,
  DollarSign,
  FileText,
  Loader2,
  Filter,
  Download,
  Upload,
  Fuel,
  Wrench,
  Users,
  Droplet,
  Leaf,
  Wheat,
  Truck,
  HardHat,
  Zap,
  Package,
  Gift,
  RefreshCw
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface LedgerEntry {
  id: string;
  entry_type: 'expense' | 'income';
  category_name: string;
  amount: number;
  entry_date: string;
  description: string | null;
  notes: string | null;
  created_by_name: string;
  created_at: string;
}

interface LedgerCategory {
  id: string;
  name_ar: string;
  type: 'expense' | 'income';
  icon: string;
  color: string;
}

interface MonthlySummary {
  month: number;
  year: number;
  total_expenses: number;
  total_income: number;
  net_balance: number;
  expense_count: number;
  income_count: number;
  total_entries: number;
}

interface Props {
  farmId: string;
}

export default function FinancialLedgerTab({ farmId }: Props) {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [categories, setCategories] = useState<LedgerCategory[]>([]);
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary | null>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'expense' | 'income'>('all');

  const [formData, setFormData] = useState({
    entry_type: 'expense' as 'expense' | 'income',
    category_id: '',
    amount: '',
    entry_date: new Date().toISOString().split('T')[0],
    description: '',
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, [farmId, filterType]);

  const loadData = async () => {
    try {
      setLoading(true);

      const [entriesRes, categoriesRes, summaryRes] = await Promise.all([
        supabase.rpc('get_farm_ledger', {
          p_farm_id: farmId,
          p_entry_type: filterType === 'all' ? null : filterType,
          p_limit: 100
        }),
        supabase.rpc('get_ledger_categories'),
        supabase.rpc('get_ledger_monthly_summary', {
          p_farm_id: farmId
        })
      ]);

      if (entriesRes.error) throw entriesRes.error;
      if (categoriesRes.error) throw categoriesRes.error;
      if (summaryRes.error) throw summaryRes.error;

      setEntries(entriesRes.data || []);
      setCategories(categoriesRes.data || []);
      setMonthlySummary(summaryRes.data || null);
    } catch (error: any) {
      console.error('Error loading ledger:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.category_id || !formData.amount) {
      alert('الرجاء ملء جميع الحقول المطلوبة');
      return;
    }

    try {
      setSubmitting(true);

      const { data, error } = await supabase.rpc('add_ledger_entry', {
        p_farm_id: farmId,
        p_entry_type: formData.entry_type,
        p_category_id: formData.category_id,
        p_amount: parseFloat(formData.amount),
        p_entry_date: formData.entry_date,
        p_description: formData.description || null,
        p_notes: formData.notes || null,
        p_created_by_name: 'مدير المزرعة'
      });

      if (error) throw error;

      if (data?.success) {
        setShowAddModal(false);
        setFormData({
          entry_type: 'expense',
          category_id: '',
          amount: '',
          entry_date: new Date().toISOString().split('T')[0],
          description: '',
          notes: ''
        });
        loadData();
      } else {
        throw new Error(data?.error || 'فشل في إضافة القيد');
      }
    } catch (error: any) {
      console.error('Error adding entry:', error);
      alert('حدث خطأ: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getIconComponent = (iconName: string) => {
    const icons: Record<string, any> = {
      Fuel, Wrench, Users, Droplet, Leaf, Wheat, Truck, HardHat, Zap,
      DollarSign, Package, Gift, TrendingUp, TrendingDown
    };
    return icons[iconName] || DollarSign;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const filteredCategories = categories.filter(c => c.type === formData.entry_type);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Summary */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900">الحاسبة المالية</h3>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            إضافة قيد
          </button>
        </div>

        {monthlySummary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 border border-red-100">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="w-4 h-4 text-red-600" />
                <span className="text-xs text-gray-600 font-medium">مصروفات الشهر</span>
              </div>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(monthlySummary.total_expenses)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {monthlySummary.expense_count} قيد
              </p>
            </div>

            <div className="bg-white rounded-lg p-4 border border-green-100">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-xs text-gray-600 font-medium">مداخيل الشهر</span>
              </div>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(monthlySummary.total_income)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {monthlySummary.income_count} قيد
              </p>
            </div>

            <div className="bg-white rounded-lg p-4 border border-blue-100">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-blue-600" />
                <span className="text-xs text-gray-600 font-medium">الصافي</span>
              </div>
              <p className={`text-2xl font-bold ${
                monthlySummary.net_balance >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrency(monthlySummary.net_balance)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {monthlySummary.net_balance >= 0 ? 'فائض' : 'عجز'}
              </p>
            </div>

            <div className="bg-white rounded-lg p-4 border border-gray-100">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-gray-600" />
                <span className="text-xs text-gray-600 font-medium">إجمالي القيود</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {monthlySummary.total_entries}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                شهر {monthlySummary.month}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setFilterType('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filterType === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          الكل ({entries.length})
        </button>
        <button
          onClick={() => setFilterType('expense')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filterType === 'expense'
              ? 'bg-red-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          مصروفات
        </button>
        <button
          onClick={() => setFilterType('income')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filterType === 'income'
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          مداخيل
        </button>
        <button
          onClick={loadData}
          className="mr-auto p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RefreshCw className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Entries List */}
      <div className="bg-white rounded-xl border border-gray-200">
        {entries.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">لا توجد قيود مالية</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {entries.map((entry) => {
              const Icon = getIconComponent(
                categories.find(c => c.name_ar === entry.category_name)?.icon || 'DollarSign'
              );
              const isExpense = entry.entry_type === 'expense';

              return (
                <div key={entry.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      isExpense ? 'bg-red-50' : 'bg-green-50'
                    }`}>
                      <Icon className={`w-6 h-6 ${
                        isExpense ? 'text-red-600' : 'text-green-600'
                      }`} />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-1">
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            {entry.category_name}
                          </h4>
                          {entry.description && (
                            <p className="text-sm text-gray-600 mt-0.5">
                              {entry.description}
                            </p>
                          )}
                        </div>
                        <div className="text-left">
                          <p className={`text-xl font-bold ${
                            isExpense ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {isExpense ? '-' : '+'} {formatCurrency(entry.amount)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(entry.entry_date)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {entry.created_by_name}
                        </span>
                      </div>

                      {entry.notes && (
                        <p className="text-sm text-gray-500 mt-2 bg-gray-50 rounded p-2">
                          {entry.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Entry Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              إضافة قيد مالي جديد
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  نوع العملية *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, entry_type: 'expense', category_id: '' })}
                    className={`p-3 rounded-lg border-2 transition-colors ${
                      formData.entry_type === 'expense'
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <TrendingDown className={`w-5 h-5 mx-auto mb-1 ${
                      formData.entry_type === 'expense' ? 'text-red-600' : 'text-gray-400'
                    }`} />
                    <p className="text-sm font-medium">مصروف</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, entry_type: 'income', category_id: '' })}
                    className={`p-3 rounded-lg border-2 transition-colors ${
                      formData.entry_type === 'income'
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <TrendingUp className={`w-5 h-5 mx-auto mb-1 ${
                      formData.entry_type === 'income' ? 'text-green-600' : 'text-gray-400'
                    }`} />
                    <p className="text-sm font-medium">مدخول</p>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  التصنيف *
                </label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                >
                  <option value="">اختر التصنيف</option>
                  {filteredCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name_ar}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  المبلغ (ريال) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  التاريخ *
                </label>
                <input
                  type="date"
                  value={formData.entry_date}
                  onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الوصف
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="وصف مختصر للعملية"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ملاحظات
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  rows={3}
                  placeholder="ملاحظات إضافية"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {submitting ? 'جاري الحفظ...' : 'حفظ القيد'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  disabled={submitting}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
