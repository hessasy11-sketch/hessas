import { useState, useEffect } from 'react';
import {
  FileCheck,
  Users,
  TreePine,
  DollarSign,
  Calendar,
  Eye,
  TrendingUp,
  Activity,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ContractStats {
  total_contracts: number;
  active_contracts: number;
  total_trees: number;
  total_investment: number;
  unique_investors: number;
}

interface LastContract {
  contract_id: string;
  contract_number: string;
  contract_type: string;
  status: string;
  investor_phone: string;
  investor_name: string | null;
  trees_count: number;
  amount_total: number;
  start_date: string;
  end_date: string;
  duration_years: number;
  created_at: string;
  operation_status: string;
  days_since_created: number;
}

interface FarmContractsData {
  stats: ContractStats;
  last_contract: LastContract | null;
}

interface FarmContractsCardProps {
  farmId: string;
  farmName: string;
  onViewContract?: (contractId: string) => void;
}

export default function FarmContractsCard({ farmId, farmName, onViewContract }: FarmContractsCardProps) {
  const [data, setData] = useState<FarmContractsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadContractsData();
  }, [farmId]);

  const loadContractsData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: result, error: err } = await supabase.rpc(
        'get_farm_contracts_quick_stats',
        { p_farm_id: farmId }
      );

      if (err) throw err;

      setData(result || { stats: { total_contracts: 0, active_contracts: 0, total_trees: 0, total_investment: 0, unique_investors: 0 }, last_contract: null });
    } catch (err: any) {
      console.error('Error loading contracts data:', err);
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

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-700',
      draft: 'bg-blue-100 text-blue-700',
      cancelled: 'bg-red-100 text-red-700',
      expired: 'bg-gray-100 text-gray-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      active: 'نشط',
      draft: 'مسودة',
      cancelled: 'ملغي',
      expired: 'منتهي'
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center text-red-600">
          <p>خطأ في تحميل بيانات العقود</p>
          <button
            onClick={loadContractsData}
            className="mt-2 text-sm text-blue-600 hover:text-blue-700"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  const stats = data?.stats;
  const lastContract = data?.last_contract;
  const hasContracts = stats && stats.total_contracts > 0;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <FileCheck className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                العقود والاستثمارات المرتبطة
              </h3>
              <p className="text-sm text-gray-600 mt-0.5">{farmName}</p>
            </div>
          </div>
          {hasContracts && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 rounded-full">
              <Activity className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">
                {stats.active_contracts} عقد نشط
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {!hasContracts ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileCheck className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-600 mb-2">لا توجد عقود مرتبطة بهذه المزرعة</p>
            <p className="text-sm text-gray-500">
              سيتم عرض العقود هنا عند إنشائها
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Statistics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileCheck className="w-4 h-4 text-blue-600" />
                  <span className="text-xs text-blue-600 font-medium">إجمالي العقود</span>
                </div>
                <p className="text-2xl font-bold text-blue-900">{stats.total_contracts}</p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TreePine className="w-4 h-4 text-green-600" />
                  <span className="text-xs text-green-600 font-medium">عدد الأشجار</span>
                </div>
                <p className="text-2xl font-bold text-green-900">{stats.total_trees}</p>
              </div>

              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs text-emerald-600 font-medium">الاستثمارات</span>
                </div>
                <p className="text-xl font-bold text-emerald-900">
                  {formatCurrency(stats.total_investment)}
                </p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-purple-600" />
                  <span className="text-xs text-purple-600 font-medium">المستثمرين</span>
                </div>
                <p className="text-2xl font-bold text-purple-900">{stats.unique_investors}</p>
              </div>
            </div>

            {/* Last Contract */}
            {lastContract && (
              <div className="border border-gray-200 rounded-lg p-5 bg-gradient-to-br from-gray-50 to-white">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-600" />
                    <h4 className="text-sm font-semibold text-gray-900">آخر عقد تم توثيقه</h4>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(lastContract.status)}`}>
                    {getStatusLabel(lastContract.status)}
                  </span>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">رقم العقد</p>
                    <p className="text-sm font-mono font-semibold text-gray-900">
                      {lastContract.contract_number}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">رقم الهاتف</p>
                    <p className="text-sm font-medium text-gray-900" dir="ltr">
                      {lastContract.investor_phone}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">عدد الأشجار</p>
                    <p className="text-sm font-semibold text-green-600">
                      {lastContract.trees_count} شجرة
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">قيمة العقد</p>
                    <p className="text-sm font-semibold text-emerald-600">
                      {formatCurrency(lastContract.amount_total)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">تاريخ البداية</p>
                    <p className="text-sm font-medium text-gray-900">
                      {formatDate(lastContract.start_date)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">مدة العقد</p>
                    <p className="text-sm font-medium text-gray-900">
                      {lastContract.duration_years} سنة
                    </p>
                  </div>
                </div>

                {lastContract.days_since_created === 0 && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                    <span className="text-xs text-blue-700 font-medium">
                      عقد جديد - تم إنشاؤه اليوم
                    </span>
                  </div>
                )}

                {onViewContract && (
                  <button
                    onClick={() => onViewContract(lastContract.contract_id)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    <Eye className="w-4 h-4" />
                    <span className="font-medium">عرض تفاصيل العقد</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
