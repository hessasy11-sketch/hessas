import { useState, useEffect } from 'react';
import { X, Package, CreditCard, Shield, BarChart3, Settings, Bot, MessageCircle, Timer, Trash2, StopCircle, Play, Globe, Eye, Users, FileDown, Info, Check, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { CountdownTimer } from './CountdownTimer';
import { PlansManagementNew } from './PlansManagementNew';
import { EnhancedAuctionsManagement } from './EnhancedAuctionsManagement';

interface Auction {
  id: string;
  title: string;
  seller_name: string;
  current_bid: number;
  bid_count: number;
  ends_at: string;
  status: string;
  views_count: number;
  seller_id: string;
  plan_type?: string;
}

interface PublicAuctionsDashboardProps {
  onClose: () => void;
}

type CardType = 'auctions' | 'plans' | 'supervision' | 'reports' | 'settings' | 'assistant' | null;

export function PublicAuctionsDashboard({ onClose }: PublicAuctionsDashboardProps) {
  const [selectedCard, setSelectedCard] = useState<CardType>(null);
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCount, setActiveCount] = useState(0);
  const [reportsCount, setReportsCount] = useState(0);

  useEffect(() => {
    fetchAuctions();
    fetchStats();

    const channel = supabase
      .channel('admin-auctions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'auctions' }, fetchAuctions)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchAuctions = async () => {
    try {
      const { data, error } = await supabase
        .from('auctions')
        .select('*')
        .eq('section', 'public')
        .order('priority_score', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setAuctions(data || []);
    } catch (err) {
      console.error('Error fetching auctions:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { count: active } = await supabase
        .from('auctions')
        .select('*', { count: 'exact', head: true })
        .eq('section', 'public')
        .eq('status', 'active');

      const { count: reports } = await supabase
        .from('auction_reports')
        .select('*', { count: 'exact', head: true })
        .is('resolved_at', null);

      setActiveCount(active || 0);
      setReportsCount(reports || 0);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const handleExtendAuction = async (auctionId: string) => {
    const newEndTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const { error } = await supabase
      .from('auctions')
      .update({ ends_at: newEndTime })
      .eq('id', auctionId);

    if (!error) {
      fetchAuctions();
    }
  };

  const handleStopAuction = async (auctionId: string) => {
    const { error } = await supabase
      .from('auctions')
      .update({ status: 'ended' })
      .eq('id', auctionId);

    if (!error) {
      fetchAuctions();
    }
  };

  const handleDeleteAuction = async (auctionId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المزاد؟')) return;

    const { error } = await supabase
      .from('auctions')
      .delete()
      .eq('id', auctionId);

    if (!error) {
      fetchAuctions();
    }
  };

  const cards = [
    {
      id: 'auctions' as CardType,
      title: 'إدارة المزادات',
      icon: <Package className="w-8 h-8" />,
      color: '#10B981',
      bgGradient: 'from-emerald-500 to-emerald-600',
      description: 'عرض وإدارة المزادات النشطة',
      emoji: '📋',
      count: activeCount,
    },
    {
      id: 'plans' as CardType,
      title: 'إدارة الباقات',
      icon: <CreditCard className="w-8 h-8" />,
      color: '#F59E0B',
      bgGradient: 'from-yellow-400 to-yellow-500',
      description: 'إدارة وتفعيل الباقات',
      emoji: '💳',
      count: 3,
    },
    {
      id: 'supervision' as CardType,
      title: 'الإشراف والمتابعة',
      icon: <Shield className="w-8 h-8" />,
      color: '#F97316',
      bgGradient: 'from-orange-400 to-orange-500',
      description: 'حظر وبلاغات ومتابعة',
      emoji: '🧾',
      count: reportsCount,
    },
    {
      id: 'reports' as CardType,
      title: 'التقارير والإحصاءات',
      icon: <BarChart3 className="w-8 h-8" />,
      color: '#3B82F6',
      bgGradient: 'from-blue-400 to-blue-500',
      description: 'رسوم بيانية لأداء المزادات',
      emoji: '📈',
      count: null,
    },
    {
      id: 'settings' as CardType,
      title: 'الإعدادات العامة',
      icon: <Settings className="w-8 h-8" />,
      color: '#6B7280',
      bgGradient: 'from-gray-500 to-gray-600',
      description: 'إعداد المدد والعمولات',
      emoji: '⚙️',
      count: null,
    },
    {
      id: 'assistant' as CardType,
      title: 'المساعد الذكي',
      icon: <Bot className="w-8 h-8" />,
      color: '#8B5CF6',
      bgGradient: 'from-purple-400 to-purple-500',
      description: 'إدارة المساعدين الآليين',
      emoji: '🤖',
      count: null,
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden animate-in fade-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24" />

          <div className="relative flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-3xl">🌿</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold">لوحة تحكم المزادات العامة</h2>
                <p className="text-emerald-100 text-sm">حصص زراعية للاستثمار - إدارة متكاملة</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-10 h-10 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all hover:rotate-90 duration-300"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="relative flex gap-4">
            <div className="flex-1 bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20 hover:bg-white/15 transition-all">
              <div className="flex items-center gap-2 mb-1">
                <Play className="w-4 h-4" />
                <span className="text-sm opacity-90">المزادات النشطة</span>
              </div>
              <div className="text-3xl font-bold">{activeCount}</div>
            </div>

            <div className="flex-1 bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20 hover:bg-white/15 transition-all">
              <div className="flex items-center gap-2 mb-1">
                <MessageCircle className="w-4 h-4" />
                <span className="text-sm opacity-90">البلاغات الجديدة</span>
              </div>
              <div className="text-3xl font-bold text-red-300">{reportsCount}</div>
            </div>
          </div>
        </div>

        <div className="p-8 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cards.map((card) => (
              <SubCard3D
                key={card.id}
                {...card}
                onClick={() => setSelectedCard(card.id)}
              />
            ))}
          </div>
        </div>

        {selectedCard === 'auctions' && (
          <EnhancedAuctionsManagement
            onClose={() => setSelectedCard(null)}
          />
        )}

        {selectedCard === 'plans' && (
          <PlansManagementNew onClose={() => setSelectedCard(null)} />
        )}

        {selectedCard === 'supervision' && (
          <SupervisionModal onClose={() => setSelectedCard(null)} />
        )}

        {selectedCard === 'reports' && (
          <ReportsModal onClose={() => setSelectedCard(null)} />
        )}

        {selectedCard === 'settings' && (
          <SettingsModal onClose={() => setSelectedCard(null)} />
        )}

        {selectedCard === 'assistant' && (
          <AssistantModal onClose={() => setSelectedCard(null)} />
        )}
      </div>
    </div>
  );
}

function SubCard3D({ title, icon, color, bgGradient, description, emoji, count, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className="group relative p-6 rounded-2xl border-2 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl bg-white overflow-hidden"
      style={{
        borderColor: `${color}30`,
      }}
    >
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300"
        style={{ background: `linear-gradient(135deg, ${color}, ${color}dd)` }}
      />

      <div className="absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 rounded-full opacity-5 group-hover:opacity-10 transition-opacity"
        style={{ backgroundColor: color }}
      />

      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div
            className={`w-16 h-16 rounded-xl bg-gradient-to-br ${bgGradient} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}
          >
            {icon}
          </div>
          {count !== null && (
            <div className="px-3 py-1 rounded-full text-sm font-bold text-white shadow-md" style={{ backgroundColor: color }}>
              {count}
            </div>
          )}
        </div>

        <div className="text-right">
          <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2 justify-end">
            <span>{title}</span>
            <span className="text-2xl">{emoji}</span>
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-sm">
          <span className="text-gray-500">اضغط للفتح</span>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center group-hover:bg-gray-100 transition-colors" style={{ color }}>
            →
          </div>
        </div>
      </div>

      <div
        className="absolute bottom-0 left-0 right-0 h-1 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"
        style={{ backgroundColor: color }}
      />
    </button>
  );
}

function AuctionsModal({ auctions, loading, onClose, onExtend, onStop, onDelete }: any) {
  const getPlanBadge = (planType?: string) => {
    switch (planType) {
      case 'gold':
        return <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-bold rounded-full">🥇 ذهبية</span>;
      case 'silver':
        return <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-bold rounded-full">🥈 فضية</span>;
      default:
        return <span className="px-2 py-0.5 bg-gray-50 text-gray-600 text-xs font-medium rounded-full">🆓 مجانية</span>;
    }
  };

  const getStatusBadge = (status: string, endsAt: string) => {
    const timeLeft = new Date(endsAt).getTime() - Date.now();
    const hoursLeft = timeLeft / (1000 * 60 * 60);

    if (status === 'ended') {
      return <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded">منتهي</span>;
    }
    if (hoursLeft < 2) {
      return <span className="px-2 py-1 bg-red-100 text-red-600 text-xs font-bold rounded animate-pulse">قريب جداً</span>;
    }
    if (hoursLeft < 24) {
      return <span className="px-2 py-1 bg-orange-100 text-orange-600 text-xs font-medium rounded">قريب</span>;
    }
    return <span className="px-2 py-1 bg-emerald-100 text-emerald-600 text-xs font-medium rounded">نشط</span>;
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[300] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[85vh] overflow-hidden animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold">إدارة المزادات</h3>
                <p className="text-emerald-100 text-sm">عرض وتحكم كامل بالمزادات النشطة</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(85vh-120px)]">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600">جاري تحميل المزادات...</p>
            </div>
          ) : auctions.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="w-10 h-10 text-gray-400" />
              </div>
              <p className="text-gray-600">لا توجد مزادات حالياً</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b-2 border-gray-200">
                    <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">المزاد</th>
                    <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">البائع</th>
                    <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">المزايدين</th>
                    <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">الباقة</th>
                    <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">الحالة</th>
                    <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">الوقت المتبقي</th>
                    <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {auctions.map((auction: Auction) => (
                    <tr key={auction.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{auction.title}</div>
                        <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                          <Eye className="w-3 h-3" />
                          {auction.views_count || 0}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{auction.seller_name}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-sm text-gray-700">
                          <Users className="w-4 h-4" />
                          {auction.bid_count || 0}
                        </div>
                      </td>
                      <td className="px-4 py-3">{getPlanBadge(auction.plan_type)}</td>
                      <td className="px-4 py-3">{getStatusBadge(auction.status, auction.ends_at)}</td>
                      <td className="px-4 py-3">
                        <CountdownTimer endTime={auction.ends_at} compact />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button
                            onClick={() => onExtend(auction.id)}
                            className="p-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition-all"
                            title="تمديد"
                          >
                            <Timer className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onStop(auction.id)}
                            className="p-2 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-600 transition-all"
                            title="إيقاف"
                          >
                            <StopCircle className="w-4 h-4" />
                          </button>
                          <button
                            className="p-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition-all"
                            title="الشات"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>
                          <button
                            className="p-2 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-600 transition-all"
                            title="فتح المزاد"
                          >
                            <Globe className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onDelete(auction.id)}
                            className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-all"
                            title="حذف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PlansModal({ onClose }: any) {
  const [planTools, setPlanTools] = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [subscribersCount, setSubscribersCount] = useState({ free: 0, silver: 0, gold: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlanTools();
    fetchSubscribersCount();
  }, []);

  const fetchPlanTools = async () => {
    try {
      const { data, error } = await supabase
        .from('plan_tools')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      setPlanTools(data || []);
    } catch (err) {
      console.error('Error fetching plan tools:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubscribersCount = async () => {
    try {
      const { data: freeCount } = await supabase.rpc('get_plan_subscribers_count', { plan_type_param: 'free' });
      const { data: silverCount } = await supabase.rpc('get_plan_subscribers_count', { plan_type_param: 'silver' });
      const { data: goldCount } = await supabase.rpc('get_plan_subscribers_count', { plan_type_param: 'gold' });

      setSubscribersCount({
        free: freeCount || 0,
        silver: silverCount || 0,
        gold: goldCount || 0,
      });
    } catch (err) {
      console.error('Error fetching subscribers count:', err);
    }
  };

  const handleToggleTool = async (toolKey: string, isActive: boolean) => {
    try {
      const { error } = await supabase.rpc('toggle_plan_tool', {
        tool_key_param: toolKey,
        is_active_param: !isActive
      });

      if (!error) {
        fetchPlanTools();
      }
    } catch (err) {
      console.error('Error toggling tool:', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[300] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24" />

          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center shadow-lg">
                <CreditCard className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">إدارة الباقات</h3>
                <p className="text-yellow-100 text-sm">المزادات العامة - إدارة شاملة</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur rounded-lg transition-all flex items-center gap-2 text-sm font-medium">
                <Settings className="w-4 h-4" />
                إعدادات عامة
              </button>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="p-8 overflow-y-auto max-h-[calc(90vh-140px)]">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600">جاري تحميل الباقات...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <SmartPlanCard3D
                planType="free"
                title="الباقة المجانية"
                icon="🆓"
                color="#9CA3AF"
                subscribersCount={subscribersCount.free}
                tools={planTools.filter(t => t.available_in_free)}
                isActive={true}
                hasSmartAssistant={false}
                onViewDetails={() => setSelectedPlan('free')}
                onToggle={() => {}}
              />
              <SmartPlanCard3D
                planType="silver"
                title="الباقة الفضية"
                icon="🥈"
                color="#C0C0C0"
                subscribersCount={subscribersCount.silver}
                tools={planTools.filter(t => t.available_in_silver)}
                isActive={true}
                hasSmartAssistant={false}
                onViewDetails={() => setSelectedPlan('silver')}
                onToggle={() => {}}
              />
              <SmartPlanCard3D
                planType="gold"
                title="الباقة الذهبية"
                icon="🥇"
                color="#FFD700"
                subscribersCount={subscribersCount.gold}
                tools={planTools.filter(t => t.available_in_gold)}
                isActive={true}
                hasSmartAssistant={true}
                onViewDetails={() => setSelectedPlan('gold')}
                onToggle={() => {}}
              />
            </div>
          )}
        </div>

        {selectedPlan && (
          <PlanDetailsModal
            planType={selectedPlan}
            tools={planTools.filter(t =>
              selectedPlan === 'free' ? t.available_in_free :
              selectedPlan === 'silver' ? t.available_in_silver :
              t.available_in_gold
            )}
            onClose={() => setSelectedPlan(null)}
            onToggleTool={handleToggleTool}
          />
        )}
      </div>
    </div>
  );
}

function SmartPlanCard3D({ planType, title, icon, color, subscribersCount, tools, isActive, hasSmartAssistant, onViewDetails, onToggle }: any) {
  return (
    <div
      className="group relative rounded-2xl border-2 p-6 transition-all duration-500 hover:-translate-y-3 hover:shadow-2xl bg-white overflow-hidden cursor-pointer"
      style={{
        borderColor: `${color}40`,
        boxShadow: `0 4px 20px ${color}20`,
      }}
      onClick={onViewDetails}
    >
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500"
        style={{
          background: `linear-gradient(135deg, ${color}00, ${color})`
        }}
      />

      <div
        className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-5 group-hover:opacity-15 transition-all duration-500 group-hover:scale-110"
        style={{ backgroundColor: color }}
      />

      <div className="relative">
        <div className="flex items-start justify-between mb-6">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-500"
            style={{
              backgroundColor: `${color}15`,
              boxShadow: `0 8px 20px ${color}30`
            }}
          >
            {icon}
          </div>
          {isActive ? (
            <div className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center gap-1">
              <Check className="w-3 h-3" />
              مفعلة
            </div>
          ) : (
            <div className="px-3 py-1 rounded-full bg-gray-100 text-gray-500 text-xs font-medium">
              غير مفعلة
            </div>
          )}
        </div>

        <h3 className="text-2xl font-bold text-gray-900 mb-2">{title}</h3>

        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-600">عدد الأدوات</span>
            <span className="font-bold text-lg" style={{ color }}>{tools.length}</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-600">المشتركين</span>
            <span className="font-bold text-lg" style={{ color }}>{subscribersCount}</span>
          </div>
        </div>

        {hasSmartAssistant && (
          <div className="mb-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl">
            <div className="flex items-center gap-2 text-sm font-bold text-purple-700 mb-2">
              <Sparkles className="w-4 h-4" />
              <span>المساعد الذكي نشط</span>
            </div>
            <p className="text-xs text-purple-600">
              مرتبط بالعقل الصناعي SmartBrain
            </p>
          </div>
        )}

        <div className="space-y-2 mb-6">
          <button
            className="w-full px-4 py-3 rounded-xl font-medium text-sm transition-all hover:scale-105 flex items-center justify-center gap-2"
            style={{
              backgroundColor: `${color}15`,
              color: color
            }}
          >
            <Info className="w-4 h-4" />
            عرض التفاصيل والأدوات
          </button>
          <button
            className="w-full px-4 py-2 rounded-xl font-medium text-sm transition-all hover:bg-gray-100 border border-gray-200 flex items-center justify-center gap-2"
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
          >
            <FileDown className="w-4 h-4" />
            تصدير تقرير
          </button>
        </div>

        <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <span>اضغط للتفاصيل</span>
          <span className="font-mono" style={{ color }}>{planType.toUpperCase()}</span>
        </div>
      </div>

      <div
        className="absolute bottom-0 left-0 right-0 h-1 transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500"
        style={{ backgroundColor: color }}
      />

      <div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          boxShadow: `inset 0 0 60px ${color}30`,
        }}
      />
    </div>
  );
}

function PlanDetailsModal({ planType, tools, onClose, onToggleTool }: any) {
  const planConfig: any = {
    free: { title: 'الباقة المجانية', icon: '🆓', color: '#9CA3AF' },
    silver: { title: 'الباقة الفضية', icon: '🥈', color: '#C0C0C0' },
    gold: { title: 'الباقة الذهبية', icon: '🥇', color: '#FFD700' },
  };

  const config = planConfig[planType];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[400] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="p-6 text-white relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${config.color}, ${config.color}dd)`
          }}
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32" />

          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center text-4xl shadow-lg">
                {config.icon}
              </div>
              <div>
                <h3 className="text-2xl font-bold">{config.title}</h3>
                <p className="text-white/80 text-sm">إدارة الأدوات والصلاحيات</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(85vh-120px)]">
          {tools.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">لا توجد أدوات متاحة لهذه الباقة</p>
            </div>
          ) : (
            <div className="space-y-4">
              {tools.map((tool: any) => (
                <div
                  key={tool.id}
                  className="border-2 rounded-xl p-4 hover:shadow-lg transition-all"
                  style={{ borderColor: `${config.color}20` }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-bold text-gray-900">{tool.tool_name_ar}</h4>
                        {tool.requires_ai && (
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-bold rounded-full flex items-center gap-1">
                            <Bot className="w-3 h-3" />
                            AI
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{tool.description_ar}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        {tool.access_level.map((level: string) => (
                          <span key={level} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                            {level === 'seller' ? 'بائع' : level === 'buyer' ? 'مشتري' : 'إدارة'}
                          </span>
                        ))}
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={tool.is_active}
                        onChange={() => onToggleTool(tool.tool_key, tool.is_active)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SupervisionModal({ onClose }: any) {
  return (
    <SimpleModal
      title="الإشراف والمتابعة"
      icon={<Shield className="w-6 h-6" />}
      color="from-orange-400 to-orange-500"
      onClose={onClose}
    >
      <div className="text-center py-12">
        <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Shield className="w-10 h-10 text-orange-500" />
        </div>
        <p className="text-gray-600 mb-2">🧾 قسم الإشراف والمتابعة</p>
        <p className="text-sm text-gray-500">سيتم تفعيله قريباً</p>
      </div>
    </SimpleModal>
  );
}

function ReportsModal({ onClose }: any) {
  return (
    <SimpleModal
      title="التقارير والإحصاءات"
      icon={<BarChart3 className="w-6 h-6" />}
      color="from-blue-400 to-blue-500"
      onClose={onClose}
    >
      <div className="text-center py-12">
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <BarChart3 className="w-10 h-10 text-blue-500" />
        </div>
        <p className="text-gray-600 mb-2">📈 التقارير والإحصاءات</p>
        <p className="text-sm text-gray-500">سيتم تفعيله قريباً</p>
      </div>
    </SimpleModal>
  );
}

function SettingsModal({ onClose }: any) {
  return (
    <SimpleModal
      title="الإعدادات العامة"
      icon={<Settings className="w-6 h-6" />}
      color="from-gray-500 to-gray-600"
      onClose={onClose}
    >
      <div className="text-center py-12">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Settings className="w-10 h-10 text-gray-500" />
        </div>
        <p className="text-gray-600 mb-2">⚙️ الإعدادات العامة</p>
        <p className="text-sm text-gray-500">سيتم تفعيله قريباً</p>
      </div>
    </SimpleModal>
  );
}

function AssistantModal({ onClose }: any) {
  return (
    <SimpleModal
      title="المساعد الذكي"
      icon={<Bot className="w-6 h-6" />}
      color="from-purple-400 to-purple-500"
      onClose={onClose}
    >
      <div className="text-center py-12">
        <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Bot className="w-10 h-10 text-purple-500" />
        </div>
        <p className="text-gray-600 mb-2">🤖 المساعد الذكي</p>
        <p className="text-sm text-gray-500">سيتم تفعيله قريباً</p>
      </div>
    </SimpleModal>
  );
}

function SimpleModal({ title, icon, color, onClose, children }: any) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[300] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[85vh] overflow-hidden animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`bg-gradient-to-r ${color} p-6 text-white`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                {icon}
              </div>
              <h3 className="text-xl font-bold">{title}</h3>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(85vh-120px)]">
          {children}
        </div>
      </div>
    </div>
  );
}

function PlanCard({ title, icon, color, features, isActive, hasSmartAssistant }: any) {
  return (
    <div className="border-2 rounded-xl p-6 transition-all hover:shadow-lg" style={{ borderColor: color }}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl" style={{ backgroundColor: `${color}20` }}>
          {icon}
        </div>
        <div>
          <h3 className="font-bold text-gray-900">{title}</h3>
          {isActive ? (
            <span className="text-xs text-green-600 font-medium">✅ مفعلة</span>
          ) : (
            <span className="text-xs text-gray-500">❌ غير مفعلة</span>
          )}
        </div>
      </div>

      <div className="space-y-2 mb-4">
        {features.map((feature: string, i: number) => (
          <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
            <span className="text-emerald-500 mt-0.5">✓</span>
            <span>{feature}</span>
          </div>
        ))}
      </div>

      {hasSmartAssistant && (
        <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="flex items-center gap-2 text-sm font-medium text-purple-700">
            <span>🤖</span>
            <span>المساعد الذكي نشط</span>
          </div>
        </div>
      )}

      <button
        className="w-full mt-4 px-4 py-2 rounded-lg font-medium text-sm transition-all hover:opacity-80"
        style={{
          backgroundColor: `${color}20`,
          color: color === '#9CA3AF' ? '#374151' : color
        }}
      >
        تعديل الصلاحيات
      </button>
    </div>
  );
}
