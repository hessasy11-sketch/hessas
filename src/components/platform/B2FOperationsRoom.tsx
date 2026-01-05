import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Leaf,
  ArrowLeft,
  Activity,
  Calendar,
  MapPin,
  Clock,
  AlertTriangle,
  Power,
  UserCheck,
  CheckCircle2,
  XCircle,
  Eye,
  Zap,
  FileText,
  DollarSign,
  TrendingUp,
  Shield
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useDecisionQueue } from '../../hooks/useDecisionQueue';
import { useMasterActions } from '../../hooks/useMasterActions';
import { useVisitsTracking } from '../../hooks/useVisitsTracking';
import AuthorityPanel from './AuthorityPanel';
import DecisionRejectModal from './DecisionRejectModal';

interface Pulse {
  visits_today: number;
  bookings_today: number;
  farms_with_bookings: number;
  overdue_requests: number;
}

interface FarmRadar {
  id: string;
  name: string;
  location: string;
  status: string;
  bookings_enabled: boolean;
  farm_manager_id: string | null;
  farm_manager_name: string | null;
  total_visits: number;
  total_bookings: number;
  pending_bookings: number;
  last_booking_at: string | null;
}

interface Decision {
  id: string;
  decision_type: string;
  farm_id: string;
  farm_name: string;
  target_staff_id: string | null;
  target_staff_name: string | null;
  expense_amount: number | null;
  expense_description: string | null;
  status: string;
  priority: string;
  requested_by: string;
  requester_name: string;
  notes: string | null;
  created_at: string;
}

interface ExecutiveLog {
  id: string;
  action_type: string;
  farm_id: string;
  farm_name: string;
  staff_id: string | null;
  staff_name: string | null;
  performed_by: string;
  performer_name: string;
  result: string;
  notes: string | null;
  created_at: string;
}

export default function B2FOperationsRoom() {
  const navigate = useNavigate();
  const [pulse, setPulse] = useState<Pulse | null>(null);
  const [farms, setFarms] = useState<FarmRadar[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [logs, setLogs] = useState<ExecutiveLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFarm, setSelectedFarm] = useState<string | null>(null);
  const [showAuthority, setShowAuthority] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedDecisionForReject, setSelectedDecisionForReject] = useState<Decision | null>(null);

  const { approveDecision, rejectDecision, loading: actionLoading } = useDecisionQueue('b2f');
  const { toggleFarmBookings, loading: masterActionLoading } = useMasterActions();
  const { topFarms, loadTopFarms } = useVisitsTracking();

  // استخدام staff_id مؤقت للتجربة - في الإنتاج سيأتي من الـ session
  const CURRENT_STAFF_ID = '00000000-0000-0000-0000-000000000001';

  useEffect(() => {
    loadData();
    loadTopFarms();
    const interval = setInterval(() => {
      loadData();
      loadTopFarms();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [pulseRes, farmsRes, decisionsRes, logsRes] = await Promise.all([
        supabase.rpc('get_b2f_ops_pulse'),
        supabase.rpc('get_b2f_farms_radar'),
        supabase.rpc('get_pending_decisions'),
        supabase.rpc('get_executive_logs', { limit_count: 20 })
      ]);

      if (pulseRes.data) setPulse(pulseRes.data);
      if (farmsRes.data) setFarms(farmsRes.data);
      if (decisionsRes.data) setDecisions(decisionsRes.data);
      if (logsRes.data) setLogs(logsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBookings = async (farmId: string, enabled: boolean) => {
    const result = await toggleFarmBookings(
      farmId,
      enabled,
      CURRENT_STAFF_ID,
      `تم ${enabled ? 'فتح' : 'إيقاف'} الحجوزات - إجراء تنفيذي مباشر`
    );

    if (result.success) {
      loadData();
    }
  };

  const handleApproveDecision = async (decisionId: string) => {
    const result = await approveDecision(
      decisionId,
      CURRENT_STAFF_ID,
      'تمت الموافقة من غرفة عمليات B2F'
    );

    if (result.success) {
      loadData();
    }
  };

  const handleRejectClick = (decision: Decision) => {
    setSelectedDecisionForReject(decision);
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async (reason: string) => {
    if (!selectedDecisionForReject) return;

    const result = await rejectDecision(
      selectedDecisionForReject.id,
      CURRENT_STAFF_ID,
      reason
    );

    if (result.success) {
      setRejectModalOpen(false);
      setSelectedDecisionForReject(null);
      loadData();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-slate-50" dir="rtl">
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-emerald-900 border-b border-emerald-700 shadow-xl">
        <div className="max-w-[1600px] mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/admin/operations-room')}
                className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-500 flex items-center justify-center shadow-lg">
                <Leaf className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">غرفة عمليات استثمار المزارع</h1>
                <p className="text-emerald-200 text-sm">B2F Operations Room</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowAuthority(true)}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500/20 border border-amber-500/30 rounded-xl hover:bg-amber-500/30 transition-colors"
              >
                <Shield className="w-4 h-4 text-amber-300" />
                <span className="text-amber-200 text-sm font-medium">الصلاحيات</span>
              </button>
              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 rounded-xl">
                <Activity className="w-4 h-4 text-emerald-300 animate-pulse" />
                <span className="text-emerald-200 text-sm font-medium">مباشر</span>
              </div>
            </div>
          </div>

          {pulse && (
            <div className="grid grid-cols-4 gap-4">
              <PulseCard
                label="زيارات اليوم"
                value={pulse.visits_today}
                icon={Eye}
                color="bg-blue-500/20 border-blue-500/30 text-blue-300"
              />
              <PulseCard
                label="حجوزات اليوم"
                value={pulse.bookings_today}
                icon={Calendar}
                color="bg-emerald-500/20 border-emerald-500/30 text-emerald-300"
              />
              <PulseCard
                label="مزارع عليها حجوزات"
                value={pulse.farms_with_bookings}
                icon={MapPin}
                color="bg-amber-500/20 border-amber-500/30 text-amber-300"
              />
              <PulseCard
                label="طلبات متأخرة"
                value={pulse.overdue_requests}
                icon={AlertTriangle}
                color={pulse.overdue_requests > 0 ? "bg-red-500/20 border-red-500/30 text-red-300 animate-pulse" : "bg-slate-500/20 border-slate-500/30 text-slate-300"}
              />
            </div>
          )}
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-lg">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-emerald-600" />
                  Radar - قائمة المزارع
                </h2>
                <span className="text-sm text-slate-500">{farms.length} مزرعة</span>
              </div>

              <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                {farms.map((farm) => (
                  <FarmRadarCard
                    key={farm.id}
                    farm={farm}
                    isSelected={selectedFarm === farm.id}
                    onSelect={() => setSelectedFarm(farm.id)}
                    onToggleBookings={handleToggleBookings}
                    loading={masterActionLoading}
                  />
                ))}

                {farms.length === 0 && (
                  <div className="p-8 text-center text-slate-400">
                    لا توجد مزارع حالياً
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-lg">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  Executive Log
                </h2>
                <span className="text-sm text-slate-500">{logs.length} إجراء</span>
              </div>

              <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
                {logs.map((log) => (
                  <LogCard key={log.id} log={log} />
                ))}

                {logs.length === 0 && (
                  <div className="p-8 text-center text-slate-400">
                    لا توجد إجراءات مسجلة
                  </div>
                )}
              </div>
            </div>

            {/* Top 5 Most Visited Farms */}
            {topFarms.length > 0 && (
              <div className="bg-white rounded-2xl border-2 border-emerald-200 shadow-lg">
                <div className="p-4 border-b border-emerald-100 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-emerald-900 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                    أكثر المزارع زيارة
                  </h2>
                  <span className="text-sm text-emerald-600 font-medium">آخر 24 ساعة</span>
                </div>

                <div className="divide-y divide-slate-100">
                  {topFarms.map((farm, index) => (
                    <div key={farm.farm_id} className="p-4 hover:bg-emerald-50/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                            index === 0 ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-white' :
                            index === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-white' :
                            index === 2 ? 'bg-gradient-to-br from-orange-300 to-orange-400 text-white' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{farm.farm_name}</div>
                            <div className="text-xs text-slate-500">
                              آخر زيارة: {new Date(farm.last_visit).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Eye className="w-4 h-4 text-emerald-600" />
                          <span className="text-lg font-bold text-emerald-600">{farm.visit_count}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-2xl border-2 border-amber-200 shadow-lg">
              <div className="p-4 border-b border-amber-200 flex items-center justify-between bg-amber-50">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  Decision Queue
                </h2>
                <span className="text-sm font-bold text-amber-600">{decisions.length}</span>
              </div>

              <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                {decisions.map((decision) => (
                  <DecisionCard
                    key={decision.id}
                    decision={decision}
                    onApprove={handleApproveDecision}
                    onReject={() => handleRejectClick(decision)}
                    loading={actionLoading}
                  />
                ))}

                {decisions.length === 0 && (
                  <div className="p-8 text-center text-slate-400">
                    لا توجد قرارات معلقة
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <AuthorityPanel isOpen={showAuthority} onClose={() => setShowAuthority(false)} />

      <DecisionRejectModal
        isOpen={rejectModalOpen}
        onClose={() => {
          setRejectModalOpen(false);
          setSelectedDecisionForReject(null);
        }}
        onConfirm={handleConfirmReject}
        decisionTitle={selectedDecisionForReject?.farm_name || 'القرار'}
        loading={actionLoading}
      />
    </div>
  );
}

function PulseCard({ label, value, icon: Icon, color }: any) {
  return (
    <div className={`px-4 py-3 rounded-xl border ${color}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium">{label}</span>
        <Icon className="w-4 h-4" />
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

function FarmRadarCard({ farm, isSelected, onSelect, onToggleBookings, loading }: any) {
  return (
    <div
      className={`p-4 hover:bg-slate-50 transition-colors cursor-pointer ${isSelected ? 'bg-emerald-50' : ''}`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-slate-900">{farm.name}</h3>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              farm.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
            }`}>
              {farm.status === 'active' ? 'نشطة' : 'متوقفة'}
            </span>
          </div>
          <p className="text-sm text-slate-500 flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {farm.location}
          </p>
          {farm.farm_manager_name && (
            <p className="text-xs text-slate-600 mt-1 flex items-center gap-1">
              <UserCheck className="w-3 h-3" />
              المدير: {farm.farm_manager_name}
            </p>
          )}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleBookings(farm.id, !farm.bookings_enabled);
          }}
          disabled={loading}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            farm.bookings_enabled
              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
              : 'bg-red-100 text-red-700 hover:bg-red-200'
          }`}
        >
          <Power className="w-3 h-3 inline mr-1" />
          {loading ? 'جاري...' : (farm.bookings_enabled ? 'حجوزات مفتوحة' : 'حجوزات مغلقة')}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-slate-50 rounded-lg p-2">
          <div className="text-xs text-slate-600 mb-1">زيارات</div>
          <div className="text-lg font-bold text-blue-600">{farm.total_visits}</div>
        </div>
        <div className="bg-slate-50 rounded-lg p-2">
          <div className="text-xs text-slate-600 mb-1">حجوزات</div>
          <div className="text-lg font-bold text-emerald-600">{farm.total_bookings}</div>
        </div>
        <div className="bg-slate-50 rounded-lg p-2">
          <div className="text-xs text-slate-600 mb-1">معلقة</div>
          <div className="text-lg font-bold text-amber-600">{farm.pending_bookings}</div>
        </div>
      </div>

      {farm.last_booking_at && (
        <div className="mt-2 text-xs text-slate-500 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          آخر حجز: {new Date(farm.last_booking_at).toLocaleDateString('ar-SA')}
        </div>
      )}
    </div>
  );
}

function DecisionCard({ decision, onApprove, onReject, loading }: any) {
  const getDecisionLabel = (type: string) => {
    const labels: Record<string, string> = {
      assign_farm_manager: 'تعيين مدير مزرعة',
      change_farm_manager: 'تغيير مدير مزرعة',
      pause_farm: 'إيقاف مزرعة',
      activate_farm: 'تشغيل مزرعة',
      approve_expense: 'اعتماد مصروف',
      toggle_bookings: 'تفعيل/إيقاف حجوزات'
    };
    return labels[type] || type;
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      urgent: 'bg-red-100 text-red-700 border-red-200',
      high: 'bg-orange-100 text-orange-700 border-orange-200',
      normal: 'bg-blue-100 text-blue-700 border-blue-200',
      low: 'bg-slate-100 text-slate-700 border-slate-200'
    };
    return colors[priority] || colors.normal;
  };

  return (
    <div className="p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2 py-1 rounded-lg text-xs font-bold border ${getPriorityColor(decision.priority)}`}>
              {getDecisionLabel(decision.decision_type)}
            </span>
          </div>
          <h3 className="font-bold text-slate-900 mb-1">{decision.farm_name}</h3>
          {decision.target_staff_name && (
            <p className="text-sm text-slate-600">الموظف: {decision.target_staff_name}</p>
          )}
          {decision.expense_amount && (
            <p className="text-sm text-slate-600 flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              {decision.expense_amount} ريال - {decision.expense_description}
            </p>
          )}
          <p className="text-xs text-slate-500 mt-1">طلب من: {decision.requester_name}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onApprove(decision.id)}
          disabled={loading}
          className="flex-1 px-3 py-2 bg-emerald-500 text-white rounded-lg text-sm font-bold hover:bg-emerald-600 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4" />
          {loading ? 'جاري...' : 'موافقة'}
        </button>
        <button
          onClick={() => onReject()}
          disabled={loading}
          className="flex-1 px-3 py-2 bg-red-500 text-white rounded-lg text-sm font-bold hover:bg-red-600 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          <XCircle className="w-4 h-4" />
          {loading ? 'جاري...' : 'رفض'}
        </button>
      </div>
    </div>
  );
}

function LogCard({ log }: any) {
  const getActionLabel = (type: string) => {
    const labels: Record<string, string> = {
      farm_manager_assigned: 'تعيين مدير',
      farm_manager_changed: 'تغيير مدير',
      farm_activated: 'تشغيل مزرعة',
      farm_paused: 'إيقاف مزرعة',
      expense_approved: 'اعتماد مصروف',
      bookings_toggled: 'تغيير حالة الحجوزات'
    };
    return labels[type] || type;
  };

  return (
    <div className="p-3 text-sm">
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
          log.result === 'success' ? 'bg-emerald-100' : 'bg-red-100'
        }`}>
          {log.result === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          ) : (
            <XCircle className="w-4 h-4 text-red-600" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-bold text-slate-900">{getActionLabel(log.action_type)}</div>
          <div className="text-slate-600">{log.farm_name}</div>
          {log.staff_name && (
            <div className="text-xs text-slate-500">الموظف: {log.staff_name}</div>
          )}
          <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {new Date(log.created_at).toLocaleString('ar-SA')}
          </div>
        </div>
      </div>
    </div>
  );
}
