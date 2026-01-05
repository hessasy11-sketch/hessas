import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Leaf,
  ArrowLeft,
  Crown,
  Activity,
  AlertTriangle,
  User,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  BarChart3,
  FileText,
  ShieldAlert,
  ShieldCheck
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useVisitsTracking } from '../../hooks/useVisitsTracking';
import { useAbsoluteControl } from '../../hooks/useAbsoluteControl';
import AbsoluteControlModal from './AbsoluteControlModal';

interface B2FPulse {
  active_requests: number;
  pending_approvals: number;
  operating_farms: number;
  active_contracts: number;
  critical_alerts: number;
}

interface B2BPulse {
  active_auctions: number;
  total_bids: number;
  ending_soon: number;
  completed_today: number;
  critical_alerts: number;
}

export default function OperationsRoomHub() {
  const navigate = useNavigate();
  const [b2fPulse, setB2fPulse] = useState<B2FPulse | null>(null);
  const [b2bPulse, setB2bPulse] = useState<B2BPulse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showControlModal, setShowControlModal] = useState(false);
  const [controlMode, setControlMode] = useState<'activate' | 'deactivate'>('activate');

  const { summary, loadSummary } = useVisitsTracking();
  const { session, loading: controlLoading, activate, deactivate } = useAbsoluteControl();

  useEffect(() => {
    loadPulse();
    loadSummary();
    const interval = setInterval(() => {
      loadPulse();
      loadSummary();
    }, 30000);
    return () => clearInterval(interval);
  }, [loadSummary]);

  const loadPulse = async () => {
    try {
      const [b2fResult, b2bResult] = await Promise.all([
        supabase.rpc('get_b2f_pulse_data'),
        supabase.rpc('get_b2b_pulse_data')
      ]);

      if (b2fResult.data) {
        setB2fPulse(b2fResult.data);
      }

      if (b2bResult.data) {
        setB2bPulse(b2bResult.data);
      }
    } catch (error) {
      console.error('Error loading pulse:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleControlClick = () => {
    if (session.isActive) {
      setControlMode('deactivate');
    } else {
      setControlMode('activate');
    }
    setShowControlModal(true);
  };

  const handleControlConfirm = async (reason?: string) => {
    const staffId = 'gm-001';
    const staffName = 'المدير العام';

    if (controlMode === 'activate' && reason) {
      const result = await activate(reason, staffId, staffName);
      if (result.success) {
        setShowControlModal(false);
      }
    } else if (controlMode === 'deactivate') {
      const result = await deactivate(staffId, staffName);
      if (result.success) {
        setShowControlModal(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-50" dir="rtl">
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700 shadow-xl">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/50">
                <Crown className="w-9 h-9 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white mb-1">
                  غرفة العمليات التنفيذية
                </h1>
                <p className="text-slate-400">Executive Operations Room</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleControlClick}
                disabled={controlLoading}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all disabled:opacity-50 ${
                  session.isActive
                    ? 'bg-emerald-500/20 border border-emerald-500/30 hover:bg-emerald-500/30 animate-pulse'
                    : 'bg-red-500/20 border border-red-500/30 hover:bg-red-500/30'
                }`}
              >
                {session.isActive ? (
                  <>
                    <ShieldCheck className="w-4 h-4 text-emerald-300" />
                    <span className="text-emerald-200 text-sm">وضع نشط</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-4 h-4 text-red-300" />
                    <span className="text-red-200 text-sm">السيطرة المطلقة</span>
                  </>
                )}
              </button>

              <button
                onClick={() => navigate('/admin/operations-room/logs')}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-500/20 border border-blue-500/30 rounded-xl hover:bg-blue-500/30 transition-colors"
              >
                <FileText className="w-4 h-4 text-blue-300" />
                <span className="text-blue-200 text-sm font-medium">السجل القيادي</span>
              </button>

              <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-500/20 border border-slate-500/30 rounded-xl">
                <Activity className="w-4 h-4 text-slate-400 animate-pulse" />
                <span className="text-slate-300 text-sm font-medium">مباشر</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* قسم إحصائيات الزيارات */}
        {summary && (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Eye className="w-5 h-5 text-slate-600" />
              <h2 className="text-xl font-bold text-slate-900">إحصائيات الزيارات</h2>
              <span className="text-sm text-slate-500">آخر 24 ساعة</span>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border-2 border-slate-200 p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                    <Eye className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-sm text-slate-600 font-medium">إجمالي اليوم</span>
                </div>
                <div className="text-3xl font-bold text-blue-600">
                  {summary.total_today.toLocaleString()}
                </div>
              </div>

              <div className="bg-white rounded-xl border-2 border-emerald-200 p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                    <Leaf className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-sm text-slate-600 font-medium">زيارات B2F</span>
                </div>
                <div className="text-3xl font-bold text-emerald-600">
                  {summary.b2f_today.toLocaleString()}
                </div>
              </div>

              <div className="bg-white rounded-xl border-2 border-blue-200 p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-sm text-slate-600 font-medium">زيارات B2B</span>
                </div>
                <div className="text-3xl font-bold text-blue-600">
                  {summary.b2b_today.toLocaleString()}
                </div>
              </div>

              <div className="bg-white rounded-xl border-2 border-slate-200 p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-sm text-slate-600 font-medium">الأسبوع</span>
                </div>
                <div className="text-3xl font-bold text-slate-600">
                  {summary.total_week.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sensitive Commands Demo Link */}
        {session.isActive && (
          <div className="mb-8 bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-400 to-red-500 flex items-center justify-center animate-pulse">
                  <ShieldAlert className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-red-900 mb-1">
                    الأوامر الحساسة متاحة الآن
                  </h3>
                  <p className="text-red-700 text-sm">
                    وضع السيطرة المطلقة نشط - يمكنك الوصول إلى الأوامر الحساسة
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate('/admin/operations-room/sensitive-commands')}
                className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-bold hover:shadow-lg transition-all flex items-center gap-2"
              >
                <span>عرض الأوامر</span>
                <ShieldAlert className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-8">
          <OperationCard
            title="استثمار المزارع"
            subtitle="Farm Investment Operations"
            icon={Leaf}
            iconColor="from-emerald-500 to-emerald-600"
            borderColor="border-emerald-200 hover:border-emerald-300"
            ownerName="أحمد المالكي"
            ownerRole="مدير استثمار المزارع"
            metrics={[
              { label: 'طلبات نشطة', value: b2fPulse?.active_requests || 0, icon: Activity, color: 'text-emerald-600' },
              { label: 'تحتاج موافقة', value: b2fPulse?.pending_approvals || 0, icon: Clock, color: 'text-amber-600' },
              { label: 'مزارع تشغيلية', value: b2fPulse?.operating_farms || 0, icon: CheckCircle2, color: 'text-blue-600' },
              { label: 'عقود فعالة', value: b2fPulse?.active_contracts || 0, icon: TrendingUp, color: 'text-slate-600' }
            ]}
            criticalAlerts={b2fPulse?.critical_alerts || 0}
            onEnter={() => navigate('/admin/operations-room/b2f')}
            loading={loading}
          />

          <OperationCard
            title="مزاد الشركات"
            subtitle="Business Auctions Platform"
            icon={Building2}
            iconColor="from-blue-500 to-blue-600"
            borderColor="border-blue-200 hover:border-blue-300"
            ownerName="خالد العتيبي"
            ownerRole="مدير مزاد الشركات"
            metrics={[
              { label: 'مزادات نشطة', value: b2bPulse?.active_auctions || 0, icon: Activity, color: 'text-blue-600' },
              { label: 'مزايدات اليوم', value: b2bPulse?.total_bids || 0, icon: TrendingUp, color: 'text-emerald-600' },
              { label: 'تنتهي قريباً', value: b2bPulse?.ending_soon || 0, icon: Clock, color: 'text-amber-600' },
              { label: 'مكتملة اليوم', value: b2bPulse?.completed_today || 0, icon: CheckCircle2, color: 'text-slate-600' }
            ]}
            criticalAlerts={b2bPulse?.critical_alerts || 0}
            onEnter={() => navigate('/admin/operations-room/b2b')}
            loading={loading}
          />
        </div>
      </div>

      {showControlModal && (
        <AbsoluteControlModal
          mode={controlMode}
          currentReason={session.reason}
          onConfirm={handleControlConfirm}
          onCancel={() => setShowControlModal(false)}
          loading={controlLoading}
        />
      )}
    </div>
  );
}

interface Metric {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
}

interface OperationCardProps {
  title: string;
  subtitle: string;
  icon: React.ElementType;
  iconColor: string;
  borderColor: string;
  ownerName: string;
  ownerRole: string;
  metrics: Metric[];
  criticalAlerts: number;
  onEnter: () => void;
  loading: boolean;
}

function OperationCard({
  title,
  subtitle,
  icon: Icon,
  iconColor,
  borderColor,
  ownerName,
  ownerRole,
  metrics,
  criticalAlerts,
  onEnter,
  loading
}: OperationCardProps) {
  return (
    <div className="group relative">
      <div className={`absolute inset-0 bg-gradient-to-br ${iconColor} rounded-3xl blur-2xl opacity-10 group-hover:opacity-20 transition-opacity`} />

      <div className={`relative bg-white rounded-3xl border-2 ${borderColor} transition-all duration-300 hover:shadow-2xl overflow-hidden`}>
        {criticalAlerts > 0 && (
          <div className="absolute top-4 left-4 z-10">
            <div className="flex items-center gap-2 px-3 py-2 bg-red-500 text-white rounded-xl text-sm font-bold shadow-lg animate-pulse">
              <AlertTriangle className="w-4 h-4" />
              <span>{criticalAlerts} تنبيه</span>
            </div>
          </div>
        )}

        <div className="p-8">
          <div className="flex items-start gap-5 mb-6">
            <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${iconColor} flex items-center justify-center shadow-xl`}>
              <Icon className="w-10 h-10 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-slate-900 mb-1">{title}</h3>
              <p className="text-slate-500 text-sm mb-4">{subtitle}</p>

              <div className="flex items-center gap-2 text-slate-700">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center">
                  <User className="w-4 h-4 text-slate-600" />
                </div>
                <div>
                  <div className="text-sm font-bold">{ownerName}</div>
                  <div className="text-xs text-slate-500">{ownerRole}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            {metrics.map((metric, index) => {
              const MetricIcon = metric.icon;
              return (
                <div
                  key={index}
                  className="bg-slate-50 rounded-xl p-4 border border-slate-200"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <MetricIcon className={`w-4 h-4 ${metric.color}`} />
                    <span className="text-xs text-slate-600">{metric.label}</span>
                  </div>
                  <div className={`text-2xl font-bold ${metric.color}`}>
                    {loading ? '...' : metric.value}
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={onEnter}
            disabled={loading}
            className={`w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r ${iconColor} text-white rounded-xl font-bold text-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <span>دخول غرفة العمليات</span>
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
