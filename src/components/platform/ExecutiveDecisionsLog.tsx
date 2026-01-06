import { useState, useEffect } from 'react';
import {
  Shield,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Search,
  Calendar,
  Filter,
  Download,
  FileText,
  Building2,
  User,
  Clock,
  TrendingUp,
  AlertCircle,
  Lock,
  ChevronRight
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface DecisionLog {
  id: string;
  action_type: string;
  farm_id: string | null;
  farm_name: string | null;
  farm_location: string | null;
  decision_id: string | null;
  decision_type: string | null;
  decision_priority: string | null;
  decision_status: string | null;
  auction_id: string | null;
  auction_title: string | null;
  contract_id: string | null;
  action_data: any;
  performed_by: string | null;
  performer_name: string | null;
  performer_role: string | null;
  requested_by: string | null;
  requester_name: string | null;
  result: string;
  notes: string | null;
  created_at: string;
  impact_summary: string;
}

interface Stats {
  total_decisions: number;
  approved: number;
  rejected: number;
  review_requests: number;
  success_rate: number;
  avg_response_hours: number;
}

export default function ExecutiveDecisionsLog() {
  const [logs, setLogs] = useState<DecisionLog[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState<string | null>(null);
  const [filterResult, setFilterResult] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({
    from: '',
    to: ''
  });
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const ITEMS_PER_PAGE = 50;

  useEffect(() => {
    loadData();
  }, [page, filterAction, filterResult, dateRange]);

  const loadData = async () => {
    try {
      setLoading(true);

      const [logsResult, statsResult] = await Promise.all([
        supabase.rpc('get_executive_decisions_log', {
          p_limit: ITEMS_PER_PAGE,
          p_offset: page * ITEMS_PER_PAGE,
          p_filter_action: filterAction,
          p_filter_result: filterResult,
          p_from_date: dateRange.from || null,
          p_to_date: dateRange.to || null
        }),
        supabase.rpc('get_executive_decisions_stats', {
          p_from_date: dateRange.from || null,
          p_to_date: dateRange.to || null
        })
      ]);

      if (logsResult.error) throw logsResult.error;
      if (statsResult.error) throw statsResult.error;

      setLogs(logsResult.data || []);
      setStats(statsResult.data);
      setHasMore(logsResult.data?.length === ITEMS_PER_PAGE);
    } catch (error: any) {
      console.error('Error loading executive decisions log:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      loadData();
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('search_executive_decisions_log', {
        p_search_term: searchTerm,
        p_limit: 50
      });

      if (error) throw error;
      setLogs(data || []);
      setHasMore(false);
    } catch (error) {
      console.error('Error searching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'approve_decision':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'reject_decision':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'request_review':
        return <RefreshCw className="w-5 h-5 text-amber-600" />;
      default:
        return <FileText className="w-5 h-5 text-slate-600" />;
    }
  };

  const getActionLabel = (actionType: string) => {
    const labels: Record<string, string> = {
      approve_decision: 'موافقة',
      reject_decision: 'رفض',
      request_review: 'طلب مراجعة'
    };
    return labels[actionType] || actionType;
  };

  const getActionBadge = (actionType: string) => {
    const badges: Record<string, { bg: string; text: string }> = {
      approve_decision: { bg: 'bg-green-100', text: 'text-green-700' },
      reject_decision: { bg: 'bg-red-100', text: 'text-red-700' },
      request_review: { bg: 'bg-amber-100', text: 'text-amber-700' }
    };
    const badge = badges[actionType] || { bg: 'bg-slate-100', text: 'text-slate-700' };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold ${badge.bg} ${badge.text}`}>
        {getActionLabel(actionType)}
      </span>
    );
  };

  const getDecisionTypeLabel = (type: string | null) => {
    if (!type) return 'غير محدد';
    const labels: Record<string, string> = {
      change_farm_manager: 'تغيير مدير مزرعة',
      suspend_bookings: 'إيقاف حجوزات',
      financial_review: 'مراجعة مالية',
      approve_expense: 'اعتماد مصروف',
      extend_contract: 'تمديد عقد'
    };
    return labels[type] || type;
  };

  const getPriorityBadge = (priority: string | null) => {
    if (!priority) return null;
    const badges: Record<string, { bg: string; text: string }> = {
      urgent: { bg: 'bg-red-500', text: 'text-white' },
      high: { bg: 'bg-orange-500', text: 'text-white' },
      normal: { bg: 'bg-blue-500', text: 'text-white' },
      low: { bg: 'bg-slate-400', text: 'text-white' }
    };
    const badge = badges[priority] || badges.normal;
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-bold ${badge.bg} ${badge.text}`}>
        {priority === 'urgent' ? 'عاجل' : priority === 'high' ? 'عالي' : priority === 'normal' ? 'عادي' : 'منخفض'}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  };

  const formatDateShort = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ar-SA', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const exportToCSV = () => {
    if (logs.length === 0) return;

    const headers = ['التاريخ', 'الإجراء', 'نوع القرار', 'من طلب', 'من اعتمد', 'النتيجة', 'الأثر', 'الملاحظات'];
    const rows = logs.map(log => [
      formatDate(log.created_at),
      getActionLabel(log.action_type),
      getDecisionTypeLabel(log.decision_type),
      log.requester_name || 'غير محدد',
      log.performer_name || 'غير محدد',
      log.result,
      log.impact_summary,
      log.notes || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `executive_decisions_log_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (loading && logs.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-50 p-6" dir="rtl">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-xl border-2 border-slate-200 p-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-blue-500"></div>
            </div>
            <p className="text-center text-slate-500 mt-4">جاري تحميل السجل التنفيذي...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-50 p-6" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-white shadow-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-white/20 rounded-xl backdrop-blur-sm">
                <Shield className="w-10 h-10" />
              </div>
              <div>
                <h1 className="text-3xl font-bold mb-2">سجل القرارات التنفيذي</h1>
                <p className="text-blue-100 flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  سجل قانوني غير قابل للتعديل أو الحذف
                </p>
              </div>
            </div>
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-6 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl font-bold transition-colors"
            >
              <Download className="w-5 h-5" />
              تصدير CSV
            </button>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="bg-white border-2 border-slate-200 rounded-xl p-4 shadow-sm">
              <p className="text-3xl font-bold text-slate-900">{stats.total_decisions}</p>
              <p className="text-xs text-slate-600 mt-1">إجمالي القرارات</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4">
              <p className="text-3xl font-bold text-green-600">{stats.approved}</p>
              <p className="text-xs text-slate-600 mt-1">معتمد</p>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-rose-50 border-2 border-red-200 rounded-xl p-4">
              <p className="text-3xl font-bold text-red-600">{stats.rejected}</p>
              <p className="text-xs text-slate-600 mt-1">مرفوض</p>
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-amber-200 rounded-xl p-4">
              <p className="text-3xl font-bold text-amber-600">{stats.review_requests}</p>
              <p className="text-xs text-slate-600 mt-1">طلبات مراجعة</p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl p-4">
              <p className="text-3xl font-bold text-blue-600">{stats.success_rate}%</p>
              <p className="text-xs text-slate-600 mt-1">معدل الموافقة</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-4">
              <p className="text-3xl font-bold text-purple-600">
                {stats.avg_response_hours ? Math.round(stats.avg_response_hours) : 0}
              </p>
              <p className="text-xs text-slate-600 mt-1">متوسط الاستجابة (ساعة)</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl border-2 border-slate-200 p-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-2">
                <Search className="w-4 h-4 inline mr-1" />
                بحث
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="ابحث في السجل..."
                  className="flex-1 px-4 py-2 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none text-right"
                />
                <button
                  onClick={handleSearch}
                  className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-bold transition-colors"
                >
                  بحث
                </button>
              </div>
            </div>

            {/* Filter by Action */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                <Filter className="w-4 h-4 inline mr-1" />
                نوع الإجراء
              </label>
              <select
                value={filterAction || ''}
                onChange={(e) => {
                  setFilterAction(e.target.value || null);
                  setPage(0);
                }}
                className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none text-right"
              >
                <option value="">الكل</option>
                <option value="approve_decision">موافقة</option>
                <option value="reject_decision">رفض</option>
                <option value="request_review">طلب مراجعة</option>
              </select>
            </div>

            {/* Filter by Result */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                <TrendingUp className="w-4 h-4 inline mr-1" />
                النتيجة
              </label>
              <select
                value={filterResult || ''}
                onChange={(e) => {
                  setFilterResult(e.target.value || null);
                  setPage(0);
                }}
                className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none text-right"
              >
                <option value="">الكل</option>
                <option value="success">نجح</option>
                <option value="failure">فشل</option>
                <option value="partial">جزئي</option>
              </select>
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                من تاريخ
              </label>
              <input
                type="date"
                value={dateRange.from}
                onChange={(e) => {
                  setDateRange({ ...dateRange, from: e.target.value });
                  setPage(0);
                }}
                className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                إلى تاريخ
              </label>
              <input
                type="date"
                value={dateRange.to}
                onChange={(e) => {
                  setDateRange({ ...dateRange, to: e.target.value });
                  setPage(0);
                }}
                className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Clear Filters */}
          {(filterAction || filterResult || dateRange.from || dateRange.to || searchTerm) && (
            <button
              onClick={() => {
                setFilterAction(null);
                setFilterResult(null);
                setDateRange({ from: '', to: '' });
                setSearchTerm('');
                setPage(0);
                loadData();
              }}
              className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-bold"
            >
              إلغاء جميع الفلاتر
            </button>
          )}
        </div>

        {/* Logs List */}
        <div className="space-y-4">
          {logs.length === 0 ? (
            <div className="bg-white border-2 border-slate-200 rounded-xl p-12 text-center">
              <AlertCircle className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-900 mb-2">لا توجد سجلات</h3>
              <p className="text-slate-600">لا توجد قرارات تنفيذية مسجلة حالياً</p>
            </div>
          ) : (
            <>
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="bg-white border-2 border-slate-200 hover:border-blue-300 rounded-xl p-6 transition-all shadow-sm"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="p-3 bg-slate-100 rounded-xl">
                        {getActionIcon(log.action_type)}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getActionBadge(log.action_type)}
                          {log.decision_priority && getPriorityBadge(log.decision_priority)}
                          <span className="text-xs text-slate-500">
                            {log.decision_status === 'approved' ? '• معتمد' :
                             log.decision_status === 'rejected' ? '• مرفوض' :
                             log.decision_status === 'pending' ? '• معلق' : ''}
                          </span>
                        </div>

                        <h3 className="text-lg font-bold text-slate-900 mb-2">
                          {getDecisionTypeLabel(log.decision_type)}
                        </h3>

                        {/* Impact */}
                        <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
                          <Building2 className="w-4 h-4" />
                          <span className="font-medium">{log.impact_summary}</span>
                        </div>

                        {/* Requester */}
                        {log.requester_name && (
                          <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
                            <User className="w-4 h-4" />
                            <span>طلب من: <span className="font-bold">{log.requester_name}</span></span>
                          </div>
                        )}

                        {/* Performer */}
                        {log.performer_name && (
                          <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>اعتمد من: <span className="font-bold">{log.performer_name}</span></span>
                            {log.performer_role && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                {log.performer_role}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Notes */}
                        {log.notes && (
                          <p className="text-sm text-slate-600 bg-slate-50 px-3 py-2 rounded-lg mt-2">
                            <span className="font-bold">الملاحظات:</span> {log.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Date & Time */}
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Clock className="w-3 h-3" />
                        <span>{formatDateShort(log.created_at)}</span>
                      </div>
                      <div className={`text-xs font-bold px-2 py-1 rounded ${
                        log.result === 'success' ? 'bg-green-100 text-green-700' :
                        log.result === 'failure' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {log.result === 'success' ? 'نجح' :
                         log.result === 'failure' ? 'فشل' : 'جزئي'}
                      </div>
                    </div>
                  </div>

                  {/* Full Date */}
                  <div className="pt-4 border-t border-slate-200">
                    <p className="text-xs text-slate-400">
                      السجل: {log.id} • التاريخ الكامل: {formatDate(log.created_at)}
                    </p>
                  </div>
                </div>
              ))}

              {/* Pagination */}
              <div className="flex items-center justify-between bg-white border-2 border-slate-200 rounded-xl p-4">
                <button
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 disabled:text-slate-400 rounded-lg font-bold transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                  السابق
                </button>

                <span className="text-sm text-slate-600">
                  الصفحة {page + 1}
                </span>

                <button
                  onClick={() => setPage(page + 1)}
                  disabled={!hasMore}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 disabled:text-slate-400 rounded-lg font-bold transition-colors"
                >
                  التالي
                  <ChevronRight className="w-4 h-4 rotate-180" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
