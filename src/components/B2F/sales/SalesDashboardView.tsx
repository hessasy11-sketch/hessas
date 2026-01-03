import { useState, useEffect } from 'react';
import { BarChart3, Package, Wallet, FileCheck, CheckCircle, TrendingUp, Filter, RefreshCw } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface SalesStats {
  collection_queue: number;
  payment_open: number;
  with_receipt: number;
  approved_for_contract: number;
  total_amount_collection: number;
  total_amount_payment_open: number;
  total_amount_approved: number;
}

interface FarmStats {
  farm_id: string;
  farm_name: string;
  collection_queue: number;
  payment_open: number;
  with_receipt: number;
  approved_for_contract: number;
  total_amount: number;
}

export default function SalesDashboardView() {
  const [stats, setStats] = useState<SalesStats>({
    collection_queue: 0,
    payment_open: 0,
    with_receipt: 0,
    approved_for_contract: 0,
    total_amount_collection: 0,
    total_amount_payment_open: 0,
    total_amount_approved: 0
  });
  const [farmStats, setFarmStats] = useState<FarmStats[]>([]);
  const [selectedFarm, setSelectedFarm] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();

    // Realtime subscription
    const channel = supabase
      .channel('sales-dashboard-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'b2f_sales_requests'
      }, () => {
        loadDashboardData();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'b2f_payment_documents'
      }, () => {
        loadDashboardData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadDashboardData = async () => {
    try {
      // إحصائيات عامة
      const { data: allRequests } = await supabase
        .from('b2f_sales_requests')
        .select('id, status, total_amount, farm_id');

      if (allRequests) {
        const collection = allRequests.filter(r => r.status === 'collection_queue');
        const paymentOpen = allRequests.filter(r => r.status === 'payment_open');

        // جلب الطلبات التي لها إيصالات
        const { data: requestsWithReceipts } = await supabase
          .from('b2f_payment_documents')
          .select('request_id');

        const requestIdsWithReceipts = new Set(requestsWithReceipts?.map(r => r.request_id) || []);

        // جلب الطلبات المعتمدة
        const { data: approvedDocs } = await supabase
          .from('b2f_payment_documents')
          .select('request_id')
          .in('finance_status', ['approved_for_contract', 'manually_approved']);

        const approvedRequestIds = new Set(approvedDocs?.map(r => r.request_id) || []);

        setStats({
          collection_queue: collection.length,
          payment_open: paymentOpen.length,
          with_receipt: requestIdsWithReceipts.size,
          approved_for_contract: approvedRequestIds.size,
          total_amount_collection: collection.reduce((sum, r) => sum + (r.total_amount || 0), 0),
          total_amount_payment_open: paymentOpen.reduce((sum, r) => sum + (r.total_amount || 0), 0),
          total_amount_approved: allRequests
            .filter(r => approvedRequestIds.has(r.id))
            .reduce((sum, r) => sum + (r.total_amount || 0), 0)
        });

        // إحصائيات حسب المزرعة
        await loadFarmStats();
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadFarmStats = async () => {
    try {
      const { data: farms } = await supabase
        .from('b2f_farms')
        .select('id, name');

      if (!farms) return;

      const farmStatsData: FarmStats[] = [];

      for (const farm of farms) {
        const { data: requests } = await supabase
          .from('b2f_sales_requests')
          .select('id, status, total_amount')
          .eq('farm_id', farm.id);

        if (!requests || requests.length === 0) continue;

        const collectionQueue = requests.filter(r => r.status === 'collection_queue');
        const paymentOpen = requests.filter(r => r.status === 'payment_open');

        // عدد الإيصالات
        const { data: receipts } = await supabase
          .from('b2f_payment_documents')
          .select('request_id')
          .in('request_id', requests.map(r => r.id));

        // عدد المعتمدة
        const { data: approved } = await supabase
          .from('b2f_payment_documents')
          .select('request_id')
          .in('request_id', requests.map(r => r.id))
          .in('finance_status', ['approved_for_contract', 'manually_approved']);

        farmStatsData.push({
          farm_id: farm.id,
          farm_name: farm.name,
          collection_queue: collectionQueue.length,
          payment_open: paymentOpen.length,
          with_receipt: receipts?.length || 0,
          approved_for_contract: approved?.length || 0,
          total_amount: requests.reduce((sum, r) => sum + (r.total_amount || 0), 0)
        });
      }

      setFarmStats(farmStatsData.sort((a, b) => b.total_amount - a.total_amount));
    } catch (error) {
      console.error('Error loading farm stats:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-gray-600">جاري التحميل...</p>
      </div>
    );
  }

  const displayStats = selectedFarm
    ? farmStats.find(f => f.farm_id === selectedFarm)
    : stats;

  return (
    <div className="space-y-6">
      {/* الرأس */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-gray-800">لوحة متابعة الطلبات</h2>
          <p className="text-sm text-gray-600 mt-1">إحصائيات شاملة لجميع مراحل المبيعات</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className={`
            flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-200 rounded-lg
            font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all
            ${refreshing ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'جاري التحديث...' : 'تحديث'}
        </button>
      </div>

      {/* فلتر المزارع */}
      <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
        <div className="flex items-center gap-3 mb-3">
          <Filter className="w-5 h-5 text-gray-600" />
          <span className="font-bold text-gray-700">تصفية حسب المزرعة</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedFarm(null)}
            className={`
              px-4 py-2 rounded-lg font-bold transition-all
              ${!selectedFarm
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }
            `}
          >
            جميع المزارع
          </button>
          {farmStats.map((farm) => (
            <button
              key={farm.farm_id}
              onClick={() => setSelectedFarm(farm.farm_id)}
              className={`
                px-4 py-2 rounded-lg font-bold transition-all
                ${selectedFarm === farm.farm_id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
            >
              {farm.farm_name}
            </button>
          ))}
        </div>
      </div>

      {/* البطاقات الإحصائية */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* قائمة التجميع */}
        <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Package className="w-6 h-6" />
            </div>
            <div className="text-3xl font-black">
              {selectedFarm
                ? farmStats.find(f => f.farm_id === selectedFarm)?.collection_queue || 0
                : stats.collection_queue
              }
            </div>
          </div>
          <div className="text-lg font-bold mb-1">قائمة التجميع</div>
          <div className="text-sm text-white/80">طلبات في الانتظار</div>
          {!selectedFarm && (
            <div className="mt-3 pt-3 border-t border-white/20 text-xs">
              المبلغ الإجمالي: {stats.total_amount_collection.toLocaleString()} ريال
            </div>
          )}
        </div>

        {/* مفتوح للدفع */}
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Wallet className="w-6 h-6" />
            </div>
            <div className="text-3xl font-black">
              {selectedFarm
                ? farmStats.find(f => f.farm_id === selectedFarm)?.payment_open || 0
                : stats.payment_open
              }
            </div>
          </div>
          <div className="text-lg font-bold mb-1">مفتوح للدفع</div>
          <div className="text-sm text-white/80">في انتظار الإيصالات</div>
          {!selectedFarm && (
            <div className="mt-3 pt-3 border-t border-white/20 text-xs">
              المبلغ الإجمالي: {stats.total_amount_payment_open.toLocaleString()} ريال
            </div>
          )}
        </div>

        {/* تم رفع إيصال */}
        <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <FileCheck className="w-6 h-6" />
            </div>
            <div className="text-3xl font-black">
              {selectedFarm
                ? farmStats.find(f => f.farm_id === selectedFarm)?.with_receipt || 0
                : stats.with_receipt
              }
            </div>
          </div>
          <div className="text-lg font-bold mb-1">تم رفع إيصال</div>
          <div className="text-sm text-white/80">في المراجعة المالية</div>
        </div>

        {/* معتمد ماليًا */}
        <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div className="text-3xl font-black">
              {selectedFarm
                ? farmStats.find(f => f.farm_id === selectedFarm)?.approved_for_contract || 0
                : stats.approved_for_contract
              }
            </div>
          </div>
          <div className="text-lg font-bold mb-1">معتمد ماليًا</div>
          <div className="text-sm text-white/80">جاهز للعقود</div>
          {!selectedFarm && (
            <div className="mt-3 pt-3 border-t border-white/20 text-xs">
              المبلغ الإجمالي: {stats.total_amount_approved.toLocaleString()} ريال
            </div>
          )}
        </div>
      </div>

      {/* جدول إحصائيات المزارع */}
      {!selectedFarm && farmStats.length > 0 && (
        <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-cyan-600 p-4 text-white">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-6 h-6" />
              <h3 className="text-lg font-bold">توزيع الطلبات حسب المزارع</h3>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">المزرعة</th>
                  <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">قائمة التجميع</th>
                  <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">مفتوح للدفع</th>
                  <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">تم رفع إيصال</th>
                  <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">معتمد</th>
                  <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">المبلغ الإجمالي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {farmStats.map((farm) => (
                  <tr key={farm.farm_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-bold text-gray-800">{farm.farm_name}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-sm">
                        {farm.collection_queue}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-700 font-bold text-sm">
                        {farm.payment_open}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold text-sm">
                        {farm.with_receipt}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-bold text-sm">
                        {farm.approved_for_contract}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-left font-bold text-emerald-600">
                      {farm.total_amount.toLocaleString()} ريال
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
