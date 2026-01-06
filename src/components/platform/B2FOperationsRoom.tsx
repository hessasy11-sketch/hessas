import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Leaf,
  ArrowLeft,
  Activity,
  RefreshCw,
  AlertTriangle,
  DollarSign,
  Radar
} from 'lucide-react';
import { useFarmRadar } from '../../hooks/useFarmRadar';
import FarmRadarCard from './FarmRadarCard';
import CriticalAlertsPanel from './CriticalAlertsPanel';
import NewBornFarmsAlert from './NewBornFarmsAlert';
import ExpenseApprovalsView from './ExpenseApprovalsView';
import FarmsComparisonPanel from './FarmsComparisonPanel';

type Tab = 'radar' | 'expenses';

export default function B2FOperationsRoom() {
  const navigate = useNavigate();
  const { farms, loading, error, refresh } = useFarmRadar();
  const [filterFarmIds, setFilterFarmIds] = useState<string[] | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('radar');

  const filteredFarms = filterFarmIds
    ? farms.filter(farm => filterFarmIds.includes(farm.id))
    : farms;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-slate-50" dir="rtl">
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-emerald-900 border-b border-emerald-700 shadow-xl">
        <div className="max-w-[1600px] mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/admin/operations-room')}
                className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-500 flex items-center justify-center shadow-lg">
                <Leaf className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">غرفة عمليات B2F</h1>
                <p className="text-emerald-200 text-sm">Farm Radar & Financial Approvals</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {activeTab === 'radar' && (
                <button
                  onClick={refresh}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 text-white ${loading ? 'animate-spin' : ''}`} />
                  <span className="text-white text-sm font-medium">تحديث</span>
                </button>
              )}
              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 rounded-xl">
                <Activity className="w-4 h-4 text-emerald-300 animate-pulse" />
                <span className="text-emerald-200 text-sm font-medium">مباشر</span>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-3 mt-6">
            <button
              onClick={() => setActiveTab('radar')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all ${
                activeTab === 'radar'
                  ? 'bg-white text-emerald-900 shadow-lg'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <Radar className="w-5 h-5" />
              Farm Radar
            </button>
            <button
              onClick={() => setActiveTab('expenses')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all ${
                activeTab === 'expenses'
                  ? 'bg-white text-emerald-900 shadow-lg'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <DollarSign className="w-5 h-5" />
              الاعتمادات المالية
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 py-6">
        {activeTab === 'radar' ? (
          <>
            <NewBornFarmsAlert />

            <div className="mb-6">
              <FarmsComparisonPanel />
            </div>

            <CriticalAlertsPanel
              onFilterChange={setFilterFarmIds}
              activeFilter={filterFarmIds}
            />

            <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-900">
                  {filterFarmIds ? 'المزارع المفلترة' : 'جميع المزارع'}
                </h2>
                <span className="text-sm text-slate-500">
                  {filteredFarms.length} {filterFarmIds ? `من ${farms.length}` : ''} مزرعة
                </span>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
                  <span className="mr-4 text-slate-600">جاري تحميل المزارع...</span>
                </div>
              ) : error ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
                    <AlertTriangle className="w-8 h-8 text-red-600" />
                  </div>
                  <p className="text-red-600 font-medium">{error}</p>
                  <button
                    onClick={refresh}
                    className="mt-4 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    إعادة المحاولة
                  </button>
                </div>
              ) : filteredFarms.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                    <Leaf className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-slate-600 font-medium">
                    {filterFarmIds ? 'لا توجد مزارع تطابق هذا الفلتر' : 'لا توجد مزارع حالياً'}
                  </p>
                  {filterFarmIds && (
                    <button
                      onClick={() => setFilterFarmIds(null)}
                      className="mt-4 px-4 py-2 bg-slate-500 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      عرض جميع المزارع
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredFarms.map((farm) => (
                    <FarmRadarCard key={farm.id} farm={farm} />
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <ExpenseApprovalsView />
        )}
      </div>
    </div>
  );
}
