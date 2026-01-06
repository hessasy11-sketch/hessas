import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  User,
  Users,
  Package,
  Wrench,
  DollarSign,
  AlertTriangle,
  Clock,
  CheckCircle,
  Lock,
  TrendingUp,
  TrendingDown,
  Loader2,
  Edit,
  Activity,
  BarChart3,
  FileCheck
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import FarmTeamManagement from './FarmTeamManagement';
import FarmTasksManagement from './FarmTasksManagement';
import FarmContentsView from '../B2F/farmCommand/FarmContentsView';
import EquipmentView from '../B2F/farmCommand/EquipmentView';
import FinanceCalculatorView from '../B2F/farmCommand/FinanceCalculatorView';
import ActivityTimelineTab from './ActivityTimelineTab';
import FarmDailySummaryCard from './FarmDailySummaryCard';

interface FarmDetail {
  id: string;
  name: string;
  location: string;
  city: string;
  operational_status: string;
  suspended_at: string | null;
  suspended_reason: string | null;
  created_at: string;
}

interface FarmStats {
  readiness_score: number;
  manager_name: string | null;
  teams_count: number;
  contents_count: number;
  equipment_count: number;
  open_issues: number;
  monthly_revenue: number;
  monthly_expenses: number;
  monthly_net: number;
}

type Tab = 'overview' | 'contents' | 'team' | 'tasks' | 'equipment' | 'calculator' | 'timeline';

export default function FarmDetailPage() {
  const { farmId } = useParams<{ farmId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [farm, setFarm] = useState<FarmDetail | null>(null);
  const [stats, setStats] = useState<FarmStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get tab from URL or default to 'overview'
  const initialTab = (searchParams.get('tab') as Tab) || 'overview';
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);

  useEffect(() => {
    if (farmId) {
      loadFarmDetails();
    }
  }, [farmId]);

  const loadFarmDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: farmData, error: farmError } = await supabase
        .from('b2f_farms')
        .select('*')
        .eq('id', farmId)
        .maybeSingle();

      if (farmError) throw farmError;
      if (!farmData) throw new Error('المزرعة غير موجودة');

      setFarm(farmData);

      // Set default stats - FC tables are not yet implemented
      setStats({
        readiness_score: 75,
        manager_name: null,
        teams_count: 0,
        contents_count: 0,
        equipment_count: 0,
        open_issues: 0,
        monthly_revenue: 0,
        monthly_expenses: 0,
        monthly_net: 0
      });

      console.log('✅ Farm loaded - Stats using default values (FC system not yet implemented)');
    } catch (err: any) {
      console.error('Error loading farm details:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, any> = {
      setup: {
        label: 'إعداد',
        icon: Clock,
        color: 'bg-blue-100 text-blue-700',
        borderColor: 'border-blue-200'
      },
      active: {
        label: 'نشطة',
        icon: CheckCircle,
        color: 'bg-green-100 text-green-700',
        borderColor: 'border-green-200'
      },
      suspended: {
        label: 'موقوفة',
        icon: Lock,
        color: 'bg-red-100 text-red-700',
        borderColor: 'border-red-200'
      }
    };
    return configs[status] || configs.setup;
  };

  const getReadinessColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const handleRequestStatusChange = async () => {
    const newStatus = prompt('أدخل الحالة الجديدة (setup, active, suspended):');
    if (!newStatus) return;

    if (!['setup', 'active', 'suspended'].includes(newStatus)) {
      alert('حالة غير صحيحة');
      return;
    }

    const reason = prompt('أدخل سبب التغيير:');
    if (!reason) return;

    try {
      const { error } = await supabase.rpc('create_approval_request', {
        p_request_type: 'change_status',
        p_farm_id: farmId,
        p_requested_by: 'current_user_id',
        p_request_data: { new_status: newStatus, reason }
      });

      if (error) throw error;

      alert('تم إنشاء طلب التغيير بنجاح. في انتظار الموافقة.');
    } catch (err: any) {
      alert('حدث خطأ: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (error || !farm || !stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
        <div className="max-w-2xl mx-auto text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">حدث خطأ</h2>
          <p className="text-gray-600">{error || 'المزرعة غير موجودة'}</p>
          <button
            onClick={() => navigate('/admin/b2f/farm-command')}
            className="mt-6 px-6 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"
          >
            العودة إلى القيادة
          </button>
        </div>
      </div>
    );
  }

  const statusConfig = getStatusConfig(farm.operational_status);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate('/admin/b2f/farm-command')}
          className="flex items-center gap-2 text-gray-700 hover:text-emerald-600 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          العودة إلى القيادة
        </button>

        {/* Farm Header */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-3">
                <h1 className="text-4xl font-black text-gray-900">{farm.name}</h1>
                <span
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${statusConfig.color}`}
                >
                  <StatusIcon className="w-5 h-5" />
                  {statusConfig.label}
                </span>
              </div>
              <div className="flex items-center gap-2 text-gray-600 mb-2">
                <MapPin className="w-5 h-5" />
                <span className="text-lg">
                  {farm.city}
                  {farm.location && ` • ${farm.location}`}
                </span>
              </div>
              {stats.manager_name && (
                <div className="flex items-center gap-2 text-gray-600">
                  <User className="w-5 h-5" />
                  <span>المدير: {stats.manager_name}</span>
                </div>
              )}
            </div>

            {/* Readiness Score */}
            <div className="text-center bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6 border-2 border-emerald-200">
              <div className={`text-6xl font-black mb-2 ${getReadinessColor(stats.readiness_score)}`}>
                {stats.readiness_score}%
              </div>
              <p className="text-sm font-medium text-gray-700">درجة الجاهزية</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-6 border-t border-gray-200">
            <button
              onClick={handleRequestStatusChange}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
            >
              <Edit className="w-4 h-4" />
              طلب تغيير الحالة
            </button>
            <button
              onClick={() => navigate(`/admin/b2f/farm-command/farms/${farmId}/operations`)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Activity className="w-4 h-4" />
              عرض العمليات
            </button>
          </div>

          {/* Suspended Info */}
          {farm.operational_status === 'suspended' && farm.suspended_at && (
            <div className="mt-6 p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-red-600" />
                <div className="flex-1">
                  <p className="font-semibold text-red-900">
                    المزرعة موقوفة منذ {new Date(farm.suspended_at).toLocaleDateString('ar-SA')}
                  </p>
                  {farm.suspended_reason && (
                    <p className="text-sm text-red-700 mt-1">السبب: {farm.suspended_reason}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-xl mb-8">
          <div className="border-b border-gray-200">
            <div className="flex gap-2 p-4 overflow-x-auto">
              <button
                onClick={() => setActiveTab('overview')}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'overview'
                    ? 'border-emerald-500 text-emerald-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                <BarChart3 className="w-5 h-5" />
                نظرة عامة
              </button>
              <button
                onClick={() => setActiveTab('contents')}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'contents'
                    ? 'border-emerald-500 text-emerald-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                <Package className="w-5 h-5" />
                محتويات المزرعة
              </button>
              <button
                onClick={() => setActiveTab('team')}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'team'
                    ? 'border-emerald-500 text-emerald-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                <Users className="w-5 h-5" />
                فريق المزرعة
              </button>
              <button
                onClick={() => setActiveTab('tasks')}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'tasks'
                    ? 'border-emerald-500 text-emerald-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                <FileCheck className="w-5 h-5" />
                مهام التشغيل
              </button>
              <button
                onClick={() => setActiveTab('equipment')}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'equipment'
                    ? 'border-emerald-500 text-emerald-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                <Wrench className="w-5 h-5" />
                المعدات
              </button>
              <button
                onClick={() => setActiveTab('calculator')}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'calculator'
                    ? 'border-emerald-500 text-emerald-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                <DollarSign className="w-5 h-5" />
                الحاسبة
              </button>
              <button
                onClick={() => setActiveTab('timeline')}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'timeline'
                    ? 'border-emerald-500 text-emerald-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                <Clock className="w-5 h-5" />
                السجل الزمني
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'overview' && (
              <>
                {/* Daily Summary Card */}
                <div className="mb-8">
                  <FarmDailySummaryCard farmId={farmId!} />
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  {/* Teams */}
                  <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-blue-500">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                        <Users className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-3xl font-black text-gray-900">{stats.teams_count}</p>
                        <p className="text-sm text-gray-600">فرق العمل</p>
                      </div>
                    </div>
                  </div>

                  {/* Contents */}
                  <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-purple-500">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                        <Package className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-3xl font-black text-gray-900">{stats.contents_count}</p>
                        <p className="text-sm text-gray-600">المحتويات</p>
                      </div>
                    </div>
                  </div>

                  {/* Equipment */}
                  <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-orange-500">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                        <Wrench className="w-6 h-6 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-3xl font-black text-gray-900">{stats.equipment_count}</p>
                        <p className="text-sm text-gray-600">المعدات</p>
                      </div>
                    </div>
                  </div>

                  {/* Issues */}
                  <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-red-500">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                        <AlertTriangle className="w-6 h-6 text-red-600" />
                      </div>
                      <div>
                        <p className="text-3xl font-black text-gray-900">{stats.open_issues}</p>
                        <p className="text-sm text-gray-600">أعطال مفتوحة</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="bg-white rounded-2xl shadow-xl p-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                    <DollarSign className="w-7 h-7 text-emerald-600" />
                    الملخص المالي - الشهر الحالي
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Revenue */}
                    <div className="p-6 bg-green-50 rounded-xl border-2 border-green-200">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-5 h-5 text-green-600" />
                        <p className="text-sm font-medium text-green-900">الإيرادات</p>
                      </div>
                      <p className="text-3xl font-black text-green-600">
                        {formatCurrency(stats.monthly_revenue)}
                      </p>
                    </div>

                    {/* Expenses */}
                    <div className="p-6 bg-red-50 rounded-xl border-2 border-red-200">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingDown className="w-5 h-5 text-red-600" />
                        <p className="text-sm font-medium text-red-900">المصاريف</p>
                      </div>
                      <p className="text-3xl font-black text-red-600">
                        {formatCurrency(stats.monthly_expenses)}
                      </p>
                    </div>

                    {/* Net */}
                    <div
                      className={`p-6 rounded-xl border-2 ${
                        stats.monthly_net >= 0
                          ? 'bg-blue-50 border-blue-200'
                          : 'bg-orange-50 border-orange-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {stats.monthly_net >= 0 ? (
                          <TrendingUp className="w-5 h-5 text-blue-600" />
                        ) : (
                          <TrendingDown className="w-5 h-5 text-orange-600" />
                        )}
                        <p
                          className={`text-sm font-medium ${
                            stats.monthly_net >= 0 ? 'text-blue-900' : 'text-orange-900'
                          }`}
                        >
                          الصافي
                        </p>
                      </div>
                      <p
                        className={`text-3xl font-black ${
                          stats.monthly_net >= 0 ? 'text-blue-600' : 'text-orange-600'
                        }`}
                      >
                        {formatCurrency(Math.abs(stats.monthly_net))}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'contents' && (
              <FarmContentsView farmId={farmId!} />
            )}

            {activeTab === 'team' && (
              <FarmTeamManagement farmId={farmId!} farmName={farm.name} />
            )}

            {activeTab === 'tasks' && (
              <FarmTasksManagement farmId={farmId!} farmName={farm.name} />
            )}

            {activeTab === 'equipment' && (
              <EquipmentView farmId={farmId!} />
            )}

            {activeTab === 'calculator' && (
              <FinanceCalculatorView farmId={farmId!} />
            )}

            {activeTab === 'timeline' && (
              <ActivityTimelineTab farmId={farmId!} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
