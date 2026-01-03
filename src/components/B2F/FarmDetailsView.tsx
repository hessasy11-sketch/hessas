import { useState, useEffect } from 'react';
import {
  ChevronLeft,
  MapPin,
  TreePine,
  TrendingUp,
  FileCheck,
  Edit3,
  Trash2,
  Power,
  PowerOff,
  RefreshCw,
  Plus,
  Eye,
  Info,
  Wallet,
  PlayCircle,
  Target,
  TrendingDown
} from 'lucide-react';
import { B2FFarm } from '../../hooks/useB2FFarms';
import { supabase } from '../../lib/supabase';
import B2FFarmFormModal from './B2FFarmFormModal';
import OpportunityFormModal from './OpportunityFormModal';

interface FarmDetailsViewProps {
  farm: B2FFarm;
  onBack: () => void;
  onUpdate: () => void;
  onDelete: () => void;
  onToggleStatus: () => void;
}

interface OpportunityData {
  id: string;
  title: string;
  tree_type: string;
  price_per_tree: number;
  available_trees: number;
  status: string;
  badge: string;
}

interface RequestData {
  id: string;
  investor_name: string;
  investor_phone: string;
  num_trees: number;
  status: string;
  created_at: string;
  opportunity?: {
    title: string;
  };
}

interface FarmWallet {
  id: string;
  target_amount: number;
  collected_amount: number;
  completion_percentage: number;
  status: 'red' | 'green';
  wallet_phase: 'fundraising' | 'operating' | 'completed' | 'paused';
  total_investors: number;
  total_receipts: number;
  fundraising_completed_at: string | null;
}

export default function FarmDetailsView({
  farm,
  onBack,
  onUpdate,
  onDelete,
  onToggleStatus
}: FarmDetailsViewProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'opportunities' | 'requests'>('info');
  const [opportunities, setOpportunities] = useState<OpportunityData[]>([]);
  const [requests, setRequests] = useState<RequestData[]>([]);
  const [wallet, setWallet] = useState<FarmWallet | null>(null);
  const [loading, setLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddOpportunityModal, setShowAddOpportunityModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [closingForOperations, setClosingForOperations] = useState(false);

  useEffect(() => {
    loadFarmData();
  }, [farm.id]);

  const loadFarmData = async () => {
    setLoading(true);
    try {
      const [oppsRes, reqsRes, walletRes] = await Promise.all([
        supabase
          .from('b2f_opportunities')
          .select('id, title, tree_type, price_per_tree, available_trees, status, badge')
          .eq('farm_id', farm.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('b2f_investment_requests')
          .select(`
            id,
            investor_name,
            investor_phone,
            num_trees,
            status,
            created_at,
            opportunity:b2f_opportunities(title)
          `)
          .eq('farm_id', farm.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('b2f_farm_wallets')
          .select('*')
          .eq('farm_id', farm.id)
          .maybeSingle()
      ]);

      if (oppsRes.data) setOpportunities(oppsRes.data);
      if (reqsRes.data) setRequests(reqsRes.data as any);
      if (walletRes.data) setWallet(walletRes.data);
    } catch (error) {
      console.error('Error loading farm data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (farmData: any) => {
    const { error } = await supabase
      .from('b2f_farms')
      .update(farmData)
      .eq('id', farm.id);

    if (!error) {
      onUpdate();
      setShowEditModal(false);
      loadFarmData();
      return { success: true };
    }
    return { success: false, error: 'فشل التحديث' };
  };

  const handleAddOpportunity = async (oppData: any) => {
    const { error } = await supabase
      .from('b2f_opportunities')
      .insert([{ ...oppData, farm_id: farm.id }]);

    if (!error) {
      setShowAddOpportunityModal(false);
      loadFarmData();
      return { success: true };
    }
    return { success: false, error: 'فشل إضافة العرض' };
  };

  const handleDeleteFarm = async () => {
    if (opportunities.length > 0 || requests.length > 0) {
      alert('لا يمكن حذف المزرعة لأنها تحتوي على عروض أو طلبات مرتبطة');
      return;
    }

    const { error } = await supabase
      .from('b2f_farms')
      .delete()
      .eq('id', farm.id);

    if (!error) {
      onDelete();
    } else {
      alert('فشل حذف المزرعة');
    }
  };

  const handleCloseForOperations = async () => {
    if (!wallet) {
      alert('لا توجد محفظة لهذه المزرعة');
      return;
    }

    if (wallet.status !== 'green') {
      alert('لا يمكن بدء التشغيل قبل اكتمال التمويل المطلوب');
      return;
    }

    if (!confirm('هل أنت متأكد من غلق طلبات الاستثمار وبدء مرحلة التشغيل؟\n\nهذا الإجراء سيمنع أي طلبات جديدة على هذه المزرعة.')) {
      return;
    }

    setClosingForOperations(true);
    try {
      // 1. تحديث محفظة المزرعة
      const { error: walletError } = await supabase
        .from('b2f_farm_wallets')
        .update({
          wallet_phase: 'operating',
          updated_at: new Date().toISOString()
        })
        .eq('farm_id', farm.id);

      if (walletError) throw walletError;

      // 2. إغلاق جميع الفرص الاستثمارية النشطة
      const { error: oppsError } = await supabase
        .from('b2f_opportunities')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('farm_id', farm.id)
        .eq('is_active', true);

      if (oppsError) throw oppsError;

      alert('تم بنجاح! تم إغلاق طلبات الاستثمار وبدء مرحلة التشغيل');
      await loadFarmData();
    } catch (error) {
      console.error('Error closing for operations:', error);
      alert('حدث خطأ أثناء العملية');
    } finally {
      setClosingForOperations(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { text: string; colors: string }> = {
      pending: { text: 'قيد المراجعة', colors: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
      waiting_in_group: { text: 'في قائمة انتظار المجموعة', colors: 'bg-blue-100 text-blue-800 border-blue-200' },
      group_full_pending_payment: { text: 'مجموعة مكتملة', colors: 'bg-purple-100 text-purple-800 border-purple-200' },
      payment_open: { text: 'الدفع مفتوح', colors: 'bg-green-100 text-green-800 border-green-200' },
      receipt_uploaded_ai_review: { text: 'قيد مراجعة AI', colors: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
      receipt_duplicate_financial_review: { text: 'مراجعة مالية', colors: 'bg-orange-100 text-orange-800 border-orange-200' },
      receipt_approved_pending_invoice: { text: 'ينتظر الفاتورة', colors: 'bg-blue-100 text-blue-800 border-blue-200' },
      invoice_issued: { text: 'فاتورة صادرة', colors: 'bg-green-100 text-green-800 border-green-200' },
      contract_issued: { text: 'عقد صادر', colors: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
      operational: { text: 'قيد التشغيل', colors: 'bg-teal-100 text-teal-800 border-teal-200' },
      rejected: { text: 'مرفوض', colors: 'bg-red-100 text-red-800 border-red-200' }
    };
    const badge = badges[status] || badges.pending;
    return (
      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border-2 ${badge.colors}`}>
        {badge.text}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-50 to-gray-100 z-50 overflow-y-auto" dir="rtl">
      <div className="sticky top-0 z-10 backdrop-blur-xl bg-gradient-to-r from-emerald-500 to-teal-600 shadow-lg">
        <div className="px-4 py-4 flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-all duration-200 hover:scale-105 active:scale-95"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex-1">
            <h2 className="text-xl font-black text-white mb-0.5">
              {farm.name}
            </h2>
            <div className="flex items-center gap-2 text-sm text-white/90">
              <MapPin className="w-3.5 h-3.5" />
              <span>
                {farm.location}
                {farm.city && ` - ${farm.city}`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEditModal(true)}
              className="p-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-all hover:scale-105 active:scale-95"
            >
              <Edit3 className="w-5 h-5" />
            </button>

            {!deleteConfirm ? (
              <button
                onClick={() => setDeleteConfirm(true)}
                className="p-2.5 rounded-xl bg-white/20 hover:bg-red-500 text-white transition-all hover:scale-105 active:scale-95"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            ) : (
              <div className="flex items-center gap-2 bg-white/20 rounded-xl p-2">
                <button
                  onClick={handleDeleteFarm}
                  className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-all"
                >
                  تأكيد
                </button>
                <button
                  onClick={() => setDeleteConfirm(false)}
                  className="px-3 py-1.5 bg-white text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-100 transition-all"
                >
                  إلغاء
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="px-4 pb-4">
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-2xl p-1">
            <button
              onClick={() => setActiveTab('info')}
              className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${
                activeTab === 'info'
                  ? 'bg-white text-emerald-700 shadow-lg'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              <Info className="w-4 h-4 inline-block ml-2" />
              معلومات المزرعة
            </button>
            <button
              onClick={() => setActiveTab('opportunities')}
              className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${
                activeTab === 'opportunities'
                  ? 'bg-white text-emerald-700 shadow-lg'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              <TrendingUp className="w-4 h-4 inline-block ml-2" />
              العروض ({opportunities.length})
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${
                activeTab === 'requests'
                  ? 'bg-white text-emerald-700 shadow-lg'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              <FileCheck className="w-4 h-4 inline-block ml-2" />
              الطلبات ({requests.length})
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 max-w-7xl mx-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="w-12 h-12 animate-spin text-emerald-600" />
          </div>
        ) : (
          <>
            {activeTab === 'info' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-6 text-white shadow-lg">
                    <div className="flex items-center gap-3 mb-3">
                      <TreePine className="w-8 h-8" />
                      <div>
                        <p className="text-sm opacity-90">إجمالي الأشجار</p>
                        <p className="text-3xl font-black">{farm.total_trees_available.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-3xl p-6 shadow-lg border-2 border-gray-100">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                        <MapPin className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">الموقع</p>
                        <p className="text-xl font-black text-gray-900">
                          {farm.location}
                          {farm.city && ` - ${farm.city}`}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {wallet && (
                  <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-3xl p-6 shadow-xl border-2 border-blue-200">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                        <Wallet className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-blue-900">محفظة المزرعة المالية</h3>
                        <p className="text-sm text-blue-700">تتبع تقدم التمويل والتشغيل</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <div className="bg-white rounded-2xl p-5 shadow-md">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="text-sm text-gray-600 mb-1">المبلغ المستهدف</p>
                            <p className="text-2xl font-black text-gray-900">
                              {wallet.target_amount.toLocaleString()} <span className="text-lg">ريال</span>
                            </p>
                          </div>
                          <Target className="w-8 h-8 text-blue-500" />
                        </div>
                      </div>

                      <div className="bg-white rounded-2xl p-5 shadow-md">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="text-sm text-gray-600 mb-1">المبلغ المجموع</p>
                            <p className="text-2xl font-black text-emerald-700">
                              {wallet.collected_amount.toLocaleString()} <span className="text-lg">ريال</span>
                            </p>
                          </div>
                          <TrendingDown className="w-8 h-8 text-emerald-500" />
                        </div>
                      </div>
                    </div>

                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold text-gray-700">نسبة الإنجاز</span>
                        <span className="text-lg font-black text-indigo-700">{wallet.completion_percentage}%</span>
                      </div>
                      <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-500 transition-all duration-500 shadow-lg"
                          style={{ width: `${Math.min(wallet.completion_percentage, 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-6">
                      <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                        <p className="text-xs text-gray-600 mb-1">الإيصالات</p>
                        <p className="text-2xl font-black text-gray-900">{wallet.total_receipts}</p>
                      </div>
                      <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                        <p className="text-xs text-gray-600 mb-1">المستثمرون</p>
                        <p className="text-2xl font-black text-gray-900">{wallet.total_investors}</p>
                      </div>
                      <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <p className="text-xs text-gray-600">الحالة</p>
                          {wallet.status === 'green' ? (
                            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse shadow-lg shadow-green-500/50" />
                          ) : (
                            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse shadow-lg shadow-red-500/50" />
                          )}
                        </div>
                        <p className="text-lg font-black">
                          {wallet.status === 'green' ? (
                            <span className="text-green-700">مكتمل 🟢</span>
                          ) : (
                            <span className="text-red-700">جاري 🔴</span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 p-4 bg-white rounded-2xl shadow-md mb-4">
                      <div className="flex-1">
                        <p className="text-sm text-gray-600 mb-1">المرحلة الحالية</p>
                        <p className="text-lg font-black text-gray-900">
                          {wallet.wallet_phase === 'fundraising' && '💰 مرحلة جمع الأموال'}
                          {wallet.wallet_phase === 'operating' && '🚀 مرحلة التشغيل'}
                          {wallet.wallet_phase === 'completed' && '✅ مكتملة'}
                          {wallet.wallet_phase === 'paused' && '⏸️ متوقفة'}
                        </p>
                      </div>
                    </div>

                    {wallet.status === 'green' && wallet.wallet_phase === 'fundraising' && (
                      <button
                        onClick={handleCloseForOperations}
                        disabled={closingForOperations}
                        className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white rounded-2xl py-4 px-6 font-black text-lg hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 transition-all shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <PlayCircle className="w-6 h-6" />
                        {closingForOperations ? 'جاري التحويل...' : 'غلق طلبات الاستثمار وبدء التشغيل'}
                      </button>
                    )}

                    {wallet.wallet_phase === 'operating' && (
                      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-5 text-white text-center shadow-lg">
                        <PlayCircle className="w-12 h-12 mx-auto mb-3" />
                        <p className="text-lg font-black">المزرعة في مرحلة التشغيل 🚀</p>
                        <p className="text-sm opacity-90 mt-2">تم غلق طلبات الاستثمار الجديدة</p>
                      </div>
                    )}
                  </div>
                )}

                {!wallet && (
                  <div className="bg-yellow-50 rounded-3xl p-6 border-2 border-yellow-200">
                    <div className="flex items-center gap-3">
                      <Info className="w-8 h-8 text-yellow-600" />
                      <div>
                        <p className="text-lg font-black text-yellow-900 mb-1">لا توجد محفظة مالية</p>
                        <p className="text-sm text-yellow-700">سيتم إنشاء المحفظة تلقائياً عند استلام أول إيصال دفع</p>
                      </div>
                    </div>
                  </div>
                )}


                {farm.description && (
                  <div className="bg-white rounded-3xl p-6 shadow-lg border-2 border-gray-100">
                    <h3 className="text-lg font-black text-gray-900 mb-3">الوصف</h3>
                    <p className="text-gray-700 leading-relaxed">{farm.description}</p>
                  </div>
                )}

                <div className="bg-white rounded-3xl p-6 shadow-lg border-2 border-gray-100">
                  <h3 className="text-lg font-black text-gray-900 mb-4">الحالة</h3>
                  <button
                    onClick={onToggleStatus}
                    className={`flex items-center gap-3 px-6 py-3 rounded-xl font-bold transition-all hover:scale-105 active:scale-95 ${
                      farm.is_active
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {farm.is_active ? (
                      <>
                        <Power className="w-5 h-5" />
                        <span>المزرعة مفعلة</span>
                      </>
                    ) : (
                      <>
                        <PowerOff className="w-5 h-5" />
                        <span>المزرعة موقوفة</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'opportunities' && (
              <div className="space-y-4">
                <button
                  onClick={() => setShowAddOpportunityModal(true)}
                  className="w-full bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-2xl py-4 px-6 font-black text-lg hover:from-amber-700 hover:to-orange-700 transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3"
                >
                  <Plus className="w-6 h-6" />
                  إضافة عرض استثماري جديد
                </button>

                {opportunities.length === 0 ? (
                  <div className="bg-white rounded-3xl p-16 text-center border-2 border-dashed border-gray-300">
                    <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-black text-gray-900 mb-2">لا توجد عروض بعد</h3>
                    <p className="text-gray-600">أضف أول عرض استثماري لهذه المزرعة</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {opportunities.map((opp) => (
                      <div key={opp.id} className="bg-white rounded-2xl p-5 shadow-lg border-2 border-amber-100">
                        <h4 className="text-lg font-black text-gray-900 mb-3">{opp.title}</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">نوع الشجرة:</span>
                            <span className="font-bold text-gray-900">{opp.tree_type}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">سعر الشجرة:</span>
                            <span className="font-bold text-emerald-700">{opp.price_per_tree} ريال</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">الأشجار المتاحة:</span>
                            <span className="font-bold text-blue-700">{opp.available_trees}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'requests' && (
              <div className="space-y-4">
                {requests.length === 0 ? (
                  <div className="bg-white rounded-3xl p-16 text-center border-2 border-dashed border-gray-300">
                    <FileCheck className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-black text-gray-900 mb-2">لا توجد طلبات بعد</h3>
                    <p className="text-gray-600">لم يتم تقديم أي طلبات استثمار لهذه المزرعة</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {requests.map((req) => (
                      <div key={req.id} className="bg-white rounded-2xl p-5 shadow-lg border-2 border-blue-100">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="text-lg font-black text-gray-900 mb-1">{req.investor_name}</h4>
                            <p className="text-sm text-gray-600">{req.investor_phone}</p>
                          </div>
                          {getStatusBadge(req.status)}
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="bg-emerald-50 rounded-xl p-3">
                            <span className="text-emerald-700 font-bold">{req.num_trees} شجرة</span>
                          </div>
                          <div className="bg-blue-50 rounded-xl p-3">
                            <span className="text-blue-700 font-medium">{new Date(req.created_at).toLocaleDateString('ar-SA')}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {showEditModal && (
        <B2FFarmFormModal
          farm={farm}
          onClose={() => setShowEditModal(false)}
          onSave={handleUpdate}
        />
      )}

      {showAddOpportunityModal && (
        <OpportunityFormModal
          farmId={farm.id}
          onClose={() => setShowAddOpportunityModal(false)}
          onSave={handleAddOpportunity}
        />
      )}
    </div>
  );
}
