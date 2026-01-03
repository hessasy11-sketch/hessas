import { MapPin, Calendar, Clock } from 'lucide-react';

export interface InvestorBooking {
  id: string;
  opportunity_id: string;
  customer_name: string;
  customer_phone: string;
  number_of_trees: number;
  total_amount: string | number;
  status: 'pending_review' | 'awaiting_payment' | 'payment_submitted' | 'payment_verified' | 'contract_issued' | 'active' | 'completed' | 'cancelled' | 'rejected';
  created_at: string;
  updated_at: string;
  notes: string | null;
  opportunity: {
    id: string;
    title: string;
    price_per_tree: number;
    duration_months: number;
    farm: {
      id: string;
      name: string;
      tree_types: string[];
      city: {
        id: string;
        name: string;
      } | null;
      region: {
        id: string;
        name: string;
      } | null;
    } | null;
  } | null;
}

interface BookingCardProps {
  booking: InvestorBooking;
  onAction: (bookingId: string) => void;
}

const STATUS_CONFIG = {
  pending_review: {
    label: 'قيد المراجعة',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    buttonText: 'قيد المراجعة',
    buttonColor: 'bg-yellow-500 hover:bg-yellow-600',
  },
  awaiting_payment: {
    label: 'بانتظار الدفع',
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    buttonText: 'بانتظار الدفع',
    buttonColor: 'bg-orange-500 hover:bg-orange-600',
  },
  payment_submitted: {
    label: 'تم رفع إيصال الدفع',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    buttonText: 'عرض التفاصيل',
    buttonColor: 'bg-blue-500 hover:bg-blue-600',
  },
  payment_verified: {
    label: 'تم التحقق من الدفع',
    color: 'bg-teal-100 text-teal-800 border-teal-200',
    buttonText: 'بانتظار العقد',
    buttonColor: 'bg-teal-500 hover:bg-teal-600',
  },
  contract_issued: {
    label: 'تم إصدار العقد',
    color: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    buttonText: 'عرض العقد',
    buttonColor: 'bg-indigo-500 hover:bg-indigo-600',
  },
  active: {
    label: 'نشط',
    color: 'bg-green-100 text-green-800 border-green-200',
    buttonText: 'نشط',
    buttonColor: 'bg-green-500 hover:bg-green-600',
  },
  completed: {
    label: 'مكتمل',
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    buttonText: 'مكتمل',
    buttonColor: 'bg-gray-500 hover:bg-gray-600',
  },
  cancelled: {
    label: 'ملغي',
    color: 'bg-red-100 text-red-800 border-red-200',
    buttonText: 'ملغي',
    buttonColor: 'bg-gray-400 cursor-not-allowed',
  },
  rejected: {
    label: 'مرفوض',
    color: 'bg-red-100 text-red-800 border-red-200',
    buttonText: 'مرفوض',
    buttonColor: 'bg-gray-400 cursor-not-allowed',
  },
};

export function BookingCard({ booking, onAction }: BookingCardProps) {
  const opportunity = booking.opportunity;
  const statusConfig = STATUS_CONFIG[booking.status];

  if (!opportunity) {
    return null;
  }

  const totalAmount = Number(booking.total_amount || 0);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  const getLastUpdate = () => {
    const now = new Date();
    const updated = new Date(booking.updated_at);
    const diffMs = now.getTime() - updated.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `قبل ${diffMins} دقيقة`;
    if (diffHours < 24) return `قبل ${diffHours} ساعة`;
    return `قبل ${diffDays} يوم`;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 hover:border-emerald-400 transition-all duration-200 overflow-hidden shadow-sm hover:shadow-md">
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="text-3xl flex-shrink-0">🌳</div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-gray-900 text-sm line-clamp-1">
                {opportunity.title}
              </h3>
              {opportunity.farm?.tree_types && opportunity.farm.tree_types.length > 0 && (
                <p className="text-xs text-gray-600 mt-0.5">
                  {opportunity.farm.tree_types.join(', ')}
                </p>
              )}
              {opportunity.farm?.name && (
                <p className="text-xs text-gray-500 mt-0.5">
                  {opportunity.farm.name}
                </p>
              )}
            </div>
          </div>

          <span
            className={`px-2.5 py-1 rounded-full text-xs font-bold border whitespace-nowrap ${statusConfig.color}`}
          >
            {statusConfig.label}
          </span>
        </div>

        {opportunity.farm?.city?.name && (
          <div className="flex items-center gap-1.5 text-xs text-gray-600">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">
              {opportunity.farm.region?.name && `${opportunity.farm.region.name}, `}
              {opportunity.farm.city.name}
            </span>
          </div>
        )}

        <div className="space-y-1.5 bg-emerald-50 rounded-lg p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600">عدد الأشجار</span>
            <span className="font-bold text-emerald-700">
              {booking.number_of_trees} شجرة
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600">المبلغ الإجمالي</span>
            <span className="font-bold text-emerald-700">
              {totalAmount.toLocaleString('ar-SA')} ريال
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600">مدة الاستثمار</span>
            <span className="font-bold text-emerald-700">
              {opportunity.duration_months} شهر
            </span>
          </div>
        </div>

        <div className="pt-2 border-t border-gray-100">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Clock className="w-3.5 h-3.5" />
              <span>آخر تحديث: {getLastUpdate()}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Calendar className="w-3.5 h-3.5" />
              <span>{formatDate(booking.created_at)}</span>
            </div>
          </div>

          <button
            onClick={() => onAction(booking.id)}
            disabled={booking.status === 'cancelled' || booking.status === 'rejected'}
            className={`w-full py-2.5 rounded-lg text-white font-bold text-sm transition-all ${statusConfig.buttonColor}`}
          >
            {statusConfig.buttonText}
          </button>
        </div>

        {booking.notes && (
          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-600 line-clamp-2">
              {booking.notes}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
