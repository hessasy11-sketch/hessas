import React, { useState, useEffect } from 'react';
import {
  Building2,
  Zap,
  AlertTriangle,
  DollarSign,
  Calendar,
  FileCheck,
  Search,
  ExternalLink,
  UserPlus,
  MoreVertical
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import AssignFarmManagerModal from './AssignFarmManagerModal';
import B2FDecisionQueuePanel from './B2FDecisionQueuePanel';

interface KPIs {
  active_farms: number;
  ready_to_activate: number;
  farms_with_overdue_tasks: number;
  pending_expenses: number;
  pending_visits: number;
  pending_decisions: number;
}

interface Farm {
  farm_id: string;
  farm_name: string;
  farm_name_ar: string;
  operational_status: string;
  manager_id: string | null;
  manager_name: string | null;
  open_tasks_count: number;
  overdue_tasks_count: number;
  pending_expenses_count: number;
  pending_expenses_amount: number;
  last_activity: string;
}

interface OverdueTask {
  task_id: string;
  task_title: string;
  farm_name_ar: string;
  days_overdue: number;
  priority: string;
}

interface PendingExpense {
  expense_id: string;
  farm_name_ar: string;
  description: string;
  amount: number;
  days_pending: number;
}

interface PendingVisit {
  visit_id: string;
  farm_name_ar: string;
  visitor_name: string;
  preferred_date: string;
  days_pending: number;
}

const FarmCommandCenter: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [filteredFarms, setFilteredFarms] = useState<Farm[]>([]);
  const [overdueTasks, setOverdueTasks] = useState<OverdueTask[]>([]);
  const [pendingExpenses, setPendingExpenses] = useState<PendingExpense[]>([]);
  const [pendingVisits, setPendingVisits] = useState<PendingVisit[]>([]);
  const [inboxTab, setInboxTab] = useState<'tasks' | 'expenses' | 'visits'>('tasks');
  const [showInbox, setShowInbox] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [hasDelays, setHasDelays] = useState(false);
  const [hasPendingExpenses, setHasPendingExpenses] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedFarmForAssign, setSelectedFarmForAssign] = useState<Farm | null>(null);
  const [showDecisionQueue, setShowDecisionQueue] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [farms, statusFilter, searchQuery, hasDelays, hasPendingExpenses]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: kpisData } = await supabase.rpc('farm_command_get_kpis', { p_user_id: user.id });
      setKpis(kpisData);

      const { data: farmsData } = await supabase.rpc('farm_command_get_farms_list', {
        p_user_id: user.id,
        p_status_filter: null,
        p_manager_filter: null,
        p_has_delays: null,
        p_has_pending_expenses: null,
        p_search_query: null
      });
      setFarms(farmsData || []);

      const { data: tasksData } = await supabase.rpc('farm_command_get_overdue_tasks', { p_user_id: user.id, p_limit: 20 });
      setOverdueTasks(tasksData || []);

      const { data: expensesData } = await supabase.rpc('farm_command_get_pending_expenses', { p_user_id: user.id, p_limit: 20 });
      setPendingExpenses(expensesData || []);

      const { data: visitsData } = await supabase.rpc('farm_command_get_pending_visits', { p_user_id: user.id });
      setPendingVisits(visitsData || []);
    } catch (error: any) {
      console.error('Error loading Farm Command data:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...farms];
    if (statusFilter !== 'all') filtered = filtered.filter(f => f.operational_status === statusFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(f =>
        f.farm_name?.toLowerCase().includes(q) ||
        f.farm_name_ar?.toLowerCase().includes(q) ||
        f.manager_name?.toLowerCase().includes(q)
      );
    }
    if (hasDelays) filtered = filtered.filter(f => f.overdue_tasks_count > 0);
    if (hasPendingExpenses) filtered = filtered.filter(f => f.pending_expenses_count > 0);
    setFilteredFarms(filtered);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      ready: 'bg-blue-100 text-blue-800',
      suspended: 'bg-red-100 text-red-800',
      inactive: 'bg-gray-100 text-gray-800'
    };
    const labels: Record<string, string> = {
      active: 'نشطة',
      ready: 'جاهزة',
      suspended: 'معلقة',
      inactive: 'غير نشطة'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.inactive}`}>
        {labels[status] || status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل غرفة العمليات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6" dir="rtl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">غرفة عمليات قيادة المزارع</h1>
        <p className="text-gray-600">مركز التحكم المركزي لإدارة جميع المزارع التشغيلية</p>
      </div>

      {kpis && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{kpis.active_farms}</p>
                <p className="text-sm text-gray-600">مزارع نشطة</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{kpis.ready_to_activate}</p>
                <p className="text-sm text-gray-600">جاهزة للتفعيل</p>
              </div>
            </div>
          </div>

          <div
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => { setShowInbox(true); setInboxTab('tasks'); }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{kpis.farms_with_overdue_tasks}</p>
                <p className="text-sm text-gray-600">مزارع متأخرة</p>
              </div>
            </div>
          </div>

          <div
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => { setShowInbox(true); setInboxTab('expenses'); }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{kpis.pending_expenses}</p>
                <p className="text-sm text-gray-600">مصروفات معلقة</p>
              </div>
            </div>
          </div>

          <div
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => { setShowInbox(true); setInboxTab('visits'); }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-cyan-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{kpis.pending_visits}</p>
                <p className="text-sm text-gray-600">طلبات زيارة</p>
              </div>
            </div>
          </div>

          <div
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setShowDecisionQueue(!showDecisionQueue)}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <FileCheck className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{kpis.pending_decisions}</p>
                <p className="text-sm text-gray-600">قرارات معلقة</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDecisionQueue && (
        <div className="mb-6">
          <B2FDecisionQueuePanel />
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="بحث بالاسم..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-10 pl-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="all">كل الحالات</option>
            <option value="active">نشطة</option>
            <option value="ready">جاهزة</option>
            <option value="suspended">معلقة</option>
            <option value="inactive">غير نشطة</option>
          </select>

          <label className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={hasDelays}
              onChange={(e) => setHasDelays(e.target.checked)}
              className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
            />
            <span className="text-sm text-gray-700">عندها تأخير</span>
          </label>

          <label className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={hasPendingExpenses}
              onChange={(e) => setHasPendingExpenses(e.target.checked)}
              className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
            />
            <span className="text-sm text-gray-700">عندها مصروفات</span>
          </label>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">اسم المزرعة</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">الحالة</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">المدير</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">مهام مفتوحة</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">مهام متأخرة</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">مصروفات معلقة</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">آخر نشاط</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredFarms.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    لا توجد مزارع تطابق الفلاتر المحددة
                  </td>
                </tr>
              ) : (
                filteredFarms.map((farm) => (
                  <tr key={farm.farm_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => navigate(`/admin/b2f/farms/${farm.farm_id}`)}
                        className="text-right font-medium text-green-600 hover:text-green-700 hover:underline"
                      >
                        {farm.farm_name_ar || farm.farm_name}
                      </button>
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(farm.operational_status)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {farm.manager_name || <span className="text-gray-400 italic">لم يتم التعيين</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm text-gray-700">{farm.open_tasks_count}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {farm.overdue_tasks_count > 0 ? (
                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                          {farm.overdue_tasks_count}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {farm.pending_expenses_count > 0 ? (
                        <div className="text-center">
                          <span className="text-sm font-medium text-gray-900">{farm.pending_expenses_count}</span>
                          <p className="text-xs text-gray-500">{farm.pending_expenses_amount.toLocaleString()} ر.س</p>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(farm.last_activity).toLocaleDateString('ar-SA')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => navigate(`/admin/b2f/farms/${farm.farm_id}`)}
                          className="p-1 text-gray-600 hover:text-green-600 transition-colors"
                          title="فتح لوحة المزرعة"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { setSelectedFarmForAssign(farm); setShowAssignModal(true); }}
                          className="p-1 text-gray-600 hover:text-blue-600 transition-colors"
                          title="تعيين/تغيير مدير"
                        >
                          <UserPlus className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showInbox && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">صندوق العمليات</h2>
                <button onClick={() => setShowInbox(false)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setInboxTab('tasks')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    inboxTab === 'tasks' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  مهام متأخرة ({overdueTasks.length})
                </button>
                <button
                  onClick={() => setInboxTab('expenses')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    inboxTab === 'expenses' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  مصروفات معلقة ({pendingExpenses.length})
                </button>
                <button
                  onClick={() => setInboxTab('visits')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    inboxTab === 'visits' ? 'bg-cyan-100 text-cyan-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  طلبات زيارة ({pendingVisits.length})
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {inboxTab === 'tasks' && (
                <div className="space-y-3">
                  {overdueTasks.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">لا توجد مهام متأخرة</p>
                  ) : (
                    overdueTasks.map((task) => (
                      <div key={task.task_id} className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 mb-1">{task.task_title}</h4>
                            <p className="text-sm text-gray-600 mb-2">{task.farm_name_ar}</p>
                            <div className="flex items-center gap-3 text-xs">
                              <span className="text-red-600 font-medium">متأخرة {task.days_overdue} يوم</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
              {inboxTab === 'expenses' && (
                <div className="space-y-3">
                  {pendingExpenses.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">لا توجد مصروفات معلقة</p>
                  ) : (
                    pendingExpenses.map((expense) => (
                      <div key={expense.expense_id} className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 mb-1">{expense.description}</h4>
                            <p className="text-sm text-gray-600 mb-2">{expense.farm_name_ar}</p>
                            <div className="flex items-center gap-3 text-sm">
                              <span className="font-bold text-purple-700">{expense.amount.toLocaleString()} ر.س</span>
                              <span className="text-gray-500">معلق {expense.days_pending} يوم</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
              {inboxTab === 'visits' && (
                <div className="space-y-3">
                  {pendingVisits.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">لا توجد طلبات زيارة معلقة</p>
                  ) : (
                    pendingVisits.map((visit) => (
                      <div key={visit.visit_id} className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 mb-1">{visit.visitor_name}</h4>
                            <p className="text-sm text-gray-600 mb-2">{visit.farm_name_ar}</p>
                            <div className="flex items-center gap-3 text-sm">
                              <span className="text-gray-700">
                                التاريخ المفضل: {new Date(visit.preferred_date).toLocaleDateString('ar-SA')}
                              </span>
                              <span className="text-gray-500">معلق {visit.days_pending} يوم</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showAssignModal && selectedFarmForAssign && (
        <AssignFarmManagerModal
          isOpen={showAssignModal}
          farm={{
            id: selectedFarmForAssign.farm_id,
            name: selectedFarmForAssign.farm_name_ar || selectedFarmForAssign.farm_name,
            location: '-',
            status: selectedFarmForAssign.operational_status,
            bookings_enabled: true,
            farm_manager_id: selectedFarmForAssign.manager_id,
            farm_manager_name: selectedFarmForAssign.manager_name,
            total_visits: 0,
            total_bookings: 0,
            pending_bookings: 0,
            last_booking_at: null
          }}
          onClose={() => { setShowAssignModal(false); setSelectedFarmForAssign(null); loadAllData(); }}
        />
      )}
    </div>
  );
};

export default FarmCommandCenter;
