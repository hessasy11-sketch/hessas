import { useState, useEffect } from 'react';
import { Package, Users, Zap, CheckSquare, RefreshCw, Trash2, X, AlertTriangle, CreditCard, Sparkles, Shield, Loader2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useSystemMessages } from '../../../hooks/useSystemMessages';
import SystemMessageBanner from '../SystemMessageBanner';

interface SalesRequest {
  id: string;
  investor_name: string;
  investor_phone: string;
  number_of_trees: number;
  tree_type: string;
  total_amount: number;
  created_at: string;
  farm_id: string;
}

interface FarmGroup {
  farm_id: string;
  farm_name: string;
  requests: SalesRequest[];
}

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText: string;
  cancelText?: string;
  type: 'payment' | 'delete' | 'warning';
  loading?: boolean;
  details?: { label: string; value: string | number }[];
}

function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmText, cancelText = 'إلغاء', type, loading, details }: ConfirmModalProps) {
  if (!isOpen) return null;

  const typeStyles = {
    payment: {
      gradient: 'from-emerald-500 via-green-500 to-teal-500',
      icon: CreditCard,
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      buttonBg: 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700',
      accentColor: 'emerald'
    },
    delete: {
      gradient: 'from-red-500 via-rose-500 to-pink-500',
      icon: Trash2,
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      buttonBg: 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700',
      accentColor: 'red'
    },
    warning: {
      gradient: 'from-amber-500 via-orange-500 to-yellow-500',
      icon: AlertTriangle,
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      buttonBg: 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700',
      accentColor: 'amber'
    }
  };

  const style = typeStyles[type];
  const IconComponent = style.icon;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className={`absolute top-0 left-0 right-0 h-2 bg-gradient-to-r ${style.gradient}`} />

        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-gray-100/50 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-gray-100/50 to-transparent rounded-full translate-y-1/2 -translate-x-1/2" />

        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 left-4 z-10 p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-all disabled:opacity-50"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>

        <div className="relative p-8 pt-10">
          <div className="flex flex-col items-center text-center">
            <div className={`w-20 h-20 ${style.iconBg} rounded-full flex items-center justify-center mb-6 shadow-lg`}>
              <div className="relative">
                <IconComponent className={`w-10 h-10 ${style.iconColor}`} />
                <Sparkles className={`w-4 h-4 ${style.iconColor} absolute -top-1 -right-1 animate-pulse`} />
              </div>
            </div>

            <h3 className="text-2xl font-black text-gray-900 mb-3">{title}</h3>
            <p className="text-gray-600 leading-relaxed mb-6">{message}</p>

            {details && details.length > 0 && (
              <div className={`w-full bg-${style.accentColor}-50 rounded-2xl p-4 mb-6 border border-${style.accentColor}-100`}>
                <div className="space-y-2">
                  {details.map((detail, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-gray-600 text-sm">{detail.label}</span>
                      <span className={`font-bold text-${style.accentColor}-600`}>{detail.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 w-full">
              <button
                onClick={onClose}
                disabled={loading}
                className="flex-1 px-6 py-4 bg-gray-100 text-gray-700 rounded-2xl font-bold hover:bg-gray-200 transition-all disabled:opacity-50"
              >
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className={`flex-1 px-6 py-4 ${style.buttonBg} text-white rounded-2xl font-bold transition-all shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center justify-center gap-2`}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>جاري التنفيذ...</span>
                  </>
                ) : (
                  <>
                    <Shield className="w-5 h-5" />
                    <span>{confirmText}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 px-8 py-4 border-t border-gray-100">
          <p className="text-xs text-gray-500 text-center flex items-center justify-center gap-2">
            <Shield className="w-3 h-3" />
            هذا الإجراء محمي ويتم تسجيله في النظام
          </p>
        </div>
      </div>
    </div>
  );
}

export default function CollectionQueueView() {
  const [farmGroups, setFarmGroups] = useState<FarmGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);
  const { getMessage } = useSystemMessages('sales');

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'payment' | 'delete' | 'warning';
    title: string;
    message: string;
    confirmText: string;
    onConfirm: () => void;
    details?: { label: string; value: string | number }[];
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadCollectionQueue();
  }, []);

  const loadCollectionQueue = async () => {
    try {
      const { data: requests, error } = await supabase
        .from('b2f_sales_requests')
        .select(`
          id,
          investor_name,
          investor_phone,
          number_of_trees,
          tree_type,
          total_amount,
          created_at,
          farm_id,
          b2f_farms (
            id,
            name
          )
        `)
        .eq('status', 'collection_queue')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // تجميع الطلبات حسب المزرعة
      const grouped: { [key: string]: FarmGroup } = {};

      requests?.forEach((req: any) => {
        const farmId = req.farm_id;
        const farmName = req.b2f_farms?.name || 'مزرعة غير محددة';

        if (!grouped[farmId]) {
          grouped[farmId] = {
            farm_id: farmId,
            farm_name: farmName,
            requests: []
          };
        }

        grouped[farmId].requests.push({
          id: req.id,
          investor_name: req.investor_name,
          investor_phone: req.investor_phone,
          number_of_trees: req.number_of_trees,
          tree_type: req.tree_type,
          total_amount: req.total_amount,
          created_at: req.created_at,
          farm_id: req.farm_id
        });
      });

      setFarmGroups(Object.values(grouped));
    } catch (error) {
      console.error('Error loading collection queue:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRequest = (requestId: string) => {
    setSelectedRequests(prev =>
      prev.includes(requestId)
        ? prev.filter(id => id !== requestId)
        : [...prev, requestId]
    );
  };

  const handleSelectAllForFarm = (farmId: string) => {
    const farmGroup = farmGroups.find(g => g.farm_id === farmId);
    if (!farmGroup) return;

    const farmRequestIds = farmGroup.requests.map(r => r.id);
    const allSelected = farmRequestIds.every(id => selectedRequests.includes(id));

    if (allSelected) {
      setSelectedRequests(prev => prev.filter(id => !farmRequestIds.includes(id)));
    } else {
      setSelectedRequests(prev => [...new Set([...prev, ...farmRequestIds])]);
    }
  };

  const handleOpenPaymentForSelected = () => {
    if (selectedRequests.length === 0) return;

    const totalAmount = farmGroups
      .flatMap(g => g.requests)
      .filter(r => selectedRequests.includes(r.id))
      .reduce((sum, r) => sum + r.total_amount, 0);

    setConfirmModal({
      isOpen: true,
      type: 'payment',
      title: 'فتح الدفع للطلبات المحددة',
      message: 'سيتم إرسال إشعار للمستثمرين لتحويل المبالغ المستحقة. هل أنت متأكد؟',
      confirmText: 'فتح الدفع',
      details: [
        { label: 'عدد الطلبات', value: selectedRequests.length },
        { label: 'إجمالي المبلغ', value: `${totalAmount.toLocaleString()} ريال` }
      ],
      onConfirm: async () => {
        setActionLoading(true);
        try {
          const { error } = await supabase.rpc('open_payment_for_requests', {
            request_ids: selectedRequests
          });

          if (error) throw error;

          setConfirmModal(null);
          setSelectedRequests([]);
          loadCollectionQueue();
        } catch (error) {
          console.error('Error opening payment:', error);
          alert('حدث خطأ أثناء فتح الدفع');
        } finally {
          setActionLoading(false);
        }
      }
    });
  };

  const handleOpenPaymentForFarm = (farmId: string) => {
    const farmGroup = farmGroups.find(g => g.farm_id === farmId);
    if (!farmGroup) return;

    const totalAmount = farmGroup.requests.reduce((sum, r) => sum + r.total_amount, 0);

    setConfirmModal({
      isOpen: true,
      type: 'payment',
      title: `فتح الدفع - ${farmGroup.farm_name}`,
      message: 'سيتم فتح الدفع لجميع الطلبات في هذه المزرعة وإشعار المستثمرين',
      confirmText: 'فتح الدفع للجميع',
      details: [
        { label: 'اسم المزرعة', value: farmGroup.farm_name },
        { label: 'عدد الطلبات', value: farmGroup.requests.length },
        { label: 'إجمالي المبلغ', value: `${totalAmount.toLocaleString()} ريال` }
      ],
      onConfirm: async () => {
        setActionLoading(true);
        try {
          const { error } = await supabase.rpc('open_payment_for_farm', {
            farm_uuid: farmId
          });

          if (error) throw error;

          setConfirmModal(null);
          loadCollectionQueue();
        } catch (error) {
          console.error('Error opening payment for farm:', error);
          alert('حدث خطأ أثناء فتح الدفع');
        } finally {
          setActionLoading(false);
        }
      }
    });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCollectionQueue();
    setRefreshing(false);
  };

  const handleDeleteRequest = (requestId: string, investorName: string) => {
    setConfirmModal({
      isOpen: true,
      type: 'delete',
      title: 'حذف طلب الاستثمار',
      message: `هل أنت متأكد من حذف طلب المستثمر "${investorName}"؟ هذا الإجراء لا يمكن التراجع عنه.`,
      confirmText: 'حذف الطلب',
      details: [
        { label: 'اسم المستثمر', value: investorName }
      ],
      onConfirm: async () => {
        setActionLoading(true);
        try {
          const { error } = await supabase
            .from('b2f_sales_requests')
            .delete()
            .eq('id', requestId);

          if (error) throw error;

          setSelectedRequests(prev => prev.filter(id => id !== requestId));
          setConfirmModal(null);
          await loadCollectionQueue();
        } catch (error) {
          console.error('Error deleting request:', error);
          alert('حدث خطأ أثناء حذف الطلب');
        } finally {
          setActionLoading(false);
        }
      }
    });
  };

  const handleDeleteSelectedRequests = () => {
    if (selectedRequests.length === 0) return;

    setConfirmModal({
      isOpen: true,
      type: 'delete',
      title: 'حذف الطلبات المحددة',
      message: `هل أنت متأكد من حذف ${selectedRequests.length} طلب؟ هذا الإجراء لا يمكن التراجع عنه.`,
      confirmText: 'حذف الكل',
      details: [
        { label: 'عدد الطلبات', value: selectedRequests.length }
      ],
      onConfirm: async () => {
        setActionLoading(true);
        try {
          const { error } = await supabase
            .from('b2f_sales_requests')
            .delete()
            .in('id', selectedRequests);

          if (error) throw error;

          setSelectedRequests([]);
          setConfirmModal(null);
          await loadCollectionQueue();
        } catch (error) {
          console.error('Error deleting requests:', error);
          alert('حدث خطأ أثناء حذف الطلبات');
        } finally {
          setActionLoading(false);
        }
      }
    });
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-gray-600">جاري التحميل...</p>
      </div>
    );
  }

  if (farmGroups.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 text-lg font-semibold">لا توجد طلبات في قائمة التجميع</p>
        <p className="text-gray-400 text-sm mt-2">ستظهر هنا الطلبات الجديدة من المستثمرين</p>
      </div>
    );
  }

  const requestReceivedMsg = getMessage('sales', 'request_received');

  return (
    <div className="space-y-6">
      {/* رسالة استلام الطلب */}
      {requestReceivedMsg && (
        <SystemMessageBanner
          message={requestReceivedMsg.message_text}
          icon={requestReceivedMsg.icon}
          type="success"
        />
      )}

      {/* زر التحديث */}
      <div className="flex justify-end">
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

      {/* زر فتح الدفع للطلبات المحددة */}
      {selectedRequests.length > 0 && (
        <div className="sticky top-0 z-10 bg-blue-500 rounded-xl p-4 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckSquare className="w-5 h-5" />
              <span className="font-bold">تم تحديد {selectedRequests.length} طلب</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleDeleteSelectedRequests}
                className="px-6 py-2 bg-red-500 text-white rounded-lg font-bold hover:bg-red-600 transition-all flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                حذف المحددة
              </button>
              <button
                onClick={handleOpenPaymentForSelected}
                className="px-6 py-2 bg-white text-blue-600 rounded-lg font-bold hover:bg-blue-50 transition-all"
              >
                فتح الدفع للمحددة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* مجموعات المزارع */}
      {farmGroups.map((farmGroup) => (
        <div key={farmGroup.farm_id} className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden">
          {/* رأس المزرعة */}
          <div className="bg-gradient-to-r from-blue-500 to-cyan-600 p-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="w-6 h-6" />
                <div>
                  <h3 className="text-lg font-bold">{farmGroup.farm_name}</h3>
                  <p className="text-sm text-white/80">{farmGroup.requests.length} طلب في الانتظار</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleSelectAllForFarm(farmGroup.farm_id)}
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-bold transition-all"
                >
                  {farmGroup.requests.every(r => selectedRequests.includes(r.id)) ? 'إلغاء الكل' : 'تحديد الكل'}
                </button>
                <button
                  onClick={() => handleOpenPaymentForFarm(farmGroup.farm_id)}
                  className="px-4 py-2 bg-white text-blue-600 rounded-lg text-sm font-bold hover:bg-blue-50 transition-all flex items-center gap-2"
                >
                  <Zap className="w-4 h-4" />
                  فتح الدفع للجميع
                </button>
              </div>
            </div>
          </div>

          {/* قائمة الطلبات */}
          <div className="divide-y divide-gray-200">
            {farmGroup.requests.map((request) => (
              <div
                key={request.id}
                className={`p-4 hover:bg-gray-50 transition-all ${
                  selectedRequests.includes(request.id) ? 'bg-blue-50 border-r-4 border-blue-500' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => handleSelectRequest(request.id)}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <input
                        type="checkbox"
                        checked={selectedRequests.includes(request.id)}
                        onChange={() => handleSelectRequest(request.id)}
                        className="w-5 h-5 text-blue-600 rounded"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div>
                        <h4 className="font-bold text-gray-800">{request.investor_name}</h4>
                        <p className="text-sm text-gray-500">{request.investor_phone}</p>
                      </div>
                    </div>
                    <div className="mr-8 grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">عدد الأشجار:</span>
                        <span className="font-bold text-gray-800 mr-2">{request.number_of_trees}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">النوع:</span>
                        <span className="font-bold text-gray-800 mr-2">{request.tree_type}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">المبلغ:</span>
                        <span className="font-bold text-emerald-600 mr-2">{request.total_amount.toLocaleString()} ريال</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div className="text-xs text-gray-400">
                      {new Date(request.created_at).toLocaleDateString('ar-SA')}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteRequest(request.id, request.investor_name);
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm font-bold hover:bg-red-100 transition-all"
                      title="حذف الطلب"
                    >
                      <Trash2 className="w-4 h-4" />
                      حذف
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Confirm Modal */}
      {confirmModal && (
        <ConfirmModal
          isOpen={confirmModal.isOpen}
          onClose={() => setConfirmModal(null)}
          onConfirm={confirmModal.onConfirm}
          title={confirmModal.title}
          message={confirmModal.message}
          confirmText={confirmModal.confirmText}
          type={confirmModal.type}
          loading={actionLoading}
          details={confirmModal.details}
        />
      )}
    </div>
  );
}