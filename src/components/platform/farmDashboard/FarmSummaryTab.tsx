import { Calendar, User, CheckCircle, AlertTriangle, DollarSign, Users } from 'lucide-react';
import { useState } from 'react';
import CreateVisitRequestModal from './CreateVisitRequestModal';

interface FarmSummaryTabProps {
  data: {
    farm: {
      id: string;
      name: string;
      code: string;
      location: string;
      operational_status: string;
      investment_type: string;
      has_factory: boolean;
      created_at: string;
    };
    manager?: {
      id: string;
      name: string;
      phone: string;
      assigned_date?: string;
    };
    tasks: {
      total: number;
      open: number;
      urgent: number;
      completed_this_month: number;
    };
    financial: {
      expenses_this_month: number;
      expenses_pending_approval: number;
      total_expenses: number;
    };
    team_count: number;
  };
  onRefresh: () => void;
}

const FarmSummaryTab = ({ data, onRefresh }: FarmSummaryTabProps) => {
  const [showVisitModal, setShowVisitModal] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR'
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Farm Manager Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <User className="w-5 h-5 text-green-600" />
            مدير المزرعة
          </h2>
        </div>

        {data.manager ? (
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
              {data.manager.name.charAt(0)}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">{data.manager.name}</h3>
              <p className="text-sm text-gray-600">{data.manager.phone}</p>
              {data.manager.assigned_date && (
                <p className="text-xs text-gray-500 mt-1">
                  معين منذ: {formatDate(data.manager.assigned_date)}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800 text-sm">
              لم يتم تعيين مدير لهذه المزرعة بعد
            </p>
          </div>
        )}
      </div>

      {/* Quick Indicators Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Tasks */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-8 h-8 text-blue-600" />
            <span className="text-3xl font-bold text-gray-900">{data.tasks.open}</span>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">مهام مفتوحة</h3>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>إجمالي: {data.tasks.total}</span>
            <span>•</span>
            <span>مكتملة: {data.tasks.completed_this_month}</span>
          </div>
        </div>

        {/* Urgent Tasks */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="w-8 h-8 text-red-600" />
            <span className="text-3xl font-bold text-red-600">{data.tasks.urgent}</span>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">مهام عاجلة</h3>
          <p className="text-xs text-gray-500">تتطلب انتباه فوري</p>
        </div>

        {/* Monthly Expenses */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-8 h-8 text-orange-600" />
            <span className="text-xl font-bold text-gray-900">
              {formatCurrency(data.financial.expenses_this_month)}
            </span>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">مصروف هذا الشهر</h3>
          <p className="text-xs text-gray-500">
            قيد الاعتماد: {data.financial.expenses_pending_approval}
          </p>
        </div>

        {/* Team Count */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-8 h-8 text-green-600" />
            <span className="text-3xl font-bold text-gray-900">{data.team_count}</span>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">أعضاء الفريق</h3>
          <p className="text-xs text-gray-500">نشطين حالياً</p>
        </div>
      </div>

      {/* Farm Details */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">تفاصيل المزرعة</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-500">نوع الاستثمار</label>
            <p className="text-sm font-semibold text-gray-900 mt-1">
              {data.farm.investment_type || 'غير محدد'}
            </p>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">الموقع</label>
            <p className="text-sm font-semibold text-gray-900 mt-1">{data.farm.location}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">حالة التشغيل</label>
            <p className="text-sm font-semibold text-gray-900 mt-1">
              <span className={`
                px-2 py-1 rounded text-xs
                ${data.farm.operational_status === 'active'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-700'
                }
              `}>
                {data.farm.operational_status}
              </span>
            </p>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">يوجد مصنع</label>
            <p className="text-sm font-semibold text-gray-900 mt-1">
              {data.farm.has_factory ? 'نعم' : 'لا'}
            </p>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">تاريخ التأسيس</label>
            <p className="text-sm font-semibold text-gray-900 mt-1">
              {formatDate(data.farm.created_at)}
            </p>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">إجمالي المصروفات</label>
            <p className="text-sm font-semibold text-gray-900 mt-1">
              {formatCurrency(data.financial.total_expenses)}
            </p>
          </div>
        </div>
      </div>

      {/* Request Visit Button */}
      <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-lg border border-green-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900 mb-1">طلب زيارة المزرعة</h3>
            <p className="text-sm text-gray-600">
              احجز موعد لزيارة المزرعة والاطلاع على التشغيل الميداني
            </p>
          </div>
          <button
            onClick={() => setShowVisitModal(true)}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 font-semibold"
          >
            <Calendar className="w-5 h-5" />
            طلب زيارة
          </button>
        </div>
      </div>

      {showVisitModal && (
        <CreateVisitRequestModal
          farmId={data.farm.id}
          farmName={data.farm.name}
          onClose={() => setShowVisitModal(false)}
          onSuccess={() => {
            setShowVisitModal(false);
            onRefresh();
          }}
        />
      )}
    </div>
  );
};

export default FarmSummaryTab;
