import { useState, useEffect } from 'react';
import {
  MapPin,
  TrendingUp,
  FileCheck,
  ChevronLeft,
  X,
  ArrowRight,
  Users,
  Activity,
  Sparkles,
  CheckCircle,
  Clock,
  Eye,
  Zap,
  Sprout,
  FileText,
  UserCog,
  Bell,
  Brain,
  Settings,
  Wallet,
  DollarSign
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import FarmsTab from './tabs/FarmsTab';
import OpportunitiesTab from './tabs/OpportunitiesTab';
import Finance2Section from './Finance2Section';
import SalesTab from './tabs/SalesTab';
import ContractsTab from './tabs/ContractsTab';
import FarmLevelOperationsTab from './tabs/FarmLevelOperationsTab';
import InvestorServiceTab from './tabs/InvestorServiceTab';
import NotificationsManagementTab from './tabs/NotificationsManagementTab';
import AIAssistantManagementTab from './tabs/AIAssistantManagementTab';
import SettingsTab from './tabs/SettingsTab';
import ManagementReportsView from './admin/ManagementReportsView';

interface B2FControlPanelProps {
  onClose: () => void;
}

type TabId = 'settings' | 'farms' | 'opportunities' | 'finance' | 'sales' | 'contracts' | 'operations' | 'reports' | 'investor_service' | 'notifications' | 'ai';

interface Tab {
  id: TabId;
  title: string;
  icon: typeof Sprout;
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
  totalSalesRequests: number;
  collectionQueue: number;
  receiptsNeedReview: number;
  receiptsApproved: number;
  totalContracts: number;
  totalOperations: number;
  activeInvestors: number;
  totalNotifications: number;
  unreadNotifications: number;
}

export default function B2FControlPanel({ onClose }: B2FControlPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId | null>(null);
  const [stats, setStats] = useState<EnhancedStats>({
    totalFarms: 0,
    activeFarms: 0,
    totalOpportunities: 0,
    activeOpportunities: 0,
    totalSalesRequests: 0,
    collectionQueue: 0,
    receiptsNeedReview: 0,
    receiptsApproved: 0,
    totalContracts: 0,
    totalOperations: 0,
    activeInvestors: 0,
    totalNotifications: 0,
    unreadNotifications: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [
        farmsRes,
        activeFarmsRes,
        opportunitiesRes,
        activeOpportunitiesRes,
        salesRequestsRes,
        collectionQueueRes,
        receiptsNeedReviewRes,
        receiptsApprovedRes,
        contractsRes,
        operationsRes,
        investorsRes,
        notificationsRes,
        unreadNotificationsRes
      ] = await Promise.all([
        supabase.from('b2f_farms').select('id', { count: 'exact', head: true }),
        supabase.from('b2f_farms').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('b2f_opportunities').select('id', { count: 'exact', head: true }),
        supabase.from('b2f_opportunities').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('b2f_sales_requests').select('id', { count: 'exact', head: true }),
        supabase.from('b2f_sales_requests').select('id', { count: 'exact', head: true }).eq('status', 'collection_queue'),
        supabase.from('b2f_sales_requests').select('id', { count: 'exact', head: true }).in('status', ['receipt_needs_revision', 'receipt_under_review']),
        supabase.from('b2f_sales_requests').select('id', { count: 'exact', head: true }).eq('status', 'receipt_approved'),
        supabase.from('b2f_sales_requests').select('id', { count: 'exact', head: true }).eq('status', 'contract_issued'),
        supabase.from('b2f_tree_operations').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('b2f_investor_accounts').select('id', { count: 'exact', head: true }),
        supabase.from('b2f_notifications').select('id', { count: 'exact', head: true }),
        supabase.from('b2f_notifications').select('id', { count: 'exact', head: true }).eq('is_read', false)
      ]);

      setStats({
        totalFarms: farmsRes.count || 0,
        activeFarms: activeFarmsRes.count || 0,
        totalOpportunities: opportunitiesRes.count || 0,
        activeOpportunities: activeOpportunitiesRes.count || 0,
        totalSalesRequests: salesRequestsRes.count || 0,
        collectionQueue: collectionQueueRes.count || 0,
        receiptsNeedReview: receiptsNeedReviewRes.count || 0,
        receiptsApproved: receiptsApprovedRes.count || 0,
        totalContracts: contractsRes.count || 0,
        totalOperations: operationsRes.count || 0,
        activeInvestors: investorsRes.count || 0,
        totalNotifications: notificationsRes.count || 0,
        unreadNotifications: unreadNotificationsRes.count || 0
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs: Tab[] = [
    {
      id: 'farms',
      title: '1️⃣ إدارة المزارع',
      icon: Sprout,
      gradient: 'from-emerald-500 to-teal-600',
      iconBg: 'from-emerald-400 to-teal-500',
      description: 'إضافة وإدارة المزارع المرجعية',
      badge: `${stats.totalFarms} مزرعة`
    },
    {
      id: 'opportunities',
      title: '2️⃣ العروض الاستثمارية',
      icon: TrendingUp,
      gradient: 'from-amber-500 to-orange-600',
      iconBg: 'from-amber-400 to-orange-500',
      description: 'إنشاء وإدارة العروض المرتبطة بالمزارع',
      badge: `${stats.totalOpportunities} عرض`
    },
    {
      id: 'finance',
      title: '3️⃣ المالية',
      icon: DollarSign,
      gradient: 'from-emerald-600 to-teal-600',
      iconBg: 'from-emerald-500 to-teal-500',
      description: 'إدارة الفواتير + بوابات الدفع + التحصيل',
      badge: `${stats.collectionQueue} في التحصيل`
    },
    {
      id: 'sales',
      title: '4️⃣ المبيعات',
      icon: FileCheck,
      gradient: 'from-blue-500 to-cyan-600',
      iconBg: 'from-blue-400 to-cyan-500',
      description: 'استقبال الطلبات + فتح الدفع + الإيصالات',
      badge: `${stats.totalSalesRequests} طلب`
    },
    {
      id: 'contracts',
      title: '5️⃣ العقود',
      icon: FileText,
      gradient: 'from-indigo-500 to-purple-600',
      iconBg: 'from-indigo-400 to-purple-500',
      description: 'إدارة عقود الاستنفاع الصادرة',
      badge: `${stats.totalContracts} عقد`
    },
    {
      id: 'operations',
      title: '6️⃣ التشغيل والمتابعة',
      icon: Activity,
      gradient: 'from-teal-500 to-emerald-600',
      iconBg: 'from-teal-400 to-emerald-500',
      description: 'نظام التشغيل المركزي - تحديث واحد يصل لجميع المستثمرين',
      badge: 'مركزي'
    },
    {
      id: 'reports',
      title: '7️⃣ تقارير التوثيق',
      icon: FileText,
      gradient: 'from-rose-500 to-pink-600',
      iconBg: 'from-rose-400 to-pink-500',
      description: 'تقارير المشرفين ومدراء المزارع المرسلة للإدارة',
      badge: 'إدارة'
    },
    {
      id: 'investor_service',
      title: '8️⃣ خدمة المستثمر',
      icon: UserCog,
      gradient: 'from-purple-500 to-pink-600',
      iconBg: 'from-purple-400 to-pink-500',
      description: 'إدارة المستثمرين والتواصل معهم',
      badge: `${stats.activeInvestors} مستثمر`
    },
    {
      id: 'notifications',
      title: '9️⃣ الإشعارات',
      icon: Bell,
      gradient: 'from-teal-500 to-cyan-600',
      iconBg: 'from-teal-400 to-cyan-500',
      description: 'إرسال وإدارة إشعارات المستثمرين',
      badge: `${stats.unreadNotifications} غير مقروء`
    },
    {
      id: 'ai',
      title: '🔟 المساعد الذكي',
      icon: Brain,
      gradient: 'from-violet-600 to-fuchsia-600',
      iconBg: 'from-violet-500 to-fuchsia-500',
      description: 'إدارة قاعدة المعرفة والتعلم الذاتي',
      badge: 'AI'
    },
    {
      id: 'settings',
      title: '0️⃣ إعدادات القسم',
      icon: Settings,
      gradient: 'from-slate-500 to-slate-700',
      iconBg: 'from-slate-400 to-slate-600',
      description: 'الإعدادات العامة وتخصيص النصوص',
      badge: 'أساسي'
    }
  ];

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

        <div className="p-4">
          {activeTab === 'settings' && <SettingsTab />}
          {activeTab === 'farms' && <FarmsTab />}
          {activeTab === 'opportunities' && <OpportunitiesTab />}
          {activeTab === 'finance' && <Finance2Section />}
          {activeTab === 'sales' && <SalesTab />}
          {activeTab === 'contracts' && <ContractsTab />}
          {activeTab === 'operations' && <FarmLevelOperationsTab />}
          {activeTab === 'reports' && <ManagementReportsView />}
          {activeTab === 'investor_service' && <InvestorServiceTab />}
          {activeTab === 'notifications' && <NotificationsManagementTab />}
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

        <div className="hidden md:block px-4 pb-4">
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-4 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium opacity-90">المزارع</p>
                  <p className="text-2xl font-black mt-1">{loading ? '-' : stats.totalFarms}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs opacity-90">
                <CheckCircle className="w-3 h-3" />
                <span>{stats.activeFarms} نشط</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-4 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium opacity-90">العروض</p>
                  <p className="text-2xl font-black mt-1">{loading ? '-' : stats.totalOpportunities}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs opacity-90">
                <Eye className="w-3 h-3" />
                <span>{stats.activeOpportunities} متاح</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl p-4 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium opacity-90">المبيعات</p>
                  <p className="text-2xl font-black mt-1">{loading ? '-' : stats.totalSalesRequests}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs opacity-90">
                <Clock className="w-3 h-3" />
                <span>{stats.collectionQueue} في الانتظار</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-4 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium opacity-90">العقود</p>
                  <p className="text-2xl font-black mt-1">{loading ? '-' : stats.totalContracts}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs opacity-90">
                <CheckCircle className="w-3 h-3" />
                <span>صادر</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 p-4 max-w-7xl mx-auto">
        <div className="mb-6">
          <h2 className="text-lg md:text-xl font-black text-gray-900 mb-2">أقسام الإدارة</h2>
          <p className="text-sm text-gray-600">جميع أدوات وأقسام إدارة نظام استثمار أشجار المزارع</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
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

        <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-2xl md:rounded-3xl p-4 md:p-6 border border-blue-100 shadow-lg">
          <div className="flex items-start gap-3 md:gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg">
              <Zap className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>

            <div className="flex-1">
              <h3 className="text-base md:text-lg font-black text-blue-900 mb-2 md:mb-3">
                خط السير الرسمي
              </h3>

              <div className="space-y-2 text-xs md:text-sm text-blue-800">
                <div className="flex items-start gap-2 md:gap-3">
                  <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 mt-1.5 flex-shrink-0 shadow-sm"></div>
                  <p className="leading-relaxed"><strong>إدارة → عرض → بيع → عقد → تشغيل → خدمة المستثمر</strong></p>
                </div>
                <div className="flex items-start gap-2 md:gap-3">
                  <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 mt-1.5 flex-shrink-0 shadow-sm"></div>
                  <p className="leading-relaxed">أقسام منفصلة بدون دمج لضمان وضوح المسار</p>
                </div>
                <div className="flex items-start gap-2 md:gap-3">
                  <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 mt-1.5 flex-shrink-0 shadow-sm"></div>
                  <p className="leading-relaxed">معزول تماماً عن نظام مزاد الشركات</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="h-6"></div>
    </div>
  );
}
