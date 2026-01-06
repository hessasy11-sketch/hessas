import { useState } from 'react';
import { Map, AlertCircle, CheckCircle, Clock, TrendingUp, Shield } from 'lucide-react';
import { useFarmCommand } from '../../hooks/useFarmCommand';
import FarmCommandCard from './FarmCommandCard';
import ApprovalRequestsPanel from './ApprovalRequestsPanel';
import SmartAlertsPanel from './SmartAlertsPanel';
import BackToGatewayButton from './BackToGatewayButton';

type View = 'overview' | 'approvals' | 'alerts';

export default function FarmCommandCenter() {
  const { stats, farms, loading } = useFarmCommand();
  const [activeView, setActiveView] = useState<View>('overview');
  const [filter, setFilter] = useState<'all' | 'setup' | 'active' | 'suspended'>('all');

  const filteredFarms = farms.filter(farm => {
    if (filter === 'all') return true;
    return farm.operational_status === filter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100" dir="rtl">
      <BackToGatewayButton />

      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xl">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <Map className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-black mb-1">قيادة المزارع الوطنية</h1>
              <p className="text-emerald-100">المركز التنفيذي للإشراف والحوكمة</p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <Map className="w-5 h-5 opacity-80" />
                <span className="text-3xl font-bold">{stats?.total_farms || 0}</span>
              </div>
              <p className="text-sm opacity-90">إجمالي المزارع</p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="w-5 h-5 opacity-80" />
                <span className="text-3xl font-bold">{stats?.active_farms || 0}</span>
              </div>
              <p className="text-sm opacity-90">نشطة</p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <AlertCircle className="w-5 h-5 opacity-80" />
                <span className="text-3xl font-bold">{stats?.suspended_farms || 0}</span>
              </div>
              <p className="text-sm opacity-90">موقوفة</p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-5 h-5 opacity-80" />
                <span className="text-3xl font-bold">{stats?.pending_approvals || 0}</span>
              </div>
              <p className="text-sm opacity-90">موافقات معلقة</p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-5 h-5 opacity-80" />
                <span className="text-3xl font-bold">{stats?.critical_alerts || 0}</span>
              </div>
              <p className="text-sm opacity-90">تنبيهات حرجة</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-4 py-4">
            <button
              onClick={() => setActiveView('overview')}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                activeView === 'overview'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              نظرة عامة
            </button>
            <button
              onClick={() => setActiveView('approvals')}
              className={`px-6 py-2 rounded-lg font-medium transition-all relative ${
                activeView === 'approvals'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              الموافقات
              {stats && stats.pending_approvals > 0 && (
                <span className="absolute -top-1 -left-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {stats.pending_approvals}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveView('alerts')}
              className={`px-6 py-2 rounded-lg font-medium transition-all relative ${
                activeView === 'alerts'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              التنبيهات
              {stats && stats.critical_alerts > 0 && (
                <span className="absolute -top-1 -left-1 w-5 h-5 bg-orange-500 text-white text-xs rounded-full flex items-center justify-center">
                  {stats.critical_alerts}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {activeView === 'overview' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-gray-400" />
              <span className="text-sm text-gray-600">تصفية حسب الحالة:</span>
              {['all', 'setup', 'active', 'suspended'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f as any)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === f
                      ? 'bg-emerald-500 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  {f === 'all' && 'الكل'}
                  {f === 'setup' && 'إعداد'}
                  {f === 'active' && 'نشطة'}
                  {f === 'suspended' && 'موقوفة'}
                </button>
              ))}
            </div>

            {/* Farms Grid */}
            {filteredFarms.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                <Map className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">لا توجد مزارع</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredFarms.map((farm) => (
                  <FarmCommandCard key={farm.id} farm={farm} />
                ))}
              </div>
            )}
          </div>
        )}

        {activeView === 'approvals' && <ApprovalRequestsPanel />}
        {activeView === 'alerts' && <SmartAlertsPanel />}
      </div>
    </div>
  );
}
