import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Crown, X, AlertCircle, Store, Sprout, Clock, FileText, Headphones, AlertTriangle, Network, Shield } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import GatewayCard from './GatewayCard';
import DecisionIndicator from './DecisionIndicator';
import SystemPulse from './SystemPulse';
import OrgStructureView from './OrgStructureView';
import RootAccessBadge from './RootAccessBadge';

interface Props {
  onClose: () => void;
  onNavigateToB2F?: () => void;
  onNavigateToAuctions?: () => void;
}

interface DecisionBoardData {
  gateways: {
    b2f: {
      status: 'stable' | 'warning' | 'critical';
      message: string;
      priority: string;
      metrics: any;
    };
    b2b: {
      status: 'stable' | 'warning' | 'critical';
      message: string;
      priority: string;
      metrics: any;
    };
  };
  indicators: {
    overdue_sla: {
      count: number;
      severity: 'low' | 'medium' | 'high' | 'critical';
      label: string;
    };
    unreviewed_docs: {
      count: number;
      severity: 'low' | 'medium' | 'high' | 'critical';
      label: string;
    };
    pending_service: {
      count: number;
      severity: 'low' | 'medium' | 'high' | 'critical';
      label: string;
    };
    critical_alerts: {
      count: number;
      severity: 'low' | 'medium' | 'high' | 'critical';
      label: string;
    };
  };
  pulse: {
    operations_status: 'stable' | 'pressure' | 'error' | 'inactive';
    operations_label: string;
    documentation: {
      count: number;
      label: string;
    };
    service: {
      count: number;
      label: string;
    };
  };
}

export default function PlatformCommandCenterV2({ onClose, onNavigateToB2F, onNavigateToAuctions }: Props) {
  const [data, setData] = useState<DecisionBoardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [platformRole, setPlatformRole] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'dashboard' | 'orgstructure'>('dashboard');
  const { isPlatformOwner } = useAuth();

  useEffect(() => {
    checkAccess();
  }, []);

  useEffect(() => {
    if (platformRole) {
      loadData();
      const interval = setInterval(loadData, 30000);
      return () => clearInterval(interval);
    }
  }, [platformRole]);

  const checkAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('يجب تسجيل الدخول أولاً');
        onClose();
        return;
      }

      if (isPlatformOwner) {
        setPlatformRole('platform_owner');
        return;
      }

      const { data: role } = await supabase.rpc('get_platform_role', {
        check_user_id: user.id
      });

      if (!role) {
        alert('ليس لديك صلاحية الوصول لبوابة قيادة المنصة');
        onClose();
        return;
      }

      setPlatformRole(role);
    } catch (error) {
      console.error('Error checking access:', error);
      alert('حدث خطأ في التحقق من الصلاحيات');
      onClose();
    }
  };

  const loadData = async () => {
    try {
      const { data: boardData, error } = await supabase.rpc('get_decision_board');

      if (error) throw error;

      setData(boardData);
    } catch (error) {
      console.error('Error loading decision board:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleIndicatorClick = (type: string) => {
    alert(`عرض تفصيلي لـ: ${type}\n(سيتم التطوير لاحقاً)`);
  };

  if (loading || !data) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
        <div className="bg-white rounded-xl p-8 text-center shadow-2xl">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">جاري تحميل لوحة القرار...</p>
        </div>
      </div>
    );
  }

  if (activeView === 'orgstructure') {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 overflow-hidden">
        <div className="h-full flex flex-col">
          <div className="bg-gradient-to-r from-slate-800 via-gray-900 to-slate-800 text-white px-6 py-4 shadow-2xl">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <button
                onClick={() => setActiveView('dashboard')}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-all"
              >
                <Crown className="w-5 h-5" />
                <span className="font-bold">العودة للوحة القيادة</span>
              </button>
              <button
                onClick={onClose}
                className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            <OrgStructureView />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 overflow-hidden">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 via-gray-900 to-slate-800 text-white px-6 py-5 shadow-2xl">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
                <Crown className="w-9 h-9 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold mb-1 flex items-center gap-3">
                  لوحة قيادة المنصة
                  {isPlatformOwner && <RootAccessBadge />}
                </h1>
                <p className="text-slate-300 text-sm">
                  {platformRole === 'platform_owner' ? 'مالك المنصة - صلاحيات مطلقة' : 'مدير عام'} - إشراف واتخاذ قرار
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveView('orgstructure')}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-slate-600 to-gray-700 hover:from-slate-700 hover:to-gray-800 rounded-lg font-bold transition-all shadow-lg hover:shadow-xl"
              >
                <Network className="w-5 h-5" />
                الهيكلة والصلاحيات
              </button>
              <button
                onClick={onClose}
                className="w-12 h-12 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-all hover:scale-110"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
            {/* شريط توضيحي ثابت */}
            <div className="bg-gradient-to-r from-blue-50 to-sky-50 border-2 border-blue-200 rounded-xl p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-blue-900 text-lg mb-2">
                    لوحة قيادة إشرافية — قراءة ومتابعة فقط
                  </h3>
                  <p className="text-sm text-blue-800 leading-relaxed">
                    هذه اللوحة للمتابعة واتخاذ القرار. للدخول التنفيذي، استخدم بوابات الأقسام بالأسفل.
                  </p>
                </div>
              </div>
            </div>

            {/* بوابات القيادة */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <div className="w-1 h-6 bg-orange-500 rounded-full"></div>
                بوابات القيادة
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <GatewayCard
                  title="بوابة استثمار أشجار المزارع (B2F)"
                  icon={Sprout}
                  status={data.gateways.b2f.status}
                  message={data.gateways.b2f.message}
                  onClick={() => onNavigateToB2F?.()}
                />
                <GatewayCard
                  title="بوابة مزاد الشركات (B2B)"
                  icon={Store}
                  status={data.gateways.b2b.status}
                  message={data.gateways.b2b.message}
                  onClick={() => onNavigateToAuctions?.()}
                />
              </div>
            </div>

            {/* مؤشرات القرار السريع */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <div className="w-1 h-6 bg-orange-500 rounded-full"></div>
                مؤشرات القرار السريع
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <DecisionIndicator
                  icon={Clock}
                  label={data.indicators.overdue_sla.label}
                  count={data.indicators.overdue_sla.count}
                  severity={data.indicators.overdue_sla.severity}
                  onClick={() => handleIndicatorClick('مهام متأخرة')}
                />
                <DecisionIndicator
                  icon={FileText}
                  label={data.indicators.unreviewed_docs.label}
                  count={data.indicators.unreviewed_docs.count}
                  severity={data.indicators.unreviewed_docs.severity}
                  onClick={() => handleIndicatorClick('تقارير توثيق')}
                />
                <DecisionIndicator
                  icon={Headphones}
                  label={data.indicators.pending_service.label}
                  count={data.indicators.pending_service.count}
                  severity={data.indicators.pending_service.severity}
                  onClick={() => handleIndicatorClick('طلبات خدمة')}
                />
                <DecisionIndicator
                  icon={AlertTriangle}
                  label={data.indicators.critical_alerts.label}
                  count={data.indicators.critical_alerts.count}
                  severity={data.indicators.critical_alerts.severity}
                  onClick={() => handleIndicatorClick('تنبيهات حرجة')}
                />
              </div>
            </div>

            {/* شريط النبض العام */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <div className="w-1 h-6 bg-orange-500 rounded-full"></div>
                النبض العام
              </h2>
              <SystemPulse data={data.pulse} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
