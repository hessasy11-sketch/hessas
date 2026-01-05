import { useState, useEffect } from 'react';
import {
  MapPin,
  TrendingUp,
  FileCheck,
  ChevronLeft,
  X,
  ArrowRight,
  LogOut,
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
import InvestorServiceTab from './tabs/InvestorServiceTab';
import NotificationsManagementTab from './tabs/NotificationsManagementTab';
import AIAssistantManagementTab from './tabs/AIAssistantManagementTab';
import SettingsTab from './tabs/SettingsTab';
import InvestmentApprovalsTab from './tabs/InvestmentApprovalsTab';
import FarmCommandTab from './tabs/FarmCommandTab';

interface B2FControlPanelProps {
  onClose: () => void;
}

type TabId = 'settings' | 'farms' | 'opportunities' | 'finance' | 'sales' | 'contracts' | 'farm_command' | 'investor_service' | 'notifications' | 'ai' | 'investment_approvals';

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
        supabase.from('b2f_farm_operations').select('id', { count: 'exact', head: true }).eq('is_active', true),
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

  const tabSections = [
    {
      title: '1️⃣ البداية - تأسيس المزارع',
      icon: MapPin,
      color: 'from-emerald-600 to-teal-700',
      tabs: [
        {
          id: 'farms' as TabId,
          title: '1. إضافة مزارع',
          icon: Sprout,
          gradient: 'from-emerald-500 to-teal-600',
          iconBg: 'from-emerald-400 to-teal-500',
          description: 'الخطوة الأولى - إضافة وإدارة المزارع المرجعية',
          badge: `${stats.totalFarms} مزرعة`
        }
      ]
    },
    {
      title: '2️⃣ العرض - الفرص الاستثمارية',
      icon: TrendingUp,
      color: 'from-amber-600 to-orange-700',
      tabs: [
        {
          id: 'opportunities' as TabId,
          title: '2. العروض الاستثمارية',
          icon: TrendingUp,
          gradient: 'from-amber-500 to-orange-600',
          iconBg: 'from-amber-400 to-orange-500',
          description: 'الخطوة الثانية - إنشاء عروض مرتبطة بالمزارع',
          badge: `${stats.totalOpportunities} عرض`
        }
      ]
    },
    {
      title: '3️⃣ البيع - استقبال الطلبات',
      icon: FileCheck,
      color: 'from-blue-600 to-cyan-700',
      tabs: [
        {
          id: 'sales' as TabId,
          title: '3. المبيعات',
          icon: FileCheck,
          gradient: 'from-blue-500 to-cyan-600',
          iconBg: 'from-blue-400 to-cyan-500',
          description: 'الخطوة الثالثة - استقبال طلبات الشراء من المستثمرين',
          badge: `${stats.totalSalesRequests} طلب`
        }
      ]
    },
    {
      title: '4️⃣ التحصيل - المراجعة المالية',
      icon: DollarSign,
      color: 'from-emerald-600 to-green-700',
      tabs: [
        {
          id: 'finance' as TabId,
          title: '4. المالية',
          icon: DollarSign,
          gradient: 'from-emerald-600 to-teal-600',
          iconBg: 'from-emerald-500 to-teal-500',
          description: 'الخطوة الرابعة - مراجعة المدفوعات وإدارة التحصيل',
          badge: `${stats.collectionQueue} قيد المراجعة`
        }
      ]
    },
    {
      title: '5️⃣ التعاقد - إصدار العقود',
      icon: FileText,
      color: 'from-indigo-600 to-violet-700',
      tabs: [
        {
          id: 'contracts' as TabId,
          title: '5. العقود',
          icon: FileText,
          gradient: 'from-indigo-500 to-purple-600',
          iconBg: 'from-indigo-400 to-purple-500',
          description: 'الخطوة الخامسة - إصدار عقود الاستنفاع للمستثمرين',
          badge: `${stats.totalContracts} عقد`
        }
      ]
    },
    {
      title: '6️⃣ قيادة المزارع - التشغيل',
      icon: Activity,
      color: 'from-teal-600 to-emerald-700',
      tabs: [
        {
          id: 'farm_command' as TabId,
          title: '6. قيادة المزارع',
          icon: Activity,
          gradient: 'from-teal-500 to-emerald-600',
          iconBg: 'from-teal-400 to-emerald-500',
          description: 'لوحة قيادة وطنية لإدارة المزارع التشغيلية',
          badge: 'جديد'
        }
      ]
    },
    {
      title: '7️⃣ خدمة العملاء - المستثمرون',
      icon: UserCog,
      color: 'from-purple-600 to-pink-700',
      tabs: [
        {
          id: 'investor_service' as TabId,
          title: '7. خدمة المستثمر',
          icon: UserCog,
          gradient: 'from-purple-500 to-pink-600',
          iconBg: 'from-purple-400 to-pink-500',
          description: 'دعم المستثمرين والتواصل معهم',
          badge: `${stats.activeInvestors} مستثمر`
        },
        {
          id: 'notifications' as TabId,
          title: '7ب. الإشعارات',
          icon: Bell,
          gradient: 'from-teal-500 to-cyan-600',
          iconBg: 'from-teal-400 to-cyan-500',
          description: 'إرسال وإدارة إشعارات المستثمرين',
          badge: `${stats.unreadNotifications} غير مقروء`
        }
      ]
    },
    {
      title: '🔧 الإدارة الداخلية',
      icon: Settings,
      color: 'from-slate-600 to-gray-700',
      tabs: [
        {
          id: 'investment_approvals' as TabId,
          title: 'اعتمادات الاستثمار',
          icon: CheckCircle,
          gradient: 'from-orange-500 to-amber-600',
          iconBg: 'from-orange-400 to-amber-500',
          description: 'المهام التي تحتاج موافقتي الاستثمارية',
          badge: 'اعتماد'
        },
        {
          id: 'ai' as TabId,
          title: 'المساعد الذكي',
          icon: Brain,
          gradient: 'from-violet-600 to-fuchsia-600',
          iconBg: 'from-violet-500 to-fuchsia-500',
          description: 'إدارة قاعدة المعرفة والتعلم الذاتي',
          badge: 'AI'
        },
        {
          id: 'settings' as TabId,
          title: 'إعدادات القسم',
          icon: Settings,
          gradient: 'from-slate-500 to-slate-700',
          iconBg: 'from-slate-400 to-slate-600',
          description: 'الإعدادات العامة وتخصيص النصوص',
          badge: 'إعدادات'
        }
      ]
    }
  ];

  const tabs: Tab[] = tabSections.flatMap(section => section.tabs);

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
          {activeTab === 'farm_command' && <FarmCommandTab />}
          {activeTab === 'investor_service' && <InvestorServiceTab />}
          {activeTab === 'notifications' && <NotificationsManagementTab />}
          {activeTab === 'ai' && <AIAssistantManagementTab />}
          {activeTab === 'investment_approvals' && <InvestmentApprovalsTab />}
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
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="hidden md:flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white transition-all duration-200 hover:scale-105 active:scale-95 font-bold shadow-lg"
              >
                <ArrowRight className="w-4 h-4" />
                <span>العودة للإدارة</span>
              </button>
              <button
                onClick={onClose}
                className="md:hidden p-2 md:p-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg"
                title="العودة للإدارة العليا"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
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
        <div className="mb-8">
          <h2 className="text-lg md:text-xl font-black text-gray-900 mb-2">لوحة التحكم الشاملة</h2>
          <p className="text-sm text-gray-600">جميع أدوات وأقسام إدارة نظام استثمار أشجار المزارع - منظمة بشكل احترافي</p>
        </div>

        <div className="space-y-8">
          {tabSections.map((section, sectionIndex) => {
            const SectionIcon = section.icon;
            let globalIndex = 0;
            for (let i = 0; i < sectionIndex; i++) {
              globalIndex += tabSections[i].tabs.length;
            }

            return (
              <div key={`section-${sectionIndex}`} className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${section.color} flex items-center justify-center shadow-lg`}>
                    <SectionIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base md:text-lg font-black text-gray-900">{section.title}</h3>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {section.tabs.map((tab, tabIndex) => {
                    const Icon = tab.icon;
                    const currentGlobalIndex = globalIndex + tabIndex;

                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className="group relative bg-white rounded-2xl p-5 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 overflow-hidden hover:scale-[1.02] active:scale-[0.98]"
                        style={{
                          animationDelay: `${currentGlobalIndex * 50}ms`
                        }}
                      >
                        <div className={`absolute inset-0 bg-gradient-to-br ${tab.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>

                        <div className="relative">
                          <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gradient-to-br ${tab.iconBg} flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 mb-3`}>
                            <Icon className="w-6 h-6 md:w-7 md:h-7 text-white" />
                          </div>

                          <h4 className="text-base md:text-lg font-black text-gray-900 mb-2 min-h-[3.5rem] flex items-center">
                            {tab.title}
                          </h4>
                          {tab.badge && (
                            <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full bg-gradient-to-r ${tab.gradient} text-white shadow-sm mb-2`}>
                              {tab.badge}
                            </span>
                          )}
                          <p className="text-xs md:text-sm text-gray-600 leading-relaxed mb-3 min-h-[2.5rem]">
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
            );
          })}
        </div>

        <div className="mt-8 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-2xl md:rounded-3xl p-4 md:p-6 border border-blue-100 shadow-lg">
          <div className="flex items-start gap-3 md:gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg">
              <Zap className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>

            <div className="flex-1">
              <h3 className="text-base md:text-lg font-black text-blue-900 mb-2 md:mb-3">
                مسار العمل الصحيح - من البداية للنهاية
              </h3>

              <div className="space-y-2 text-xs md:text-sm text-blue-800">
                <div className="flex items-start gap-2 md:gap-3">
                  <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 mt-1.5 flex-shrink-0 shadow-sm"></div>
                  <p className="leading-relaxed"><strong>1. المزارع → 2. العروض → 3. المبيعات → 4. المالية → 5. العقود → 6. التشغيل → 7. خدمة المستثمر</strong></p>
                </div>
                <div className="flex items-start gap-2 md:gap-3">
                  <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 mt-1.5 flex-shrink-0 shadow-sm"></div>
                  <p className="leading-relaxed">البطاقات منظمة ومرتبة حسب تسلسل العمليات</p>
                </div>
                <div className="flex items-start gap-2 md:gap-3">
                  <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 mt-1.5 flex-shrink-0 shadow-sm"></div>
                  <p className="leading-relaxed">كل قسم مجمّع في مجموعة واحدة لسهولة التصفح</p>
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
