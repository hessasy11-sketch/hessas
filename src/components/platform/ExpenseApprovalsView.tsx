import { useState, useEffect } from 'react';
import {
  DollarSign,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Calendar,
  User,
  FileText,
  TrendingUp,
  Loader2,
  RefreshCw,
  Link2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { adminSessionManager } from '../../utils/adminSessionManager';

interface PendingExpense {
  id: string;
  farm_id: string;
  entry_type: string;
  category_name: string;
  amount: number;
  entry_date: string;
  description: string | null;
  notes: string | null;
  created_by_name: string;
  task_id: string | null;
  task_title: string | null;
  created_at: string;
}

interface ExpenseStats {
  total_pending: number;
  total_amount: number;
  max_amount: number;
  oldest_date: string;
}

export default function ExpenseApprovalsView() {
  const [expenses, setExpenses] = useState<PendingExpense[]>([]);
  const [stats, setStats] = useState<ExpenseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const [expensesRes, statsRes] = await Promise.all([
        supabase.rpc('get_pending_expenses', { p_farm_id: null }),
        supabase.rpc('get_pending_expenses_stats')
      ]);

      if (expensesRes.error) throw expensesRes.error;
      if (statsRes.error) throw statsRes.error;

      setExpenses(expensesRes.data || []);
      setStats(statsRes.data || null);
    } catch (error: any) {
      console.error('Error loading pending expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (expenseId: string) => {
    if (!confirm('هل أنت متأكد من اعتماد هذا المصروف؟')) return;

    setActionLoading(expenseId);
    try {
      // Get staff info from session
      const session = adminSessionManager.getSession();
      if (!session?.staff_id) {
        throw new Error('الجلسة غير صالحة. الرجاء تسجيل الدخول مرة أخرى');
      }

      // Get staff data from database
      const { data: staffData } = await supabase
        .from('platform_staff')
        .select('id, full_name')
        .eq('id', session.staff_id)
        .maybeSingle();

      if (!staffData) {
        throw new Error('لم يتم العثور على بيانات الموظف');
      }

      const { data, error } = await supabase.rpc('approve_expense', {
        p_entry_id: expenseId,
        p_approver_id: staffData.id,
        p_approver_name: staffData.full_name
      });

      if (error) throw error;

      if (data?.success) {
        alert('تم اعتماد المصروف بنجاح');
        loadData();
      } else {
        throw new Error(data?.error || 'فشل في اعتماد المصروف');
      }
    } catch (error: any) {
      console.error('Error approving expense:', error);
      alert('حدث خطأ: ' + error.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (expenseId: string) => {
    const reason = prompt('الرجاء إدخال سبب الرفض:');
    if (!reason || reason.trim() === '') {
      alert('يجب إدخال سبب الرفض');
      return;
    }

    setActionLoading(expenseId);
    try {
      // Get staff info from session
      const session = adminSessionManager.getSession();
      if (!session?.staff_id) {
        throw new Error('الجلسة غير صالحة. الرجاء تسجيل الدخول مرة أخرى');
      }

      // Get staff data from database
      const { data: staffData } = await supabase
        .from('platform_staff')
        .select('id, full_name')
        .eq('id', session.staff_id)
        .maybeSingle();

      if (!staffData) {
        throw new Error('لم يتم العثور على بيانات الموظف');
      }

      const { data, error } = await supabase.rpc('reject_expense', {
        p_entry_id: expenseId,
        p_rejector_id: staffData.id,
        p_rejector_name: staffData.full_name,
        p_reason: reason.trim()
      });

      if (error) throw error;

      if (data?.success) {
        alert('تم رفض المصروف');
        loadData();
      } else {
        throw new Error(data?.error || 'فشل في رفض المصروف');
      }
    } catch (error: any) {
      console.error('Error rejecting expense:', error);
      alert('حدث خطأ: ' + error.message);
    } finally {
      setActionLoading(null);
    }
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

  const getTimeSince = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `منذ ${diffDays} ${diffDays === 1 ? 'يوم' : 'أيام'}`;
    } else if (diffHours > 0) {
      return `منذ ${diffHours} ${diffHours === 1 ? 'ساعة' : 'ساعات'}`;
    } else {
      return 'الآن';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Stats */}
      <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-6 border border-orange-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              اعتمادات المصروفات المالية
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              المصروفات فوق 500 ريال تحتاج اعتماد
            </p>
          </div>
          <button
            onClick={loadData}
            className="p-2 hover:bg-white rounded-lg transition-colors"
          >
            <RefreshCw className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 border border-orange-100">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-orange-600" />
                <span className="text-xs text-gray-600 font-medium">
                  بانتظار الاعتماد
                </span>
              </div>
              <p className="text-2xl font-bold text-orange-600">
                {stats.total_pending}
              </p>
              <p className="text-xs text-gray-500 mt-1">مصروف</p>
            </div>

            <div className="bg-white rounded-lg p-4 border border-red-100">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-red-600" />
                <span className="text-xs text-gray-600 font-medium">
                  المبلغ الإجمالي
                </span>
              </div>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(stats.total_amount)}
              </p>
              <p className="text-xs text-gray-500 mt-1">معلق</p>
            </div>

            <div className="bg-white rounded-lg p-4 border border-purple-100">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-purple-600" />
                <span className="text-xs text-gray-600 font-medium">
                  أعلى مبلغ
                </span>
              </div>
              <p className="text-2xl font-bold text-purple-600">
                {formatCurrency(stats.max_amount)}
              </p>
              <p className="text-xs text-gray-500 mt-1">مصروف واحد</p>
            </div>

            <div className="bg-white rounded-lg p-4 border border-gray-100">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-gray-600" />
                <span className="text-xs text-gray-600 font-medium">
                  أقدم طلب
                </span>
              </div>
              <p className="text-sm font-bold text-gray-900 mt-2">
                {stats.oldest_date
                  ? getTimeSince(stats.oldest_date)
                  : 'لا يوجد'}
              </p>
              <p className="text-xs text-gray-500 mt-1">في الانتظار</p>
            </div>
          </div>
        )}
      </div>

      {/* Expenses List */}
      <div className="bg-white rounded-xl border border-gray-200">
        {expenses.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle2 className="w-12 h-12 text-green-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">
              لا توجد مصروفات بانتظار الاعتماد
            </p>
            <p className="text-sm text-gray-400 mt-1">
              جميع المصروفات معتمدة
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {expenses.map((expense) => (
              <div
                key={expense.id}
                className="p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="w-14 h-14 rounded-xl bg-orange-50 border-2 border-orange-200 flex items-center justify-center flex-shrink-0">
                    <DollarSign className="w-7 h-7 text-orange-600" />
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-bold text-gray-900 text-lg">
                          {expense.category_name}
                        </h4>
                        {expense.description && (
                          <p className="text-sm text-gray-600 mt-1">
                            {expense.description}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-red-600">
                          {formatCurrency(expense.amount)}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-orange-600 font-medium mt-1">
                          <Clock className="w-3 h-3" />
                          {getTimeSince(expense.created_at)}
                        </div>
                      </div>
                    </div>

                    {/* Task Link */}
                    {expense.task_id && expense.task_title && (
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
                          <Link2 className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-700">
                            مرتبط بمهمة:
                          </span>
                          <span className="text-sm text-blue-900">
                            {expense.task_title}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Meta Info */}
                    <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(expense.entry_date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {expense.created_by_name}
                      </span>
                    </div>

                    {/* Notes */}
                    {expense.notes && (
                      <div className="bg-gray-50 rounded-lg p-3 mb-3">
                        <div className="flex items-start gap-2">
                          <FileText className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-gray-600">
                            {expense.notes}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleApprove(expense.id)}
                        disabled={actionLoading === expense.id}
                        className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition-colors disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        اعتماد
                      </button>
                      <button
                        onClick={() => handleReject(expense.id)}
                        disabled={actionLoading === expense.id}
                        className="flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition-colors disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4" />
                        رفض
                      </button>
                      {actionLoading === expense.id && (
                        <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
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
  );
}
