import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sprout,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  Users,
  TreePine,
  DollarSign,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface NewbornFarm {
  farm_id: string;
  farm_name: string;
  farm_location: string;
  farm_city: string;
  operational_status: string;

  birth_event_id: string;
  birth_date: string;
  days_since_birth: number;

  contract_id: string;
  contract_number: string;
  investor_phone: string;
  trees_count: number;
  amount_total: number;

  total_setup_tasks: number;
  completed_tasks: number;
  pending_tasks: number;
  completion_rate: number;

  urgency_level: 'new' | 'normal' | 'attention' | 'urgent';
  needs_attention: boolean;
}

interface NewbornStats {
  total_newborn_farms: number;
  by_urgency: {
    new: number;
    normal: number;
    attention: number;
    urgent: number;
  };
  avg_completion_rate: number;
  total_pending_tasks: number;
  farms_needing_urgent_attention: number;
  farms_with_zero_progress: number;
}

export default function NewBornFarmsAlert() {
  const navigate = useNavigate();
  const [farms, setFarms] = useState<NewbornFarm[]>([]);
  const [stats, setStats] = useState<NewbornStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    loadNewbornFarms();
  }, []);

  const loadNewbornFarms = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: farmsData, error: farmsError } = await supabase
        .rpc('get_newborn_farms_needing_activation', { p_days_threshold: 7 });

      if (farmsError) throw farmsError;

      const { data: statsData, error: statsError } = await supabase
        .rpc('get_newborn_farms_stats', { p_days_threshold: 7 });

      if (statsError) throw statsError;

      setFarms(farmsData || []);
      setStats(statsData || null);
    } catch (err: any) {
      console.error('Error loading newborn farms:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getUrgencyConfig = (level: string) => {
    const configs: Record<string, any> = {
      new: {
        label: 'جديدة',
        icon: Sprout,
        color: 'bg-green-100 text-green-700 border-green-200',
        bgColor: 'from-green-50 to-green-100',
        badgeColor: 'bg-green-500'
      },
      normal: {
        label: 'عادية',
        icon: Clock,
        color: 'bg-blue-100 text-blue-700 border-blue-200',
        bgColor: 'from-blue-50 to-blue-100',
        badgeColor: 'bg-blue-500'
      },
      attention: {
        label: 'تحتاج انتباه',
        icon: AlertTriangle,
        color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
        bgColor: 'from-yellow-50 to-yellow-100',
        badgeColor: 'bg-yellow-500'
      },
      urgent: {
        label: 'عاجلة',
        icon: AlertTriangle,
        color: 'bg-red-100 text-red-700 border-red-200',
        bgColor: 'from-red-50 to-red-100',
        badgeColor: 'bg-red-500'
      }
    };
    return configs[level] || configs.new;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 24) {
      return `منذ ${diffHours} ساعة`;
    } else if (diffDays === 1) {
      return 'منذ يوم واحد';
    } else if (diffDays < 7) {
      return `منذ ${diffDays} أيام`;
    }
    return date.toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-green-600 animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 rounded-xl border border-red-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600" />
            <p className="text-red-700">خطأ في تحميل المزارع الجديدة</p>
          </div>
          <button
            onClick={loadNewbornFarms}
            className="flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  if (!stats || stats.total_newborn_farms === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 rounded-2xl shadow-lg border-2 border-emerald-200 overflow-hidden mb-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-green-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <Sprout className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                مزارع وُلدت حديثًا
                <span className="px-3 py-1 bg-white/30 rounded-full text-sm font-black">
                  {stats.total_newborn_farms}
                </span>
              </h3>
              <p className="text-sm text-white/90 mt-0.5">
                تحتاج تفعيل وإكمال مهام التأسيس
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {stats.farms_needing_urgent_attention > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 bg-red-500/90 backdrop-blur-sm rounded-lg">
                <AlertTriangle className="w-5 h-5 text-white" />
                <span className="text-white font-semibold">
                  {stats.farms_needing_urgent_attention} عاجلة
                </span>
              </div>
            )}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-colors"
            >
              <ChevronRight
                className={`w-5 h-5 text-white transition-transform ${isCollapsed ? 'rotate-0' : 'rotate-90'}`}
              />
            </button>
          </div>
        </div>
      </div>

      {!isCollapsed && (
        <div className="p-6">
          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg p-4 border border-emerald-100">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span className="text-xs text-gray-600 font-medium">متوسط الإنجاز</span>
              </div>
              <p className="text-2xl font-bold text-emerald-600">
                {stats.avg_completion_rate}%
              </p>
            </div>

            <div className="bg-white rounded-lg p-4 border border-blue-100">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                <span className="text-xs text-gray-600 font-medium">مهام معلقة</span>
              </div>
              <p className="text-2xl font-bold text-blue-600">
                {stats.total_pending_tasks}
              </p>
            </div>

            <div className="bg-white rounded-lg p-4 border border-orange-100">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-orange-600" />
                <span className="text-xs text-gray-600 font-medium">بدون تقدم</span>
              </div>
              <p className="text-2xl font-bold text-orange-600">
                {stats.farms_with_zero_progress}
              </p>
            </div>

            <div className="bg-white rounded-lg p-4 border border-gray-100">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-gray-600" />
                <span className="text-xs text-gray-600 font-medium">إجمالي المزارع</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {stats.total_newborn_farms}
              </p>
            </div>
          </div>

          {/* Farms List */}
          <div className="space-y-3">
            {farms.map((farm) => {
              const urgencyConfig = getUrgencyConfig(farm.urgency_level);
              const UrgencyIcon = urgencyConfig.icon;

              return (
                <div
                  key={farm.farm_id}
                  className={`bg-gradient-to-r ${urgencyConfig.bgColor} rounded-xl p-5 border-2 ${urgencyConfig.color.replace('bg-', 'border-').replace('text-', 'border-')} hover:shadow-lg transition-all duration-200 cursor-pointer`}
                  onClick={() => navigate(`/admin/b2f/farm-command/farms/${farm.farm_id}`)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-lg font-bold text-gray-900">
                          {farm.farm_name}
                        </h4>
                        <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${urgencyConfig.color}`}>
                          <UrgencyIcon className="w-3.5 h-3.5" />
                          {urgencyConfig.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 flex items-center gap-2">
                        <span>{farm.farm_city}</span>
                        {farm.farm_location && <span>• {farm.farm_location}</span>}
                        <span>• {formatDate(farm.birth_date)}</span>
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <div className="bg-white/60 rounded-lg p-3">
                      <p className="text-xs text-gray-600 mb-1">رقم العقد</p>
                      <p className="text-sm font-mono font-semibold text-gray-900 truncate">
                        {farm.contract_number}
                      </p>
                    </div>
                    <div className="bg-white/60 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <TreePine className="w-3 h-3 text-green-600" />
                        <p className="text-xs text-gray-600">الأشجار</p>
                      </div>
                      <p className="text-sm font-bold text-green-600">
                        {farm.trees_count} شجرة
                      </p>
                    </div>
                    <div className="bg-white/60 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <DollarSign className="w-3 h-3 text-emerald-600" />
                        <p className="text-xs text-gray-600">قيمة العقد</p>
                      </div>
                      <p className="text-sm font-bold text-emerald-600">
                        {formatCurrency(farm.amount_total)}
                      </p>
                    </div>
                    <div className="bg-white/60 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Clock className="w-3 h-3 text-blue-600" />
                        <p className="text-xs text-gray-600">المهام</p>
                      </div>
                      <p className="text-sm font-bold text-blue-600">
                        {farm.completed_tasks}/{farm.total_setup_tasks}
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="bg-white/60 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-600 font-medium">
                        نسبة إكمال مهام التأسيس
                      </span>
                      <span className="text-sm font-bold text-gray-900">
                        {farm.completion_rate}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className={`h-2.5 rounded-full transition-all duration-500 ${
                          farm.completion_rate === 0
                            ? 'bg-red-500'
                            : farm.completion_rate < 50
                            ? 'bg-orange-500'
                            : farm.completion_rate < 100
                            ? 'bg-blue-500'
                            : 'bg-green-500'
                        }`}
                        style={{ width: `${farm.completion_rate}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
