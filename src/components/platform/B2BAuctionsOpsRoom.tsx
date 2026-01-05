import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Gavel,
  ArrowLeft,
  Activity,
  TrendingUp,
  AlertTriangle,
  Clock,
  Eye,
  DollarSign,
  CheckCircle2,
  XCircle,
  Zap,
  FileText,
  Play,
  Pause,
  TimerReset,
  Award,
  Users,
  Shield
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import AuthorityPanel from './AuthorityPanel';

interface Pulse {
  visits_today: number;
  active_auctions: number;
  critical_auctions: number;
  highest_bid_today: number;
}

interface AuctionRadar {
  id: string;
  title: string;
  category_name: string;
  status: string;
  current_price: number;
  starting_price: number;
  start_time: string;
  end_time: string;
  time_remaining_hours: number;
  total_views: number;
  total_bids: number;
  highest_bid: number | null;
  is_critical: boolean;
  seller_name: string;
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
  action_data: any;
}

export default function B2BAuctionsOpsRoom() {
  const navigate = useNavigate();
  const [pulse, setPulse] = useState<Pulse | null>(null);
  const [auctions, setAuctions] = useState<AuctionRadar[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [logs, setLogs] = useState<ExecutiveLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAuction, setSelectedAuction] = useState<string | null>(null);
  const [showAuthority, setShowAuthority] = useState(false);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [pulseRes, auctionsRes, decisionsRes, logsRes] = await Promise.all([
        supabase.rpc('get_b2b_ops_pulse'),
        supabase.rpc('get_b2b_auctions_radar'),
        supabase.rpc('get_pending_decisions'),
        supabase.rpc('get_executive_logs', { limit_count: 20 })
      ]);

      if (pulseRes.data) setPulse(pulseRes.data);
      if (auctionsRes.data) setAuctions(auctionsRes.data);
      if (decisionsRes.data) setDecisions(decisionsRes.data);
      if (logsRes.data) setLogs(logsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (auctionId: string, newStatus: string) => {
    const { data, error } = await supabase.rpc('exec_toggle_auction_status', {
      p_auction_id: auctionId,
      p_new_status: newStatus,
      p_performed_by: 'system',
      p_notes: `تم ${newStatus === 'active' ? 'تفعيل' : newStatus === 'paused' ? 'إيقاف' : 'إلغاء'} المزاد`
    });

    if (!error && data?.success) {
      loadData();
    }
  };

  const handleExtendTime = async (auctionId: string, hours: number) => {
    const { data, error } = await supabase.rpc('exec_extend_auction_time', {
      p_auction_id: auctionId,
      p_hours_to_add: hours,
      p_performed_by: 'system',
      p_notes: `تم تمديد المزاد ${hours} ساعة`
    });

    if (!error && data?.success) {
      loadData();
    }
  };

  const handleApproveResult = async (auctionId: string) => {
    const { data, error } = await supabase.rpc('exec_approve_auction_result', {
      p_auction_id: auctionId,
      p_performed_by: 'system',
      p_notes: 'تم اعتماد النتيجة'
    });

    if (!error && data?.success) {
      loadData();
    }
  };

  const handleApproveDecision = async (decisionId: string) => {
    const { data, error } = await supabase.rpc('exec_approve_decision', {
      p_decision_id: decisionId,
      p_approved_by: 'system',
      p_notes: 'موافقة من غرفة العمليات'
    });

    if (!error && data?.success) {
      loadData();
    }
  };

  const handleRejectDecision = async (decisionId: string) => {
    const { data, error } = await supabase.rpc('exec_reject_decision', {
      p_decision_id: decisionId,
      p_rejected_by: 'system',
      p_notes: 'رفض من غرفة العمليات'
    });

    if (!error && data?.success) {
      loadData();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50" dir="rtl">
      <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 border-b border-blue-700 shadow-xl">
        <div className="max-w-[1600px] mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/admin/operations-room')}
                className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center shadow-lg">
                <Gavel className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">غرفة عمليات المزادات</h1>
                <p className="text-blue-200 text-sm">B2B Auctions Operations Room</p>
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
              <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 border border-blue-500/30 rounded-xl">
                <Activity className="w-4 h-4 text-blue-300 animate-pulse" />
                <span className="text-blue-200 text-sm font-medium">مباشر</span>
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
                label="مزادات نشطة"
                value={pulse.active_auctions}
                icon={TrendingUp}
                color="bg-emerald-500/20 border-emerald-500/30 text-emerald-300"
              />
              <PulseCard
                label="مزادات حرجة"
                value={pulse.critical_auctions}
                icon={AlertTriangle}
                color={pulse.critical_auctions > 0 ? "bg-red-500/20 border-red-500/30 text-red-300 animate-pulse" : "bg-slate-500/20 border-slate-500/30 text-slate-300"}
              />
              <PulseCard
                label="أعلى عرض اليوم"
                value={`${pulse.highest_bid_today.toLocaleString()} ر.س`}
                icon={DollarSign}
                color="bg-amber-500/20 border-amber-500/30 text-amber-300"
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
                  <Zap className="w-5 h-5 text-blue-600" />
                  Radar - قائمة المزادات
                </h2>
                <span className="text-sm text-slate-500">{auctions.length} مزاد</span>
              </div>

              <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                {auctions.map((auction) => (
                  <AuctionRadarCard
                    key={auction.id}
                    auction={auction}
                    isSelected={selectedAuction === auction.id}
                    onSelect={() => setSelectedAuction(auction.id)}
                    onToggleStatus={handleToggleStatus}
                    onExtendTime={handleExtendTime}
                    onApproveResult={handleApproveResult}
                  />
                ))}

                {auctions.length === 0 && (
                  <div className="p-8 text-center text-slate-400">
                    لا توجد مزادات حالياً
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
                    onReject={handleRejectDecision}
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

function AuctionRadarCard({ auction, isSelected, onSelect, onToggleStatus, onExtendTime, onApproveResult }: any) {
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-emerald-100 text-emerald-700',
      pending: 'bg-amber-100 text-amber-700',
      completed: 'bg-blue-100 text-blue-700',
      sold: 'bg-purple-100 text-purple-700',
      paused: 'bg-slate-200 text-slate-600',
      cancelled: 'bg-red-100 text-red-700'
    };
    return colors[status] || 'bg-slate-200 text-slate-600';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      active: 'نشط',
      pending: 'قيد الانتظار',
      completed: 'مكتمل',
      sold: 'مباع',
      paused: 'متوقف',
      cancelled: 'ملغي'
    };
    return labels[status] || status;
  };

  const formatTimeRemaining = (hours: number) => {
    if (hours < 0) return 'انتهى';
    if (hours < 1) return `${Math.floor(hours * 60)} دقيقة`;
    if (hours < 24) return `${Math.floor(hours)} ساعة`;
    return `${Math.floor(hours / 24)} يوم`;
  };

  return (
    <div
      className={`p-4 hover:bg-slate-50 transition-colors cursor-pointer ${isSelected ? 'bg-blue-50' : ''} ${auction.is_critical ? 'border-r-4 border-red-500' : ''}`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-slate-900 truncate">{auction.title}</h3>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold flex-shrink-0 ${getStatusColor(auction.status)}`}>
              {getStatusLabel(auction.status)}
            </span>
            {auction.is_critical && (
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 animate-pulse" />
            )}
          </div>
          <p className="text-xs text-slate-500 mb-1">{auction.category_name}</p>
          <p className="text-xs text-slate-600">البائع: {auction.seller_name}</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 text-center mb-3">
        <div className="bg-slate-50 rounded-lg p-2">
          <div className="text-xs text-slate-600 mb-1">مشاهدات</div>
          <div className="text-sm font-bold text-blue-600">{auction.total_views}</div>
        </div>
        <div className="bg-slate-50 rounded-lg p-2">
          <div className="text-xs text-slate-600 mb-1">مزايدات</div>
          <div className="text-sm font-bold text-emerald-600">{auction.total_bids}</div>
        </div>
        <div className="bg-slate-50 rounded-lg p-2">
          <div className="text-xs text-slate-600 mb-1">أعلى عرض</div>
          <div className="text-sm font-bold text-amber-600">{auction.highest_bid?.toLocaleString() || '-'}</div>
        </div>
        <div className="bg-slate-50 rounded-lg p-2">
          <div className="text-xs text-slate-600 mb-1">متبقي</div>
          <div className={`text-sm font-bold ${auction.is_critical ? 'text-red-600' : 'text-slate-900'}`}>
            {formatTimeRemaining(auction.time_remaining_hours)}
          </div>
        </div>
      </div>

      {isSelected && auction.status === 'active' && (
        <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-200">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleStatus(auction.id, 'paused');
            }}
            className="flex-1 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors flex items-center justify-center gap-1"
          >
            <Pause className="w-3 h-3" />
            إيقاف
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onExtendTime(auction.id, 24);
            }}
            className="flex-1 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-200 transition-colors flex items-center justify-center gap-1"
          >
            <TimerReset className="w-3 h-3" />
            تمديد 24س
          </button>
          {auction.total_bids > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onApproveResult(auction.id);
              }}
              className="flex-1 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold hover:bg-emerald-200 transition-colors flex items-center justify-center gap-1"
            >
              <Award className="w-3 h-3" />
              اعتماد النتيجة
            </button>
          )}
        </div>
      )}

      {isSelected && auction.status === 'paused' && (
        <div className="flex gap-2 pt-3 border-t border-slate-200">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleStatus(auction.id, 'active');
            }}
            className="flex-1 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold hover:bg-emerald-200 transition-colors flex items-center justify-center gap-1"
          >
            <Play className="w-3 h-3" />
            تفعيل
          </button>
        </div>
      )}
    </div>
  );
}

function DecisionCard({ decision, onApprove, onReject }: any) {
  const getDecisionLabel = (type: string) => {
    const labels: Record<string, string> = {
      assign_farm_manager: 'تعيين مدير مزرعة',
      change_farm_manager: 'تغيير مدير مزرعة',
      pause_farm: 'إيقاف مزرعة',
      activate_farm: 'تشغيل مزرعة',
      approve_expense: 'اعتماد مصروف',
      toggle_bookings: 'تفعيل/إيقاف حجوزات',
      pause_auction: 'إيقاف مزاد',
      extend_auction: 'تمديد مزاد',
      approve_auction_result: 'اعتماد نتيجة مزاد'
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
          className="flex-1 px-3 py-2 bg-emerald-500 text-white rounded-lg text-sm font-bold hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4" />
          موافقة
        </button>
        <button
          onClick={() => onReject(decision.id)}
          className="flex-1 px-3 py-2 bg-red-500 text-white rounded-lg text-sm font-bold hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
        >
          <XCircle className="w-4 h-4" />
          رفض
        </button>
      </div>
    </div>
  );
}

function LogCard({ log }: any) {
  const getActionLabel = (type: string) => {
    const labels: Record<string, string> = {
      auction_activated: 'تفعيل مزاد',
      auction_paused: 'إيقاف مزاد',
      auction_cancelled: 'إلغاء مزاد',
      auction_time_extended: 'تمديد وقت مزاد',
      auction_result_approved: 'اعتماد نتيجة مزاد',
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
          {log.action_data?.auction_title && (
            <div className="text-slate-600">{log.action_data.auction_title}</div>
          )}
          {log.action_data?.farm_name && (
            <div className="text-slate-600">{log.action_data.farm_name}</div>
          )}
          {log.action_data?.hours_added && (
            <div className="text-xs text-slate-500">تم التمديد: {log.action_data.hours_added} ساعة</div>
          )}
          {log.action_data?.winning_bid && (
            <div className="text-xs text-slate-500">عرض الفوز: {log.action_data.winning_bid} ريال</div>
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
