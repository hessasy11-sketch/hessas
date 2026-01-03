import { useState, useEffect } from 'react';
import {
  Settings,
  MapPin,
  TrendingUp,
  FileCheck,
  ChevronLeft,
  X,
  ArrowRight,
  BarChart3,
  Users,
  Activity,
  Sparkles,
  Brain,
  RefreshCw,
  Plus,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingDown,
  Eye,
  Package,
  Zap,
  Target,
  Calendar,
  Bell,
  FileText
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useB2FFarms, B2FFarm } from '../../hooks/useB2FFarms';
import SettingsTab from './tabs/SettingsTab';
import OpportunitiesTab from './tabs/OpportunitiesTab';
import InvestmentRequestsTab from './tabs/InvestmentRequestsTab';
import OperationsTab from './tabs/OperationsTab';
import NotificationsManagementTab from './tabs/NotificationsManagementTab';
import AIAssistantManagementTab from './tabs/AIAssistantManagementTab';
import FarmsTab from './tabs/FarmsTab';
import SalesTab from './tabs/SalesTab';
import { SimpleContractsTab } from './tabs/SimpleContractsTab';
import FarmCard from './FarmCard';
import FarmDetailsView from './FarmDetailsView';
import B2FFarmFormModal from './B2FFarmFormModal';

interface EnhancedB2FDashboardProps {
  onClose: () => void;
}

type TabId = 'settings' | 'opportunities' | 'requests' | 'operations' | 'notifications' | 'farms' | 'sales' | 'contracts' | 'ai';
type ViewMode = 'main' | 'farmDetails';

interface Tab {
  id: TabId;
  title: string;
  icon: typeof Settings;
  gradient: string;
  iconBg: string;
  description: string;
  badge?: string;
}

interface EnhancedStats {
  totalFarms: number;
  activeFarms: number;
  totalOpportunities: number;
  activeOpportunities: number;
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  totalOperations: number;
  activeInvestors: number;
  totalRevenue: number;
  recentActivity: number;
  certificates: number;
}

interface FarmStats {
  opportunitiesCount: number;
  requestsCount: number;
}

interface QuickAction {
  id: string;
  title: string;
  icon: typeof Plus;
  gradient: string;
  action: () => void;
}

interface RecentActivity {
  id: string;
  type: 'request' | 'opportunity' | 'operation';
  title: string;
  time: string;
  status: 'success' | 'warning' | 'info';
}

export default function EnhancedB2FDashboard({ onClose }: EnhancedB2FDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabId | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('main');
  const [selectedFarm, setSelectedFarm] = useState<B2FFarm | null>(null);
  const [farmStats, setFarmStats] = useState<Record<string, FarmStats>>({});
  const [showAddFarmModal, setShowAddFarmModal] = useState(false);
  const { farms, loading: farmsLoading, addFarm, updateFarm, deleteFarm, toggleFarmStatus, reloadFarms } = useB2FFarms();
  const [stats, setStats] = useState<EnhancedStats>({
    totalFarms: 0,
    activeFarms: 0,
    totalOpportunities: 0,
    activeOpportunities: 0,
    totalRequests: 0,
    pendingRequests: 0,
    approvedRequests: 0,
    totalOperations: 0,
    activeInvestors: 0,
    totalRevenue: 0,
    recentActivity: 0,
    certificates: 0
  });
  const [loading, setLoading] = useState(true);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);

  useEffect(() => {
    loadEnhancedStats();
    loadRecentActivities();
  }, []);

  useEffect(() => {
    if (farms.length > 0) {
      loadFarmStats();
    }
  }, [farms]);

  const loadEnhancedStats = async () => {
    try {
      const [
        farmsRes,
        activeFarmsRes,
        opportunitiesRes,
        activeOpportunitiesRes,
        requestsRes,
        pendingRequestsRes,
        approvedRequestsRes,
        operationsRes,
        investorsRes,
        certificatesRes
      ] = await Promise.all([
        supabase.from('b2f_farms').select('id', { count: 'exact', head: true }),
        supabase.from('b2f_farms').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('b2f_opportunities').select('id', { count: 'exact', head: true }),
        supabase.from('b2f_opportunities').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('b2f_investment_requests').select('id', { count: 'exact', head: true }),
        supabase.from('b2f_investment_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('b2f_investment_requests').select('id', { count: 'exact', head: true }).in('status', ['receipt_approved_pending_invoice', 'invoice_issued', 'contract_issued', 'operational']),
        supabase.from('b2f_operation_cards').select('id', { count: 'exact', head: true }),
        supabase.from('b2f_investor_accounts').select('id', { count: 'exact', head: true }),
        supabase.from('b2f_certificates').select('id', { count: 'exact', head: true })
      ]);

      const revenueRes = await supabase
        .from('b2f_investment_requests')
        .select('total_amount')
        .in('status', ['receipt_approved_pending_invoice', 'invoice_issued', 'contract_issued', 'operational']);

      const totalRevenue = revenueRes.data?.reduce((sum, req) => sum + (req.total_amount || 0), 0) || 0;

      setStats({
        totalFarms: farmsRes.count || 0,
        activeFarms: activeFarmsRes.count || 0,
        totalOpportunities: opportunitiesRes.count || 0,
        activeOpportunities: activeOpportunitiesRes.count || 0,
        totalRequests: requestsRes.count || 0,
        pendingRequests: pendingRequestsRes.count || 0,
        approvedRequests: approvedRequestsRes.count || 0,
        totalOperations: operationsRes.count || 0,
        activeInvestors: investorsRes.count || 0,
        totalRevenue: totalRevenue,
        recentActivity: pendingRequestsRes.count || 0,
        certificates: certificatesRes.count || 0
      });
    } catch (error) {
      console.error('Error loading enhanced stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRecentActivities = async () => {
    try {
      const { data: requests } = await supabase
        .from('b2f_investment_requests')
        .select('id, investor_name, status, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      const activities: RecentActivity[] = (requests || []).map(req => ({
        id: req.id,
        type: 'request',
        title: `طلب جديد من ${req.investor_name}`,
        time: getRelativeTime(req.created_at),
        status: req.status === 'approved' ? 'success' : req.status === 'pending' ? 'warning' : 'info'
      }));

      setRecentActivities(activities);
    } catch (error) {
      console.error('Error loading recent activities:', error);
    }
  };

  const getRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    return `منذ ${diffDays} يوم`;
  };

  const loadFarmStats = async () => {
    try {
      const statsMap: Record<string, FarmStats> = {};

      for (const farm of farms) {
        const [oppsRes, reqsRes] = await Promise.all([
          supabase
            .from('b2f_opportunities')
            .select('id', { count: 'exact', head: true })
            .eq('farm_id', farm.id),
          supabase
            .from('b2f_investment_requests')
            .select('id', { count: 'exact', head: true })
            .eq('farm_id', farm.id)
        ]);

        statsMap[farm.id] = {
          opportunitiesCount: oppsRes.count || 0,
          requestsCount: reqsRes.count || 0
        };
      }

      setFarmStats(statsMap);
    } catch (error) {
      console.error('Error loading farm stats:', error);
    }
  };

  const handleFarmClick = (farm: B2FFarm) => {
    setSelectedFarm(farm);
    setViewMode('farmDetails');
  };

  const handleBackToMain = () => {
    setViewMode('main');
    setSelectedFarm(null);
    reloadFarms();
    loadEnhancedStats();
  };

  const handleAddFarm = async (farmData: any) => {
    const result = await addFarm(farmData);
    if (result.success) {
      setShowAddFarmModal(false);
      loadEnhancedStats();
    }
    return result;
  };

  const handleToggleFarmStatus = async (farmId: string, currentStatus: boolean) => {
    await toggleFarmStatus(farmId, currentStatus);
    loadEnhancedStats();
  };

  const quickActions: QuickAction[] = [
    {
      id: 'add-farm',
      title: 'إضافة مزرعة',
      icon: MapPin,
      gradient: 'from-emerald-500 to-teal-600',
      action: () => setShowAddFarmModal(true)
    },
    {
      id: 'opportunities',
      title: 'العروض',
      icon: TrendingUp,
      gradient: 'from-amber-500 to-orange-600',
      action: () => setActiveTab('opportunities')
    },
    {
      id: 'requests',
      title: 'الطلبات',
      icon: FileCheck,
      gradient: 'from-blue-500 to-indigo-600',
      action: () => setActiveTab('requests')
    },
    {
      id: 'operations',
      title: 'التشغيل',
      icon: Activity,
      gradient: 'from-purple-500 to-pink-600',
      action: () => setActiveTab('operations')
    }
  ];

  const tabs: Tab[] = [
    {
      id: 'settings',
      title: 'إعدادات القسم',
      icon: Settings,
      gradient: 'from-slate-500 to-slate-700',
      iconBg: 'from-slate-400 to-slate-600',
      description: 'الإعدادات العامة وتخصيص النصوص',
      badge: 'أساسي'
    },
    {
      id: 'opportunities',
      title: 'العروض الاستثمارية',
      icon: TrendingUp,
      gradient: 'from-amber-500 to-orange-600',
      iconBg: 'from-amber-400 to-orange-500',
      description: 'إنشاء وإدارة العروض المرتبطة بالمزارع',
      badge: `${stats.totalOpportunities} عرض`
    },
    {
      id: 'requests',
      title: 'طلبات الاستثمار',
      icon: FileCheck,
      gradient: 'from-blue-500 to-indigo-600',
      iconBg: 'from-blue-400 to-indigo-500',
      description: 'إدارة وتحويل طلبات الاستثمار للتشغيل',
      badge: `${stats.totalRequests} طلب`
    },
    {
      id: 'operations',
      title: 'التشغيل والمتابعة',
      icon: Activity,
      gradient: 'from-purple-500 to-pink-600',
      iconBg: 'from-purple-400 to-pink-500',
      description: 'متابعة التشغيل وإدارة بطاقات المزارع',
      badge: `${stats.totalOperations} عملية`
    },
    {
      id: 'notifications',
      title: 'إشعارات المستثمرين',
      icon: Bell,
      gradient: 'from-rose-500 to-pink-600',
      iconBg: 'from-rose-400 to-pink-500',
      description: 'إرسال إشعارات وإعلانات للمستثمرين',
      badge: 'جديد'
    },
    {
      id: 'farms',
      title: 'إدارة المزارع',
      icon: MapPin,
      gradient: 'from-green-500 to-emerald-600',
      iconBg: 'from-green-400 to-emerald-500',
      description: 'إدارة جميع المزارع والمواقع',
      badge: `${stats.totalFarms || 0} مزرعة`
    },
    {
      id: 'sales',
      title: 'إدارة المبيعات',
      icon: DollarSign,
      gradient: 'from-cyan-500 to-blue-600',
      iconBg: 'from-cyan-400 to-blue-500',
      description: 'متابعة المبيعات وطلبات التجميع',
      badge: 'متقدم'
    },
    {
      id: 'contracts',
      title: 'إصدار العقود',
      icon: FileText,
      gradient: 'from-teal-500 to-cyan-600',
      iconBg: 'from-teal-400 to-cyan-500',
      description: 'إصدار عقود الاستثمار بعد اعتماد السداد',
      badge: 'عقود'
    },
    {
      id: 'ai',
      title: 'المساعد الذكي',
      icon: Brain,
      gradient: 'from-violet-600 to-fuchsia-600',
      iconBg: 'from-violet-500 to-fuchsia-500',
      description: 'إدارة قاعدة المعرفة والتعلم الذاتي',
      badge: 'AI'
    }
  ];

  if (viewMode === 'farmDetails' && selectedFarm) {
    return (
      <FarmDetailsView
        farm={selectedFarm}
        onBack={handleBackToMain}
        onUpdate={reloadFarms}
        onDelete={handleBackToMain}
        onToggleStatus={() => handleToggleFarmStatus(selectedFarm.id, selectedFarm.is_active)}
      />
    );
  }

  if (activeTab) {
    const currentTab = tabs.find(t => t.id === activeTab);

    return (
      <div className="fixed inset-0 bg-gradient-to-br from-gray-50 to-gray-100 z-50 overflow-y-auto" dir="rtl">
        <div
          className={`sticky top-0 z-10 backdrop-blur-lg bg-gradient-to-r ${currentTab?.gradient} shadow-lg`}
        >
          <div className="px-4 py-4 flex items-center gap-3">
            <button
              onClick={() => setActiveTab(null)}
              className="p-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-all duration-200 hover:scale-105 active:scale-95"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex-1">
              <h2 className="text-xl font-black text-white mb-0.5">
                {currentTab?.title}
              </h2>
              <p className="text-sm text-white/90">
                {currentTab?.description}
              </p>
            </div>

            {currentTab?.badge && (
              <div className="bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full">
                <span className="text-xs font-bold text-white">
                  {currentTab.badge}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className={activeTab === 'requests' ? '' : 'p-4'}>
          {activeTab === 'settings' && <SettingsTab />}
          {activeTab === 'opportunities' && <OpportunitiesTab />}
          {activeTab === 'requests' && <InvestmentRequestsTab />}
          {activeTab === 'operations' && <OperationsTab />}
          {activeTab === 'notifications' && <NotificationsManagementTab />}
          {activeTab === 'farms' && <FarmsTab />}
          {activeTab === 'sales' && <SalesTab />}
          {activeTab === 'contracts' && <SimpleContractsTab />}
          {activeTab === 'ai' && <AIAssistantManagementTab />}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-emerald-50 via-white to-teal-50 z-50 overflow-y-auto" dir="rtl">
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="absolute top-10 right-10 w-72 h-72 bg-emerald-500 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-teal-500 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="sticky top-0 z-10 backdrop-blur-xl bg-white/90 border-b border-gray-200/50 shadow-lg">
        <div className="px-4 py-4 md:py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
                <Sparkles className="w-6 h-6 md:w-7 md:h-7 text-white" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-black bg-gradient-to-r from-emerald-700 to-teal-700 bg-clip-text text-transparent">
                  استثمار أشجار المزارع
                </h1>
                <p className="text-xs md:text-sm text-gray-600 mt-0.5">
                  لوحة التحكم الذكية المتطورة
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 md:p-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all duration-200 hover:scale-105 active:scale-95"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="relative z-10 p-4 max-w-7xl mx-auto">
        <div className="mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-4 md:p-5 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <MapPin className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <div className="text-right">
                  <p className="text-xs md:text-sm font-medium opacity-90">المزارع</p>
                  <p className="text-2xl md:text-3xl font-black mt-1">{loading ? '-' : stats.totalFarms}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs opacity-90">
                <CheckCircle className="w-3 h-3" />
                <span>{stats.activeFarms} نشط</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-4 md:p-5 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <div className="text-right">
                  <p className="text-xs md:text-sm font-medium opacity-90">العروض</p>
                  <p className="text-2xl md:text-3xl font-black mt-1">{loading ? '-' : stats.totalOpportunities}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs opacity-90">
                <Eye className="w-3 h-3" />
                <span>{stats.activeOpportunities} متاح</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-4 md:p-5 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <FileCheck className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <div className="text-right">
                  <p className="text-xs md:text-sm font-medium opacity-90">الطلبات</p>
                  <p className="text-2xl md:text-3xl font-black mt-1">{loading ? '-' : stats.totalRequests}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs opacity-90">
                <Clock className="w-3 h-3" />
                <span>{stats.pendingRequests} قيد المراجعة</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl p-4 md:p-5 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Users className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <div className="text-right">
                  <p className="text-xs md:text-sm font-medium opacity-90">المستثمرون</p>
                  <p className="text-2xl md:text-3xl font-black mt-1">{loading ? '-' : stats.activeInvestors}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs opacity-90">
                <Activity className="w-3 h-3" />
                <span>نشط</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-600 mb-1">إجمالي الإيرادات</p>
                <p className="text-xl md:text-2xl font-black text-gray-900">
                  {loading ? '-' : `${stats.totalRevenue.toLocaleString()} ر.س`}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <Target className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-600 mb-1">الطلبات المعتمدة</p>
                <p className="text-xl md:text-2xl font-black text-gray-900">
                  {loading ? '-' : stats.approvedRequests}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-600 mb-1">الشهادات الصادرة</p>
                <p className="text-xl md:text-2xl font-black text-gray-900">
                  {loading ? '-' : stats.certificates}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-lg md:text-xl font-black text-gray-900 mb-3">إجراءات سريعة</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  onClick={action.action}
                  className="group bg-white rounded-2xl p-4 shadow-md border border-gray-100 hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95"
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-sm font-bold text-gray-900">{action.title}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg md:text-xl font-black text-gray-900">المزارع المسجلة</h2>
              <button
                onClick={() => setShowAddFarmModal(true)}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl py-2 px-4 md:py-3 md:px-6 font-bold hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 flex items-center gap-2 text-sm md:text-base"
              >
                <Plus className="w-4 h-4 md:w-5 md:h-5" />
                <span>إضافة مزرعة</span>
              </button>
            </div>

            {farmsLoading ? (
              <div className="flex items-center justify-center py-12 bg-white rounded-2xl border border-gray-100">
                <div className="text-center">
                  <RefreshCw className="w-10 h-10 animate-spin text-emerald-600 mx-auto mb-3" />
                  <p className="text-sm text-gray-600 font-medium">جاري التحميل...</p>
                </div>
              </div>
            ) : farms.length === 0 ? (
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-12 text-center border-2 border-dashed border-gray-300">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center mx-auto mb-4">
                  <MapPin className="w-8 h-8 text-gray-500" />
                </div>
                <h3 className="text-xl font-black text-gray-900 mb-2">
                  لا توجد مزارع بعد
                </h3>
                <p className="text-gray-600 text-sm mb-6 max-w-md mx-auto">
                  ابدأ بإضافة أول مزرعة لتتمكن من إدارة العروض الاستثمارية
                </p>
                <button
                  onClick={() => setShowAddFarmModal(true)}
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl py-2.5 px-6 font-bold hover:from-emerald-700 hover:to-teal-700 transition-all inline-flex items-center gap-2 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
                >
                  <Plus className="w-5 h-5" />
                  إضافة مزرعة
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {farms.map((farm) => (
                  <FarmCard
                    key={farm.id}
                    farm={farm}
                    opportunitiesCount={farmStats[farm.id]?.opportunitiesCount || 0}
                    requestsCount={farmStats[farm.id]?.requestsCount || 0}
                    onClick={() => handleFarmClick(farm)}
                    onToggleStatus={() => handleToggleFarmStatus(farm.id, farm.is_active)}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <h2 className="text-lg md:text-xl font-black text-gray-900 mb-4">النشاط الأخير</h2>
            <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100">
              {recentActivities.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">لا يوجد نشاط حديث</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentActivities.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        activity.status === 'success' ? 'bg-green-100' :
                        activity.status === 'warning' ? 'bg-amber-100' :
                        'bg-blue-100'
                      }`}>
                        {activity.status === 'success' ? <CheckCircle className="w-4 h-4 text-green-600" /> :
                         activity.status === 'warning' ? <Clock className="w-4 h-4 text-amber-600" /> :
                         <AlertCircle className="w-4 h-4 text-blue-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{activity.title}</p>
                        <p className="text-xs text-gray-500">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-lg md:text-xl font-black text-gray-900 mb-4">أقسام الإدارة</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tabs.map((tab, index) => {
              const Icon = tab.icon;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="group relative bg-white rounded-2xl p-5 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 overflow-hidden hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    animationDelay: `${index * 100}ms`
                  }}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${tab.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>

                  <div className="relative">
                    <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gradient-to-br ${tab.iconBg} flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 mb-3`}>
                      <Icon className="w-6 h-6 md:w-7 md:h-7 text-white" />
                    </div>

                    <h3 className="text-base md:text-lg font-black text-gray-900 mb-2">
                      {tab.title}
                    </h3>
                    {tab.badge && (
                      <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full bg-gradient-to-r ${tab.gradient} text-white shadow-sm mb-2`}>
                        {tab.badge}
                      </span>
                    )}
                    <p className="text-xs md:text-sm text-gray-600 leading-relaxed mb-3">
                      {tab.description}
                    </p>

                    <div className="flex items-center gap-2 text-xs md:text-sm font-bold text-gray-400 group-hover:text-gray-700 transition-colors">
                      <span>فتح</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>

                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-all duration-1000"></div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-2xl md:rounded-3xl p-4 md:p-6 border border-blue-100 shadow-lg">
          <div className="flex items-start gap-3 md:gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg">
              <Zap className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>

            <div className="flex-1">
              <h3 className="text-base md:text-lg font-black text-blue-900 mb-2 md:mb-3">
                نظام منفصل ومتطور
              </h3>

              <div className="space-y-2 text-xs md:text-sm text-blue-800">
                <div className="flex items-start gap-2 md:gap-3">
                  <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 mt-1.5 flex-shrink-0 shadow-sm"></div>
                  <p className="leading-relaxed">معزول تماماً عن نظام المزادات</p>
                </div>
                <div className="flex items-start gap-2 md:gap-3">
                  <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 mt-1.5 flex-shrink-0 shadow-sm"></div>
                  <p className="leading-relaxed">تصميم متجاوب يعمل بشكل مثالي على جميع الأجهزة</p>
                </div>
                <div className="flex items-start gap-2 md:gap-3">
                  <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 mt-1.5 flex-shrink-0 shadow-sm"></div>
                  <p className="leading-relaxed">إحصائيات حية ومتقدمة لمتابعة الأداء</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="h-6"></div>

      {showAddFarmModal && (
        <B2FFarmFormModal
          onClose={() => setShowAddFarmModal(false)}
          onSave={handleAddFarm}
        />
      )}
    </div>
  );
}
