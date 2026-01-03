import { useState, useEffect } from 'react';
import { X, Search, Filter, Eye, Users, Timer, Calendar, TrendingUp, AlertCircle, CheckCircle, XCircle, Clock, ArrowUpCircle, StopCircle, Trash2, MessageCircle, FileText, BarChart3, Download, RefreshCw, Sparkles, Play, Pause, Edit, Ban, Shield, Activity } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { CountdownTimer } from './CountdownTimer';
import { AdminToast } from './AdminToast';

interface Auction {
  id: string;
  title: string;
  seller_name: string;
  seller_id: string;
  current_bid: number;
  bid_count: number;
  ends_at: string;
  status: string;
  views_count: number;
  plan_type?: string;
  priority_score?: number;
  created_at: string;
  category?: string;
  request_offer_type?: string;
}

interface EnhancedAuctionsManagementProps {
  onClose: () => void;
}

type FilterType = 'all' | 'active' | 'ending_soon' | 'high_priority' | 'gold' | 'silver' | 'free';
type SortType = 'priority' | 'recent' | 'ending' | 'views' | 'bids';
type ActionType = 'extend' | 'reduce' | 'stop' | 'activate' | 'delete' | 'priority' | null;

export function EnhancedAuctionsManagement({ onClose }: EnhancedAuctionsManagementProps) {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [filteredAuctions, setFilteredAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');
  const [selectedSort, setSelectedSort] = useState<SortType>('priority');
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null);
  const [actionModal, setActionModal] = useState<{ type: ActionType; auction: Auction | null }>({ type: null, auction: null });
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    endingSoon: 0,
    highPriority: 0,
    totalViews: 0,
    totalBids: 0,
  });

  useEffect(() => {
    fetchAuctions();

    const channel = supabase
      .channel('admin-enhanced-auctions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'auctions', filter: 'section=eq.public' }, fetchAuctions)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [auctions, searchQuery, selectedFilter, selectedSort]);

  const fetchAuctions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('auctions')
        .select('*')
        .eq('section', 'public')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setAuctions(data || []);
      calculateStats(data || []);
    } catch (err) {
      console.error('Error fetching auctions:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: Auction[]) => {
    const now = Date.now();
    const twoHours = 2 * 60 * 60 * 1000;

    const active = data.filter(a => a.status === 'active').length;
    const endingSoon = data.filter(a => {
      const timeLeft = new Date(a.ends_at).getTime() - now;
      return a.status === 'active' && timeLeft < twoHours && timeLeft > 0;
    }).length;
    const highPriority = data.filter(a => (a.priority_score || 0) > 50).length;
    const totalViews = data.reduce((sum, a) => sum + (a.views_count || 0), 0);
    const totalBids = data.reduce((sum, a) => sum + (a.bid_count || 0), 0);

    setStats({
      total: data.length,
      active,
      endingSoon,
      highPriority,
      totalViews,
      totalBids,
    });
  };

  const applyFiltersAndSort = () => {
    let filtered = [...auctions];

    if (searchQuery) {
      filtered = filtered.filter(a =>
        a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.seller_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    switch (selectedFilter) {
      case 'active':
        filtered = filtered.filter(a => a.status === 'active');
        break;
      case 'ending_soon':
        const now = Date.now();
        const twoHours = 2 * 60 * 60 * 1000;
        filtered = filtered.filter(a => {
          const timeLeft = new Date(a.ends_at).getTime() - now;
          return a.status === 'active' && timeLeft < twoHours && timeLeft > 0;
        });
        break;
      case 'high_priority':
        filtered = filtered.filter(a => (a.priority_score || 0) > 50);
        break;
      case 'gold':
        filtered = filtered.filter(a => a.plan_type === 'gold');
        break;
      case 'silver':
        filtered = filtered.filter(a => a.plan_type === 'silver');
        break;
      case 'free':
        filtered = filtered.filter(a => !a.plan_type || a.plan_type === 'free');
        break;
    }

    switch (selectedSort) {
      case 'priority':
        filtered.sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0));
        break;
      case 'recent':
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'ending':
        filtered.sort((a, b) => new Date(a.ends_at).getTime() - new Date(b.ends_at).getTime());
        break;
      case 'views':
        filtered.sort((a, b) => (b.views_count || 0) - (a.views_count || 0));
        break;
      case 'bids':
        filtered.sort((a, b) => (b.bid_count || 0) - (a.bid_count || 0));
        break;
    }

    setFilteredAuctions(filtered);
  };

  const filters: { id: FilterType; label: string; icon: any; color: string }[] = [
    { id: 'all', label: 'الكل', icon: BarChart3, color: '#6B7280' },
    { id: 'active', label: 'نشط', icon: CheckCircle, color: '#10B981' },
    { id: 'ending_soon', label: 'ينتهي قريباً', icon: AlertCircle, color: '#EF4444' },
    { id: 'high_priority', label: 'أولوية عالية', icon: TrendingUp, color: '#F59E0B' },
    { id: 'gold', label: 'ذهبية', icon: Sparkles, color: '#F59E0B' },
    { id: 'silver', label: 'فضية', icon: Sparkles, color: '#9CA3AF' },
    { id: 'free', label: 'مجانية', icon: Sparkles, color: '#6B7280' },
  ];

  const sorts: { id: SortType; label: string }[] = [
    { id: 'priority', label: 'الأولوية' },
    { id: 'recent', label: 'الأحدث' },
    { id: 'ending', label: 'الأقرب للانتهاء' },
    { id: 'views', label: 'الأكثر مشاهدة' },
    { id: 'bids', label: 'الأكثر مزايدة' },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-[95vw] max-h-[95vh] overflow-hidden flex flex-col"
        style={{
          animation: 'scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative overflow-hidden" style={{
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          padding: '24px'
        }}>
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -mr-32 -mt-32" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full -ml-24 -mb-24" />
          </div>

          <div className="relative">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                  <BarChart3 className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">إدارة المزادات العامة</h2>
                  <p className="text-emerald-100 text-sm">نظام إدارة متقدم مع تحكم كامل</p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm hover:bg-white/20 flex items-center justify-center transition-all duration-200 hover:rotate-90"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              <StatCard icon={BarChart3} label="إجمالي المزادات" value={stats.total} color="white" />
              <StatCard icon={CheckCircle} label="نشط" value={stats.active} color="white" />
              <StatCard icon={AlertCircle} label="ينتهي قريباً" value={stats.endingSoon} color="#FEE2E2" />
              <StatCard icon={TrendingUp} label="أولوية عالية" value={stats.highPriority} color="#FEF3C7" />
              <StatCard icon={Eye} label="إجمالي المشاهدات" value={stats.totalViews} color="white" />
              <StatCard icon={Users} label="إجمالي المزايدات" value={stats.totalBids} color="white" />
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4 bg-gray-50">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث عن مزاد أو بائع..."
                className="w-full pr-12 pl-4 py-3 rounded-xl border-2 border-gray-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200 outline-none transition-all text-right"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-all"
                >
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              )}
            </div>

            <button
              onClick={fetchAuctions}
              className="px-6 py-3 rounded-xl bg-white border-2 border-gray-200 hover:border-emerald-400 flex items-center justify-center gap-2 font-semibold text-gray-700 hover:text-emerald-600 transition-all"
            >
              <RefreshCw className="w-5 h-5" />
              تحديث
            </button>

            <button className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center justify-center gap-2 transition-all shadow-lg">
              <Download className="w-5 h-5" />
              تصدير
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {filters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setSelectedFilter(filter.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold whitespace-nowrap transition-all ${
                  selectedFilter === filter.id
                    ? 'text-white shadow-lg scale-105'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border-2 border-gray-200'
                }`}
                style={{
                  background: selectedFilter === filter.id ? filter.color : undefined,
                }}
              >
                <filter.icon className="w-4 h-4" />
                {filter.label}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-xl border-2 border-gray-200 p-3 flex items-center gap-4">
            <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Filter className="w-4 h-4" />
              ترتيب حسب:
            </span>
            <div className="flex gap-2 flex-wrap">
              {sorts.map((sort) => (
                <button
                  key={sort.id}
                  onClick={() => setSelectedSort(sort.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                    selectedSort === sort.id
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {sort.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-600 font-medium">جاري تحميل المزادات...</p>
              </div>
            </div>
          ) : filteredAuctions.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-10 h-10 text-gray-400" />
                </div>
                <p className="text-gray-900 font-bold text-lg mb-2">لا توجد نتائج</p>
                <p className="text-gray-600">جرب تغيير الفلتر أو البحث</p>
              </div>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredAuctions.map((auction) => (
                <AuctionCard
                  key={auction.id}
                  auction={auction}
                  onClick={() => setSelectedAuction(auction)}
                  onAction={(type) => setActionModal({ type, auction })}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedAuction && (
        <AuctionDetailsModal
          auction={selectedAuction}
          onClose={() => setSelectedAuction(null)}
          onAction={(type) => {
            setActionModal({ type, auction: selectedAuction });
            setSelectedAuction(null);
          }}
        />
      )}

      {actionModal.type && actionModal.auction && (
        <ActionModal
          type={actionModal.type}
          auction={actionModal.auction}
          onClose={() => setActionModal({ type: null, auction: null })}
          onSuccess={(message: string) => {
            setActionModal({ type: null, auction: null });
            setToast({ message, type: 'success' });
            fetchAuctions();
          }}
        />
      )}

      {toast && (
        <AdminToast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: any) {
  return (
    <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 border border-white/20">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4" style={{ color }} />
        <span className="text-xs text-white/90">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
    </div>
  );
}

function AuctionCard({ auction, onClick, onAction }: any) {
  const timeLeft = new Date(auction.ends_at).getTime() - Date.now();
  const hoursLeft = timeLeft / (1000 * 60 * 60);
  const isEndingSoon = hoursLeft < 2 && hoursLeft > 0;
  const isActive = auction.status === 'active';

  const getPlanBadge = () => {
    switch (auction.plan_type) {
      case 'gold':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded-lg">🥇 ذهبية</span>;
      case 'silver':
        return <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-bold rounded-lg">🥈 فضية</span>;
      default:
        return <span className="px-2 py-1 bg-gray-50 text-gray-600 text-xs font-medium rounded-lg">مجانية</span>;
    }
  };

  return (
    <div
      className={`bg-white rounded-xl border-2 p-4 hover:shadow-lg transition-all cursor-pointer ${
        isEndingSoon ? 'border-red-300 bg-red-50' : 'border-gray-200'
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-bold text-gray-900 text-lg">{auction.title}</h3>
            {isEndingSoon && (
              <span className="px-2 py-1 bg-red-100 text-red-600 text-xs font-bold rounded-lg animate-pulse">
                قريب جداً!
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {auction.seller_name}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              {auction.views_count || 0} مشاهدة
            </span>
            <span className="flex items-center gap-1">
              <TrendingUp className="w-4 h-4" />
              {auction.bid_count || 0} مزايدة
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          {getPlanBadge()}
          <div className={`px-3 py-1 rounded-lg text-xs font-semibold ${
            isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
          }`}>
            {isActive ? '● نشط' : '○ منتهي'}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-500" />
          <CountdownTimer endTime={auction.ends_at} compact />
        </div>

        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onAction('extend')}
            className="p-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition-all"
            title="تعديل المدة"
          >
            <Timer className="w-4 h-4" />
          </button>
          {isActive ? (
            <button
              onClick={() => onAction('stop')}
              className="p-2 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-600 transition-all"
              title="إيقاف المزاد"
            >
              <Pause className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => onAction('activate')}
              className="p-2 rounded-lg bg-green-50 hover:bg-green-100 text-green-600 transition-all"
              title="تفعيل المزاد"
            >
              <Play className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => onAction('priority')}
            className="p-2 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-600 transition-all"
            title="تعديل الأولوية"
          >
            <TrendingUp className="w-4 h-4" />
          </button>
          <button
            onClick={() => onAction('delete')}
            className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-all"
            title="حذف المزاد"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function AuctionDetailsModal({ auction, onClose, onAction }: any) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[400] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold">تفاصيل المزاد</h3>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-gray-500">العنوان</label>
              <p className="text-lg font-bold text-gray-900 mt-1">{auction.title}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-500">البائع</label>
                <p className="text-gray-900 font-medium mt-1">{auction.seller_name}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-500">الحالة</label>
                <p className="text-gray-900 font-medium mt-1">{auction.status === 'active' ? 'نشط' : 'منتهي'}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-500">المشاهدات</label>
                <p className="text-2xl font-bold text-gray-900 mt-1">{auction.views_count || 0}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-500">المزايدات</label>
                <p className="text-2xl font-bold text-gray-900 mt-1">{auction.bid_count || 0}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-500">الأولوية</label>
                <p className="text-2xl font-bold text-gray-900 mt-1">{auction.priority_score || 0}</p>
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-500">ينتهي في</label>
              <div className="mt-1">
                <CountdownTimer endTime={auction.ends_at} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-6">
            <button
              onClick={() => onAction('extend')}
              className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-all"
            >
              <Timer className="w-5 h-5" />
              تعديل المدة
            </button>
            {auction.status === 'active' ? (
              <button
                onClick={() => onAction('stop')}
                className="px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-all"
              >
                <Pause className="w-5 h-5" />
                إيقاف
              </button>
            ) : (
              <button
                onClick={() => onAction('activate')}
                className="px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-all"
              >
                <Play className="w-5 h-5" />
                تفعيل
              </button>
            )}
            <button
              onClick={() => onAction('priority')}
              className="px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-all"
            >
              <TrendingUp className="w-5 h-5" />
              الأولوية
            </button>
            <button
              onClick={() => onAction('delete')}
              className="px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-all"
            >
              <Trash2 className="w-5 h-5" />
              حذف
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionModal({ type, auction, onClose, onSuccess }: any) {
  const [loading, setLoading] = useState(false);
  const [hours, setHours] = useState(24);
  const [priority, setPriority] = useState(auction.priority_score || 50);
  const [error, setError] = useState('');

  const handleExtend = async () => {
    setLoading(true);
    setError('');

    try {
      const currentEndTime = new Date(auction.ends_at).getTime();
      const now = Date.now();
      const baseTime = currentEndTime > now ? currentEndTime : now;
      const newEndTime = new Date(baseTime + hours * 60 * 60 * 1000).toISOString();

      const { error: updateError } = await supabase
        .from('auctions')
        .update({ ends_at: newEndTime })
        .eq('id', auction.id)
        .eq('section', 'public');

      if (updateError) throw updateError;

      onSuccess(`تم تمديد المزاد بنجاح لمدة ${hours} ساعة`);
    } catch (err: any) {
      console.error('Extend error:', err);
      setError(err.message || 'فشل تمديد المزاد');
    } finally {
      setLoading(false);
    }
  };

  const handleReduce = async () => {
    setLoading(true);
    setError('');

    try {
      const currentEndTime = new Date(auction.ends_at).getTime();
      const newEndTime = new Date(currentEndTime - hours * 60 * 60 * 1000).toISOString();

      const { error: updateError } = await supabase
        .from('auctions')
        .update({ ends_at: newEndTime })
        .eq('id', auction.id)
        .eq('section', 'public');

      if (updateError) throw updateError;

      onSuccess(`تم تقليص مدة المزاد بنجاح بمقدار ${hours} ساعة`);
    } catch (err: any) {
      console.error('Reduce error:', err);
      setError(err.message || 'فشل تقليص المدة');
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    setLoading(true);
    setError('');

    try {
      const { error: updateError } = await supabase
        .from('auctions')
        .update({ status: 'ended' })
        .eq('id', auction.id)
        .eq('section', 'public');

      if (updateError) throw updateError;

      onSuccess('تم إيقاف المزاد بنجاح');
    } catch (err: any) {
      console.error('Stop error:', err);
      setError(err.message || 'فشل إيقاف المزاد');
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async () => {
    setLoading(true);
    setError('');

    try {
      const { error: updateError } = await supabase
        .from('auctions')
        .update({ status: 'active' })
        .eq('id', auction.id)
        .eq('section', 'public');

      if (updateError) throw updateError;

      onSuccess('تم تفعيل المزاد بنجاح');
    } catch (err: any) {
      console.error('Activate error:', err);
      setError(err.message || 'فشل تفعيل المزاد');
    } finally {
      setLoading(false);
    }
  };

  const handlePriority = async () => {
    setLoading(true);
    setError('');

    try {
      const { error: updateError } = await supabase
        .from('auctions')
        .update({ priority_score: priority })
        .eq('id', auction.id)
        .eq('section', 'public');

      if (updateError) throw updateError;

      onSuccess(`تم تحديث الأولوية إلى ${priority} بنجاح`);
    } catch (err: any) {
      console.error('Priority error:', err);
      setError(err.message || 'فشل تحديث الأولوية');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    setError('');

    try {
      const { error: deleteError } = await supabase
        .from('auctions')
        .delete()
        .eq('id', auction.id)
        .eq('section', 'public');

      if (deleteError) throw deleteError;

      onSuccess('تم حذف المزاد بنجاح');
    } catch (err: any) {
      console.error('Delete error:', err);
      setError(err.message || 'فشل حذف المزاد. تأكد من صلاحياتك كمسؤول.');
    } finally {
      setLoading(false);
    }
  };

  const modalConfig = {
    extend: {
      title: 'تعديل مدة المزاد',
      icon: Timer,
      color: 'blue',
      content: (
        <div className="space-y-4">
          <p className="text-gray-600">اختر عدد الساعات التي تريد إضافتها أو تقليصها</p>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">عدد الساعات</label>
            <input
              type="number"
              value={hours}
              onChange={(e) => setHours(parseInt(e.target.value) || 1)}
              min="1"
              max="720"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-200 outline-none text-center text-2xl font-bold"
            />
            <div className="flex gap-2 mt-3">
              {[1, 6, 12, 24, 48, 72].map((h) => (
                <button
                  key={h}
                  onClick={() => setHours(h)}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                    hours === h ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {h}س
                </button>
              ))}
            </div>
          </div>
        </div>
      ),
      actions: (
        <>
          <button
            onClick={handleExtend}
            disabled={loading}
            className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <ArrowUpCircle className="w-5 h-5" />
            {loading ? 'جاري التمديد...' : 'إضافة'}
          </button>
          <button
            onClick={handleReduce}
            disabled={loading}
            className="flex-1 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <XCircle className="w-5 h-5" />
            {loading ? 'جاري التقليص...' : 'تقليص'}
          </button>
        </>
      ),
    },
    stop: {
      title: 'إيقاف المزاد',
      icon: Pause,
      color: 'orange',
      content: (
        <div className="text-center py-4">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Pause className="w-8 h-8 text-orange-600" />
          </div>
          <p className="text-gray-600 mb-2">هل أنت متأكد من إيقاف هذا المزاد؟</p>
          <p className="text-sm text-gray-500">سيتم تغيير حالة المزاد إلى "منتهي"</p>
        </div>
      ),
      actions: (
        <button
          onClick={handleStop}
          disabled={loading}
          className="w-full px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold transition-all disabled:opacity-50"
        >
          {loading ? 'جاري الإيقاف...' : 'تأكيد الإيقاف'}
        </button>
      ),
    },
    activate: {
      title: 'تفعيل المزاد',
      icon: Play,
      color: 'green',
      content: (
        <div className="text-center py-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Play className="w-8 h-8 text-green-600" />
          </div>
          <p className="text-gray-600 mb-2">هل أنت متأكد من تفعيل هذا المزاد؟</p>
          <p className="text-sm text-gray-500">سيتم تغيير حالة المزاد إلى "نشط"</p>
        </div>
      ),
      actions: (
        <button
          onClick={handleActivate}
          disabled={loading}
          className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-all disabled:opacity-50"
        >
          {loading ? 'جاري التفعيل...' : 'تأكيد التفعيل'}
        </button>
      ),
    },
    priority: {
      title: 'تعديل الأولوية',
      icon: TrendingUp,
      color: 'purple',
      content: (
        <div className="space-y-4">
          <p className="text-gray-600">حدد درجة الأولوية (0-100)</p>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-700">الأولوية</span>
              <span className="text-2xl font-bold text-purple-600">{priority}</span>
            </div>
            <input
              type="range"
              value={priority}
              onChange={(e) => setPriority(parseInt(e.target.value))}
              min="0"
              max="100"
              className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #9333ea 0%, #9333ea ${priority}%, #e5e7eb ${priority}%, #e5e7eb 100%)`
              }}
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>منخفضة (0)</span>
              <span>متوسطة (50)</span>
              <span>عالية (100)</span>
            </div>
          </div>
        </div>
      ),
      actions: (
        <button
          onClick={handlePriority}
          disabled={loading}
          className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-all disabled:opacity-50"
        >
          {loading ? 'جاري التحديث...' : 'تحديث الأولوية'}
        </button>
      ),
    },
    delete: {
      title: 'حذف المزاد نهائياً',
      icon: Trash2,
      color: 'red',
      content: (
        <div className="text-center py-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trash2 className="w-8 h-8 text-red-600" />
          </div>
          <p className="text-gray-900 font-bold text-lg mb-2">تحذير: إجراء خطير!</p>
          <p className="text-gray-600 mb-2">هل أنت متأكد من حذف هذا المزاد؟</p>
          <p className="text-sm text-red-600 font-semibold">هذا الإجراء لا يمكن التراجع عنه!</p>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-4 text-right">
            <p className="text-sm text-red-800">
              <strong>ملاحظة:</strong> سيتم حذف المزاد نهائياً من قاعدة البيانات
            </p>
          </div>
        </div>
      ),
      actions: (
        <button
          onClick={handleDelete}
          disabled={loading}
          className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all disabled:opacity-50"
        >
          {loading ? 'جاري الحذف...' : 'تأكيد الحذف النهائي'}
        </button>
      ),
    },
  };

  const config = modalConfig[type as keyof typeof modalConfig];
  if (!config) return null;

  const Icon = config.icon;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[500] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="p-6 text-white"
          style={{ background: `linear-gradient(135deg, var(--tw-${config.color}-600), var(--tw-${config.color}-700))` }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <Icon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold">{config.title}</h3>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-sm text-white/90">المزاد: {auction.title}</p>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {config.content}

          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-all"
            >
              إلغاء
            </button>
            {config.actions}
          </div>
        </div>
      </div>
    </div>
  );
}
