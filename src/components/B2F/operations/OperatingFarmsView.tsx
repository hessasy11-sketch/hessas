import { useState, useEffect } from 'react';
import {
  Factory,
  TreePine,
  MapPin,
  Users,
  FileText,
  RefreshCw,
  ChevronRight,
  Edit3,
  PlayCircle,
  Loader2,
  Clock,
  CheckCircle,
  Package,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface OperatingFarm {
  id: string;
  name: string;
  location: string;
  city: string | null;
  total_trees_available: number;
  wallet: {
    id: string;
    collected_amount: number;
    total_investors: number;
    operation_status: string | null;
    wallet_phase: string;
  } | null;
  contracts_count: number;
}

interface Contract {
  id: string;
  contract_number: string;
  investor_phone: string;
  trees_count: number;
  amount_total: number;
  operation_status: string;
  start_date: string;
  status: string;
}

export default function OperatingFarmsView() {
  const [farms, setFarms] = useState<OperatingFarm[]>([]);
  const [selectedFarm, setSelectedFarm] = useState<OperatingFarm | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingContracts, setLoadingContracts] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);

  useEffect(() => {
    loadOperatingFarms();
  }, []);

  const loadOperatingFarms = async () => {
    try {
      setLoading(true);

      const { data: farmsData, error } = await supabase
        .from('b2f_farms')
        .select(`
          id,
          name,
          location,
          city,
          total_trees_available,
          wallet:b2f_farm_wallets!inner(
            id,
            collected_amount,
            total_investors,
            operation_status,
            wallet_phase
          )
        `)
        .eq('is_active', true);

      if (error) throw error;

      const operatingFarms = (farmsData || [])
        .filter((farm: any) => farm.wallet && farm.wallet.wallet_phase === 'operating')
        .map((farm: any) => ({
          ...farm,
          wallet: Array.isArray(farm.wallet) ? farm.wallet[0] : farm.wallet,
          contracts_count: 0
        }));

      for (const farm of operatingFarms) {
        const { count } = await supabase
          .from('b2f_contracts')
          .select('*', { count: 'exact', head: true })
          .eq('farm_id', farm.id)
          .eq('status', 'active');

        farm.contracts_count = count || 0;
      }

      setFarms(operatingFarms);
    } catch (error) {
      console.error('Error loading operating farms:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFarmContracts = async (farmId: string) => {
    try {
      setLoadingContracts(true);
      const { data, error } = await supabase
        .from('b2f_contracts')
        .select('*')
        .eq('farm_id', farmId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setContracts(data || []);
    } catch (error) {
      console.error('Error loading contracts:', error);
    } finally {
      setLoadingContracts(false);
    }
  };

  const handleFarmClick = async (farm: OperatingFarm) => {
    setSelectedFarm(farm);
    await loadFarmContracts(farm.id);
  };

  const getOperationStatusBadge = (status: string | null) => {
    const badges: Record<string, { text: string; colors: string; icon: any }> = {
      pending_start: { text: 'في انتظار البدء', colors: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
      in_progress: { text: 'قيد التشغيل', colors: 'bg-blue-100 text-blue-800 border-blue-200', icon: PlayCircle },
      harvest_ready: { text: 'جاهز للحصاد', colors: 'bg-green-100 text-green-800 border-green-200', icon: Package },
      completed: { text: 'مكتمل', colors: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: CheckCircle }
    };

    const badge = badges[status || 'pending_start'];
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border-2 ${badge.colors}`}>
        <Icon className="w-3.5 h-3.5" />
        {badge.text}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin text-emerald-600 mx-auto mb-4" />
          <p className="text-sm text-gray-600 font-medium">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 rounded-2xl p-6 border border-emerald-200 shadow-md">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0 shadow-lg">
            <Factory className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1">
            <h4 className="text-xl font-black text-emerald-900 mb-2">
              المزارع التشغيلية
            </h4>
            <p className="text-sm text-emerald-800 leading-relaxed">
              المزارع التي أكملت مرحلة التمويل وانتقلت لمرحلة التشغيل الفعلي. يمكنك متابعة حالة التشغيل والعقود المرتبطة بكل مزرعة.
            </p>
          </div>
        </div>
      </div>

      {farms.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center border-2 border-dashed border-gray-300">
          <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-black text-gray-900 mb-2">لا توجد مزارع تشغيلية بعد</h3>
          <p className="text-gray-600">
            لم يتم تحويل أي مزرعة لمرحلة التشغيل حتى الآن. يتم التحويل تلقائياً عند اكتمال التمويل وغلق الطلبات.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-lg font-black text-gray-900 mb-4">
              المزارع ({farms.length})
            </h3>
            {farms.map((farm) => (
              <div
                key={farm.id}
                onClick={() => handleFarmClick(farm)}
                className={`bg-white rounded-2xl p-5 shadow-lg border-2 cursor-pointer transition-all hover:shadow-xl ${
                  selectedFarm?.id === farm.id
                    ? 'border-emerald-500 ring-2 ring-emerald-200'
                    : 'border-gray-100 hover:border-emerald-200'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="text-lg font-black text-gray-900 mb-1">
                      {farm.name}
                    </h4>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="w-4 h-4" />
                      <span>{farm.location}</span>
                      {farm.city && <span>• {farm.city}</span>}
                    </div>
                  </div>
                  <ChevronRight className={`w-5 h-5 text-emerald-600 transition-transform ${
                    selectedFarm?.id === farm.id ? 'rotate-90' : ''
                  }`} />
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-emerald-50 rounded-xl p-3 text-center">
                    <TreePine className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                    <p className="text-xs text-gray-600 mb-1">الأشجار</p>
                    <p className="text-lg font-black text-emerald-700">{farm.total_trees_available}</p>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-3 text-center">
                    <Users className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                    <p className="text-xs text-gray-600 mb-1">المستثمرون</p>
                    <p className="text-lg font-black text-blue-700">{farm.wallet?.total_investors || 0}</p>
                  </div>
                  <div className="bg-purple-50 rounded-xl p-3 text-center">
                    <FileText className="w-5 h-5 text-purple-600 mx-auto mb-1" />
                    <p className="text-xs text-gray-600 mb-1">العقود</p>
                    <p className="text-lg font-black text-purple-700">{farm.contracts_count}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <span className="text-xs text-gray-500 font-medium">حالة التشغيل:</span>
                  {getOperationStatusBadge(farm.wallet?.operation_status || 'pending_start')}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            {!selectedFarm ? (
              <div className="bg-gray-50 rounded-2xl p-12 text-center border-2 border-dashed border-gray-300">
                <Factory className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">اختر مزرعة لعرض العقود</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-black text-gray-900">
                    عقود {selectedFarm.name} ({contracts.length})
                  </h3>
                  <button
                    onClick={() => setSelectedContract({ operation_status: 'in_progress' } as Contract)}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-bold transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                  >
                    <Edit3 className="w-4 h-4" />
                    تغيير حالة المزرعة
                  </button>
                </div>

                {loadingContracts ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                  </div>
                ) : contracts.length === 0 ? (
                  <div className="bg-white rounded-2xl p-12 text-center border-2 border-dashed border-gray-200">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">لا توجد عقود نشطة لهذه المزرعة</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {contracts.map((contract) => (
                      <div
                        key={contract.id}
                        className="bg-white rounded-xl p-5 shadow-md border border-gray-200 hover:shadow-lg transition-all"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="text-sm text-gray-600 mb-1">رقم العقد</p>
                            <p className="text-base font-mono font-black text-gray-900">
                              {contract.contract_number}
                            </p>
                          </div>
                          {getOperationStatusBadge(contract.operation_status)}
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                          <div className="bg-gray-50 rounded-lg p-3">
                            <span className="text-gray-600">عدد الأشجار:</span>
                            <span className="font-bold text-emerald-700 mr-2">{contract.trees_count}</span>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-3">
                            <span className="text-gray-600">المبلغ:</span>
                            <span className="font-bold text-blue-700 mr-2">{contract.amount_total.toLocaleString()} ريال</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                          <button
                            onClick={() => setSelectedContract(contract)}
                            className="flex-1 px-4 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2"
                          >
                            <Edit3 className="w-4 h-4" />
                            تغيير الحالة
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {selectedContract && (
        <UpdateOperationStatusModal
          contract={selectedContract}
          farm={selectedFarm}
          onClose={() => setSelectedContract(null)}
          onSuccess={() => {
            setSelectedContract(null);
            loadOperatingFarms();
            if (selectedFarm) {
              loadFarmContracts(selectedFarm.id);
            }
          }}
        />
      )}
    </div>
  );
}

interface UpdateOperationStatusModalProps {
  contract: Contract;
  farm: OperatingFarm | null;
  onClose: () => void;
  onSuccess: () => void;
}

function UpdateOperationStatusModal({ contract, farm, onClose, onSuccess }: UpdateOperationStatusModalProps) {
  const [selectedStatus, setSelectedStatus] = useState(contract.operation_status || 'pending_start');
  const [loading, setLoading] = useState(false);
  const isFarmUpdate = !contract.id;

  const statuses = [
    { id: 'pending_start', name: 'في انتظار البدء', icon: Clock, color: 'yellow' },
    { id: 'in_progress', name: 'قيد التشغيل', icon: PlayCircle, color: 'blue' },
    { id: 'harvest_ready', name: 'جاهز للحصاد', icon: Package, color: 'green' },
    { id: 'completed', name: 'مكتمل', icon: CheckCircle, color: 'emerald' }
  ];

  const handleUpdate = async () => {
    try {
      setLoading(true);

      if (isFarmUpdate && farm) {
        const { error } = await supabase
          .from('b2f_farm_wallets')
          .update({ operation_status: selectedStatus })
          .eq('farm_id', farm.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('b2f_contracts')
          .update({ operation_status: selectedStatus })
          .eq('id', contract.id);

        if (error) throw error;
      }

      alert('تم تحديث حالة التشغيل بنجاح');
      onSuccess();
    } catch (error) {
      console.error('Error updating operation status:', error);
      alert('حدث خطأ أثناء التحديث');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-black text-gray-900">
            {isFarmUpdate ? `تحديث حالة ${farm?.name}` : 'تحديث حالة العقد'}
          </h2>
          {!isFarmUpdate && (
            <p className="text-sm text-gray-600 mt-1">
              {contract.contract_number}
            </p>
          )}
        </div>

        <div className="p-6">
          <label className="block text-sm font-bold text-gray-900 mb-3">
            اختر الحالة الجديدة
          </label>
          <div className="space-y-2">
            {statuses.map((status) => {
              const Icon = status.icon;
              return (
                <button
                  key={status.id}
                  onClick={() => setSelectedStatus(status.id)}
                  className={`w-full p-4 rounded-xl border-2 text-right transition-all ${
                    selectedStatus === status.id
                      ? `border-${status.color}-500 bg-${status.color}-50`
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg bg-${status.color}-100 flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 text-${status.color}-600`} />
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gray-900">{status.name}</div>
                    </div>
                    {selectedStatus === status.id && (
                      <CheckCircle className={`w-5 h-5 text-${status.color}-600 mr-auto`} />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            إلغاء
          </button>
          <button
            onClick={handleUpdate}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                جاري التحديث...
              </>
            ) : (
              'تحديث الحالة'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
