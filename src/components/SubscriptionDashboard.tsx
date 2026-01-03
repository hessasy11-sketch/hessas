import { useState, useEffect, useMemo } from 'react';
import {
  Users, Crown, Sparkles, Gift, Clock, AlertCircle,
  TrendingUp, Calendar, CheckCircle, XCircle, Search,
  Filter, X, Zap, Shield
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DashboardStats {
  totalSubscribers: number;
  freeUsers: number;
  silverUsers: number;
  goldUsers: number;
  freeTrialUsers: number;
  promotionalUsers: number;
  expiringIn7Days: number;
  expiredToday: number;
  temporaryActivated: number;
}

interface Subscriber {
  id: string;
  user_id: string;
  plan_name: string;
  plan_price: string;
  ends_at: string;
  status: string;
  is_free_trial?: boolean;
  is_promotional?: boolean;
  temporary_activation?: boolean;
  ai_activated?: boolean;
  profile_name?: string;
  profile_email?: string;
}

interface Filters {
  plan: string;
  status: string;
  daysRemaining: string;
  activationType: string;
  offerType: string;
}

export function SubscriptionDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalSubscribers: 0,
    freeUsers: 0,
    silverUsers: 0,
    goldUsers: 0,
    freeTrialUsers: 0,
    promotionalUsers: 0,
    expiringIn7Days: 0,
    expiredToday: 0,
    temporaryActivated: 0,
  });

  const [allSubscribers, setAllSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    plan: 'all',
    status: 'all',
    daysRemaining: 'all',
    activationType: 'all',
    offerType: 'all',
  });

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      const now = new Date();
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const { data: subscriptions, error } = await supabase
        .from('user_subscriptions')
        .select(`
          id,
          user_id,
          plan_id,
          ends_at,
          status,
          is_free_trial,
          is_promotional,
          temporary_activation,
          ai_activated,
          subscription_plans!plan_id (
            name,
            price
          ),
          profiles!user_id (
            full_name,
            email
          )
        `)
        .eq('status', 'active');

      if (error) throw error;

      const subscribers = (subscriptions || []).map((sub: any) => ({
        id: sub.id,
        user_id: sub.user_id,
        plan_name: sub.subscription_plans?.name || '',
        plan_price: sub.subscription_plans?.price || '0',
        ends_at: sub.ends_at,
        status: sub.status,
        is_free_trial: sub.is_free_trial || false,
        is_promotional: sub.is_promotional || false,
        temporary_activation: sub.temporary_activation || false,
        ai_activated: sub.ai_activated || false,
        profile_name: sub.profiles?.full_name || 'غير معروف',
        profile_email: sub.profiles?.email || '',
      }));

      setAllSubscribers(subscribers);

      const free = subscribers.filter(s => parseFloat(s.plan_price) === 0).length;
      const silver = subscribers.filter(s => {
        const price = parseFloat(s.plan_price);
        return price >= 20 && price < 49;
      }).length;
      const gold = subscribers.filter(s => parseFloat(s.plan_price) >= 49).length;

      const freeTrial = subscribers.filter(s => s.is_free_trial).length;
      const promotional = subscribers.filter(s => s.is_promotional).length;
      const tempActivated = subscribers.filter(s => s.temporary_activation).length;

      const expiring = subscribers.filter(s => {
        const endDate = new Date(s.ends_at);
        return endDate <= sevenDaysFromNow && endDate > now && parseFloat(s.plan_price) > 0;
      }).length;

      const expired = subscribers.filter(s => {
        const endDate = new Date(s.ends_at);
        return endDate >= startOfToday && endDate < now && parseFloat(s.plan_price) > 0;
      }).length;

      setStats({
        totalSubscribers: subscribers.length,
        freeUsers: free,
        silverUsers: silver,
        goldUsers: gold,
        freeTrialUsers: freeTrial,
        promotionalUsers: promotional,
        expiringIn7Days: expiring,
        expiredToday: expired,
        temporaryActivated: tempActivated,
      });

    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSubscribers = useMemo(() => {
    let filtered = [...allSubscribers];

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        s =>
          s.profile_name?.toLowerCase().includes(search) ||
          s.profile_email?.toLowerCase().includes(search) ||
          s.plan_name?.toLowerCase().includes(search)
      );
    }

    if (filters.plan !== 'all') {
      if (filters.plan === 'free') {
        filtered = filtered.filter(s => parseFloat(s.plan_price) === 0);
      } else if (filters.plan === 'silver') {
        filtered = filtered.filter(s => {
          const price = parseFloat(s.plan_price);
          return price >= 20 && price < 49;
        });
      } else if (filters.plan === 'gold') {
        filtered = filtered.filter(s => parseFloat(s.plan_price) >= 49);
      }
    }

    if (filters.status !== 'all') {
      filtered = filtered.filter(s => s.status === filters.status);
    }

    if (filters.daysRemaining !== 'all') {
      const now = new Date();
      if (filters.daysRemaining === '0-7') {
        filtered = filtered.filter(s => {
          const days = getDaysRemaining(s.ends_at);
          return days >= 0 && days <= 7;
        });
      } else if (filters.daysRemaining === '8-30') {
        filtered = filtered.filter(s => {
          const days = getDaysRemaining(s.ends_at);
          return days > 7 && days <= 30;
        });
      } else if (filters.daysRemaining === '30+') {
        filtered = filtered.filter(s => {
          const days = getDaysRemaining(s.ends_at);
          return days > 30;
        });
      }
    }

    if (filters.activationType !== 'all') {
      if (filters.activationType === 'ai') {
        filtered = filtered.filter(s => s.ai_activated);
      } else if (filters.activationType === 'manual') {
        filtered = filtered.filter(s => !s.ai_activated);
      }
    }

    if (filters.offerType !== 'all') {
      if (filters.offerType === 'trial') {
        filtered = filtered.filter(s => s.is_free_trial);
      } else if (filters.offerType === 'promotional') {
        filtered = filtered.filter(s => s.is_promotional);
      } else if (filters.offerType === 'temporary') {
        filtered = filtered.filter(s => s.temporary_activation);
      } else if (filters.offerType === 'regular') {
        filtered = filtered.filter(
          s => !s.is_free_trial && !s.is_promotional && !s.temporary_activation
        );
      }
    }

    return filtered;
  }, [allSubscribers, searchTerm, filters]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const resetFilters = () => {
    setFilters({
      plan: 'all',
      status: 'all',
      daysRemaining: 'all',
      activationType: 'all',
      offerType: 'all',
    });
    setSearchTerm('');
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.plan !== 'all') count++;
    if (filters.status !== 'all') count++;
    if (filters.daysRemaining !== 'all') count++;
    if (filters.activationType !== 'all') count++;
    if (filters.offerType !== 'all') count++;
    return count;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل لوحة القيادة...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">📊 لوحة قيادة الاشتراكات</h2>
        <button
          onClick={loadDashboardData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          🔄 تحديث
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <Users className="w-12 h-12 opacity-80" />
            <div className="text-right">
              <p className="text-sm opacity-90">إجمالي المشتركين</p>
              <p className="text-4xl font-bold">{stats.totalSubscribers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border-2 border-gray-300 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
              <Users className="w-6 h-6 text-gray-600" />
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">الباقة المجانية</p>
              <p className="text-4xl font-bold text-gray-700">{stats.freeUsers}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-400 to-blue-500 text-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <Sparkles className="w-12 h-12 opacity-80" />
            <div className="text-right">
              <p className="text-sm opacity-90">الباقة الفضية</p>
              <p className="text-4xl font-bold">{stats.silverUsers}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-400 to-yellow-500 text-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <Crown className="w-12 h-12 opacity-80" />
            <div className="text-right">
              <p className="text-sm opacity-90">الباقة الذهبية</p>
              <p className="text-4xl font-bold">{stats.goldUsers}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-400 to-green-500 text-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <TrendingUp className="w-12 h-12 opacity-80" />
            <div className="text-right">
              <p className="text-sm opacity-90">التجربة المجانية</p>
              <p className="text-4xl font-bold">{stats.freeTrialUsers}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-400 to-purple-500 text-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <Gift className="w-12 h-12 opacity-80" />
            <div className="text-right">
              <p className="text-sm opacity-90">شهر عليك وشهر علينا</p>
              <p className="text-4xl font-bold">{stats.promotionalUsers}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-400 to-orange-500 text-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <Clock className="w-12 h-12 opacity-80" />
            <div className="text-right">
              <p className="text-sm opacity-90">ينتهي خلال 7 أيام</p>
              <p className="text-4xl font-bold">{stats.expiringIn7Days}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-400 to-red-500 text-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <AlertCircle className="w-12 h-12 opacity-80" />
            <div className="text-right">
              <p className="text-sm opacity-90">انتهى اليوم</p>
              <p className="text-4xl font-bold">{stats.expiredToday}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-teal-400 to-teal-500 text-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <CheckCircle className="w-12 h-12 opacity-80" />
            <div className="text-right">
              <p className="text-sm opacity-90">مفعّل مؤقتاً</p>
              <p className="text-4xl font-bold">{stats.temporaryActivated}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border-2 border-gray-200 p-6 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Search className="w-6 h-6 text-blue-600" />
            البحث والفلترة
          </h3>
          <div className="flex gap-2">
            {(getActiveFiltersCount() > 0 || searchTerm) && (
              <button
                onClick={resetFilters}
                className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                مسح الكل
              </button>
            )}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium flex items-center gap-2 ${
                showFilters
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Filter className="w-4 h-4" />
              الفلاتر
              {getActiveFiltersCount() > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {getActiveFiltersCount()}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="relative mb-4">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="ابحث بالاسم، البريد الإلكتروني، أو الباقة..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pr-12 pl-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">الباقة</label>
              <select
                value={filters.plan}
                onChange={e => setFilters({ ...filters, plan: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              >
                <option value="all">الكل</option>
                <option value="free">مجانية</option>
                <option value="silver">فضية</option>
                <option value="gold">ذهبية</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">الحالة</label>
              <select
                value={filters.status}
                onChange={e => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              >
                <option value="all">الكل</option>
                <option value="active">نشط</option>
                <option value="expired">منتهي</option>
                <option value="cancelled">ملغي</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">الأيام المتبقية</label>
              <select
                value={filters.daysRemaining}
                onChange={e => setFilters({ ...filters, daysRemaining: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              >
                <option value="all">الكل</option>
                <option value="0-7">0-7 أيام</option>
                <option value="8-30">8-30 يوم</option>
                <option value="30+">أكثر من 30 يوم</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">نوع التفعيل</label>
              <select
                value={filters.activationType}
                onChange={e => setFilters({ ...filters, activationType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              >
                <option value="all">الكل</option>
                <option value="ai">AI</option>
                <option value="manual">يدوي</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">نوع العرض</label>
              <select
                value={filters.offerType}
                onChange={e => setFilters({ ...filters, offerType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              >
                <option value="all">الكل</option>
                <option value="regular">عادي</option>
                <option value="trial">تجربة مجانية</option>
                <option value="promotional">عرض ترويجي</option>
                <option value="temporary">مؤقت</option>
              </select>
            </div>
          </div>
        )}

        <div className="text-sm text-gray-600 mb-4 flex items-center gap-2">
          <Zap className="w-4 h-4 text-blue-600" />
          عرض {filteredSubscribers.length} من أصل {allSubscribers.length} مشترك
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {filteredSubscribers.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">لا توجد نتائج</p>
              <p className="text-sm text-gray-400 mt-2">جرب تغيير معايير البحث أو الفلترة</p>
            </div>
          ) : (
            filteredSubscribers.map(sub => (
              <div
                key={sub.id}
                className="bg-gradient-to-r from-gray-50 to-white rounded-lg p-4 border-2 border-gray-200 hover:border-blue-300 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-gray-900">{sub.profile_name}</p>
                      {sub.ai_activated && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          AI
                        </span>
                      )}
                      {!sub.ai_activated && (
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Shield className="w-3 h-3" />
                          يدوي
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{sub.profile_email}</p>
                    <div className="flex items-center gap-2 mt-2">
                      {sub.is_free_trial && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                          تجربة مجانية
                        </span>
                      )}
                      {sub.is_promotional && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                          عرض ترويجي
                        </span>
                      )}
                      {sub.temporary_activation && (
                        <span className="text-xs bg-teal-100 text-teal-700 px-2 py-1 rounded-full">
                          مفعّل مؤقتاً
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-blue-600">{sub.plan_name}</p>
                    <p className="text-xs text-gray-500">
                      ينتهي في {getDaysRemaining(sub.ends_at)} يوم
                    </p>
                    <p className="text-xs text-gray-500">{formatDate(sub.ends_at)}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
