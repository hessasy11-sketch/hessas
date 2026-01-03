import { Users, CheckCircle, Clock, DollarSign, Calendar, TrendingUp } from 'lucide-react';

interface InvestmentGroup {
  id: string;
  group_name: string;
  max_capacity: number;
  current_count: number;
  status: 'open' | 'full' | 'payment_open' | 'closed';
  payment_opened_at: string | null;
  created_at: string;
}

interface GroupInfoProps {
  group: InvestmentGroup;
}

export default function GroupInfo({ group }: GroupInfoProps) {
  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; color: string; icon: any; bgColor: string; borderColor: string }> = {
      'open': {
        label: 'مفتوحة للانضمام',
        color: 'text-blue-700',
        bgColor: 'bg-blue-100',
        borderColor: 'border-blue-300',
        icon: Users
      },
      'full': {
        label: 'مكتملة - ينتظر فتح الدفع',
        color: 'text-purple-700',
        bgColor: 'bg-purple-100',
        borderColor: 'border-purple-300',
        icon: CheckCircle
      },
      'payment_open': {
        label: 'الدفع مفتوح',
        color: 'text-green-700',
        bgColor: 'bg-green-100',
        borderColor: 'border-green-300',
        icon: DollarSign
      },
      'closed': {
        label: 'مغلقة',
        color: 'text-gray-700',
        bgColor: 'bg-gray-100',
        borderColor: 'border-gray-300',
        icon: Clock
      }
    };

    return configs[status] || configs['open'];
  };

  const statusConfig = getStatusConfig(group.status);
  const StatusIcon = statusConfig.icon;
  const progress = (group.current_count / group.max_capacity) * 100;
  const isFull = group.current_count >= group.max_capacity;

  return (
    <div className="bg-gradient-to-br from-purple-50 via-blue-50 to-teal-50 rounded-2xl p-6 border-2 border-purple-200 shadow-lg" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5 pb-4 border-b-2 border-purple-200">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shadow-lg">
          <Users className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-bold text-purple-900">معلومات المجموعة الاستثمارية</h3>
          <p className="text-sm text-purple-700">طلبك جزء من مجموعة استثمارية</p>
        </div>
      </div>

      {/* Group Name */}
      <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 mb-4 border border-purple-200">
        <p className="text-xs text-purple-700 mb-1 font-medium">اسم المجموعة</p>
        <p className="text-lg font-bold text-purple-900">{group.group_name}</p>
      </div>

      {/* Status Badge */}
      <div className={`${statusConfig.bgColor} ${statusConfig.borderColor} rounded-xl p-4 mb-4 border-2`}>
        <div className="flex items-center gap-2">
          <StatusIcon className={`w-5 h-5 ${statusConfig.color}`} />
          <p className={`text-sm font-bold ${statusConfig.color}`}>{statusConfig.label}</p>
        </div>
      </div>

      {/* Progress */}
      <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 mb-4 border border-purple-200">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-purple-700 font-medium">عدد المستثمرين</p>
          <p className="text-lg font-bold text-purple-900">
            {group.current_count} / {group.max_capacity}
          </p>
        </div>

        <div className="w-full bg-purple-200 rounded-full h-3 overflow-hidden mb-2">
          <div
            className={`h-full transition-all duration-500 ${
              isFull
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                : 'bg-gradient-to-r from-purple-500 to-blue-500'
            }`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <TrendingUp className={`w-4 h-4 ${isFull ? 'text-green-600' : 'text-purple-600'}`} />
          <p className={`font-medium ${isFull ? 'text-green-700' : 'text-purple-700'}`}>
            {isFull ? 'اكتملت المجموعة! سيتم فتح الدفع قريباً' : `بقي ${group.max_capacity - group.current_count} مستثمر`}
          </p>
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3 border border-blue-200">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-4 h-4 text-blue-600" />
            <p className="text-xs text-blue-700 font-medium">تاريخ الإنشاء</p>
          </div>
          <p className="text-sm font-bold text-blue-900">
            {new Date(group.created_at).toLocaleDateString('ar-SA')}
          </p>
        </div>

        {group.payment_opened_at && (
          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3 border border-green-200">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-green-600" />
              <p className="text-xs text-green-700 font-medium">فتح الدفع</p>
            </div>
            <p className="text-sm font-bold text-green-900">
              {new Date(group.payment_opened_at).toLocaleDateString('ar-SA')}
            </p>
          </div>
        )}
      </div>

      {/* Info Note */}
      <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-3">
        <p className="text-xs text-blue-800 leading-relaxed">
          <span className="font-bold">ملاحظة:</span> المجموعة الاستثمارية تعني أن طلبك سيُعالج مع مجموعة من المستثمرين الآخرين.
          عندما يكتمل العدد المطلوب، سيتم فتح الدفع لجميع أعضاء المجموعة في نفس الوقت.
        </p>
      </div>
    </div>
  );
}
