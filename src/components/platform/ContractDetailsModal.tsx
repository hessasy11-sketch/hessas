import { useState, useEffect } from 'react';
import {
  X,
  FileCheck,
  User,
  Phone,
  TreePine,
  DollarSign,
  Calendar,
  Clock,
  MapPin,
  FileText,
  AlertCircle,
  CheckCircle,
  Loader2,
  Download
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ContractDetails {
  contract_id: string;
  contract_number: string;
  contract_type: string;
  status: string;
  investor_phone: string;
  investor_name: string | null;
  trees_count: number;
  amount_total: number;
  paid_amount: number;
  remaining_amount: number;
  start_date: string;
  end_date: string;
  duration_years: number;
  operation_status: string;
  is_transferred: boolean;
  created_at: string;
  days_active: number;
  is_expired: boolean;
}

interface ContractDetailsModalProps {
  contractId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ContractDetailsModal({ contractId, isOpen, onClose }: ContractDetailsModalProps) {
  const [contract, setContract] = useState<ContractDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && contractId) {
      loadContractDetails();
    }
  }, [isOpen, contractId]);

  const loadContractDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: err } = await supabase
        .from('b2f_contracts')
        .select('*')
        .eq('id', contractId)
        .maybeSingle();

      if (err) throw err;
      if (!data) throw new Error('العقد غير موجود');

      // Transform data to match interface
      const contractData: ContractDetails = {
        contract_id: data.id,
        contract_number: data.contract_number,
        contract_type: data.contract_type,
        status: data.status,
        investor_phone: data.investor_phone || data.current_beneficiary_phone,
        investor_name: data.current_beneficiary_name || data.original_beneficiary_name,
        trees_count: data.trees_count || data.tree_count || 0,
        amount_total: data.amount_total || data.total_amount || 0,
        paid_amount: data.paid_amount || 0,
        remaining_amount: data.remaining_amount || 0,
        start_date: data.start_date,
        end_date: data.end_date,
        duration_years: data.duration_years,
        operation_status: data.operation_status,
        is_transferred: data.is_transferred || false,
        created_at: data.created_at,
        days_active: data.start_date ? Math.floor((new Date().getTime() - new Date(data.start_date).getTime()) / (1000 * 60 * 60 * 24)) : 0,
        is_expired: data.end_date ? new Date(data.end_date) < new Date() : false
      };

      setContract(contractData);
    } catch (err: any) {
      console.error('Error loading contract details:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, any> = {
      active: {
        label: 'نشط',
        icon: CheckCircle,
        color: 'bg-green-100 text-green-700 border-green-200',
        dotColor: 'bg-green-500'
      },
      draft: {
        label: 'مسودة',
        icon: FileText,
        color: 'bg-blue-100 text-blue-700 border-blue-200',
        dotColor: 'bg-blue-500'
      },
      cancelled: {
        label: 'ملغي',
        icon: X,
        color: 'bg-red-100 text-red-700 border-red-200',
        dotColor: 'bg-red-500'
      },
      expired: {
        label: 'منتهي',
        icon: Clock,
        color: 'bg-gray-100 text-gray-700 border-gray-200',
        dotColor: 'bg-gray-500'
      }
    };
    return configs[status] || configs.draft;
  };

  const getOperationStatusConfig = (status: string) => {
    const configs: Record<string, any> = {
      pending: { label: 'في الانتظار', color: 'text-yellow-600' },
      setup: { label: 'جاري الإعداد', color: 'text-blue-600' },
      active: { label: 'نشط', color: 'text-green-600' },
      paused: { label: 'متوقف مؤقتاً', color: 'text-orange-600' },
      completed: { label: 'مكتمل', color: 'text-gray-600' }
    };
    return configs[status] || configs.pending;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
              <FileCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">تفاصيل العقد</h2>
              <p className="text-sm text-white/90 mt-0.5">قراءة فقط</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={loadContractDetails}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                إعادة المحاولة
              </button>
            </div>
          ) : contract ? (
            <div className="p-6 space-y-6">
              {/* Contract Number & Status */}
              <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                <div>
                  <p className="text-xs text-gray-500 mb-1">رقم العقد</p>
                  <p className="text-2xl font-bold font-mono text-gray-900">
                    {contract.contract_number}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${getStatusConfig(contract.status).color}`}>
                    {(() => {
                      const StatusIcon = getStatusConfig(contract.status).icon;
                      return <StatusIcon className="w-4 h-4" />;
                    })()}
                    <span className="font-semibold">{getStatusConfig(contract.status).label}</span>
                  </div>
                  {contract.is_expired && (
                    <span className="text-xs text-red-600 font-medium">العقد منتهي</span>
                  )}
                </div>
              </div>

              {/* Investor Information */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 border border-blue-200">
                <h3 className="text-sm font-semibold text-blue-900 mb-4 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  معلومات المستثمر
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-blue-600 mb-1">رقم الهاتف</p>
                    <p className="text-lg font-semibold text-blue-900" dir="ltr">
                      {contract.investor_phone}
                    </p>
                  </div>
                  {contract.investor_name && (
                    <div>
                      <p className="text-xs text-blue-600 mb-1">الاسم</p>
                      <p className="text-lg font-semibold text-blue-900">
                        {contract.investor_name}
                      </p>
                    </div>
                  )}
                  {contract.is_transferred && (
                    <div className="md:col-span-2">
                      <div className="flex items-center gap-2 px-3 py-2 bg-yellow-100 border border-yellow-200 rounded-lg">
                        <AlertCircle className="w-4 h-4 text-yellow-600" />
                        <span className="text-xs text-yellow-700 font-medium">
                          تم نقل ملكية هذا العقد
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Investment Details */}
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-5 border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <TreePine className="w-5 h-5 text-green-600" />
                    <p className="text-xs text-green-600 font-medium">عدد الأشجار</p>
                  </div>
                  <p className="text-3xl font-bold text-green-900">{contract.trees_count}</p>
                  <p className="text-xs text-green-600 mt-1">شجرة</p>
                </div>

                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-5 border border-emerald-200">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-5 h-5 text-emerald-600" />
                    <p className="text-xs text-emerald-600 font-medium">قيمة العقد</p>
                  </div>
                  <p className="text-2xl font-bold text-emerald-900">
                    {formatCurrency(contract.amount_total)}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-5 border border-purple-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-5 h-5 text-purple-600" />
                    <p className="text-xs text-purple-600 font-medium">المدة</p>
                  </div>
                  <p className="text-3xl font-bold text-purple-900">{contract.duration_years}</p>
                  <p className="text-xs text-purple-600 mt-1">سنة</p>
                </div>
              </div>

              {/* Payment Status */}
              {(contract.paid_amount > 0 || contract.remaining_amount > 0) && (
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-5 border border-orange-200">
                  <h3 className="text-sm font-semibold text-orange-900 mb-4 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    حالة الدفع
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-orange-600 mb-1">المبلغ المدفوع</p>
                      <p className="text-xl font-bold text-orange-900">
                        {formatCurrency(contract.paid_amount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-orange-600 mb-1">المبلغ المتبقي</p>
                      <p className="text-xl font-bold text-orange-900">
                        {formatCurrency(contract.remaining_amount)}
                      </p>
                    </div>
                  </div>
                  {contract.remaining_amount > 0 && (
                    <div className="mt-3 bg-orange-200/50 rounded-lg p-2">
                      <div className="w-full bg-orange-200 rounded-full h-2">
                        <div
                          className="bg-orange-600 h-2 rounded-full transition-all duration-500"
                          style={{
                            width: `${(contract.paid_amount / contract.amount_total) * 100}%`
                          }}
                        />
                      </div>
                      <p className="text-xs text-orange-700 text-center mt-2">
                        تم الدفع: {Math.round((contract.paid_amount / contract.amount_total) * 100)}%
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Dates */}
              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-5 border border-indigo-200">
                <h3 className="text-sm font-semibold text-indigo-900 mb-4 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  التواريخ
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-indigo-600 mb-1">تاريخ البداية</p>
                    <p className="text-lg font-semibold text-indigo-900">
                      {formatDate(contract.start_date)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-indigo-600 mb-1">تاريخ الانتهاء</p>
                    <p className="text-lg font-semibold text-indigo-900">
                      {formatDate(contract.end_date)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-indigo-600 mb-1">تاريخ الإنشاء</p>
                    <p className="text-sm font-medium text-indigo-900">
                      {formatDate(contract.created_at)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-indigo-600 mb-1">الأيام النشطة</p>
                    <p className="text-lg font-semibold text-indigo-900">
                      {contract.days_active} يوم
                    </p>
                  </div>
                </div>
              </div>

              {/* Operation Status */}
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  حالة التشغيل
                </h3>
                <div className={`inline-flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-gray-200`}>
                  <div className={`w-2 h-2 rounded-full ${getOperationStatusConfig(contract.operation_status).color.replace('text-', 'bg-')}`} />
                  <span className={`font-medium ${getOperationStatusConfig(contract.operation_status).color}`}>
                    {getOperationStatusConfig(contract.operation_status).label}
                  </span>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-lg hover:from-gray-700 hover:to-gray-800 transition-all duration-200 font-medium"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
