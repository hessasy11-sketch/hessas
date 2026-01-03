import { Package, Gift, Heart, ArrowRightLeft, MapPin, Clock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useActionRequests } from '../../hooks/useActionRequests';
import { useInvestorAuth } from '../../contexts/InvestorAuthContext';

const actionConfig = {
  harvest: {
    label: 'استلام المحصول',
    icon: Package,
    color: 'emerald'
  },
  gift: {
    label: 'إهداء',
    icon: Gift,
    color: 'pink'
  },
  charity: {
    label: 'صدقة / وقف',
    icon: Heart,
    color: 'teal'
  },
  transfer: {
    label: 'نقل عقد',
    icon: ArrowRightLeft,
    color: 'blue'
  },
  visit: {
    label: 'زيارة / استفسار',
    icon: MapPin,
    color: 'amber'
  }
};

const statusConfig = {
  pending: {
    label: 'قيد الانتظار',
    icon: Clock,
    color: 'amber'
  },
  in_progress: {
    label: 'قيد المعالجة',
    icon: Loader2,
    color: 'blue'
  },
  completed: {
    label: 'مكتمل',
    icon: CheckCircle,
    color: 'emerald'
  },
  cancelled: {
    label: 'ملغي',
    icon: AlertCircle,
    color: 'red'
  }
};

export function MyActionRequestsView() {
  const { account } = useInvestorAuth();
  const { requests, stats, loading } = useActionRequests(account?.id || null);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* الإحصائيات */}
      {stats && stats.total > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200 rounded-xl p-4">
            <p className="text-sm text-emerald-700 mb-1">المجموع</p>
            <p className="text-3xl font-black text-emerald-900">{stats.total}</p>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl p-4">
            <p className="text-sm text-amber-700 mb-1">قيد الانتظار</p>
            <p className="text-3xl font-black text-amber-900">{stats.pending}</p>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-700 mb-1">قيد المعالجة</p>
            <p className="text-3xl font-black text-blue-900">{stats.in_progress}</p>
          </div>
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-xl p-4">
            <p className="text-sm text-emerald-700 mb-1">مكتملة</p>
            <p className="text-3xl font-black text-emerald-900">{stats.completed}</p>
          </div>
        </div>
      )}

      {/* قائمة الطلبات */}
      <div>
        <h3 className="text-lg font-black text-gray-900 mb-4">جميع الطلبات</h3>

        {requests.length === 0 ? (
          <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-12 text-center">
            <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 font-bold mb-2">لا توجد طلبات</p>
            <p className="text-sm text-gray-500">اضغط على "أريد إجراء الآن" لإنشاء طلب جديد</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((request) => {
              const action = actionConfig[request.action_type as keyof typeof actionConfig];
              const status = statusConfig[request.status as keyof typeof statusConfig];
              const ActionIcon = action.icon;
              const StatusIcon = status.icon;

              return (
                <div
                  key={request.id}
                  className="bg-white border-2 border-gray-200 rounded-xl p-4 hover:shadow-lg transition-all"
                >
                  <div className="flex items-start gap-4">
                    {/* أيقونة الإجراء */}
                    <div className={`w-14 h-14 bg-gradient-to-br from-${action.color}-500 to-${action.color}-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md`}>
                      <ActionIcon className="w-7 h-7 text-white" />
                    </div>

                    {/* التفاصيل */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="font-black text-gray-900">{action.label}</h4>
                        <div className={`flex items-center gap-1 px-3 py-1 bg-${status.color}-100 rounded-full flex-shrink-0`}>
                          <StatusIcon className={`w-4 h-4 text-${status.color}-700 ${status.icon === Loader2 ? 'animate-spin' : ''}`} />
                          <span className={`text-xs font-bold text-${status.color}-800`}>{status.label}</span>
                        </div>
                      </div>

                      <p className="text-sm text-gray-600 mb-2">
                        {new Date(request.created_at).toLocaleDateString('ar-SA', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>

                      {request.notes && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-2">
                          <p className="text-sm text-gray-700">{request.notes}</p>
                        </div>
                      )}

                      {request.admin_notes && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <p className="text-xs font-bold text-blue-900 mb-1">رد الإدارة:</p>
                          <p className="text-sm text-blue-800">{request.admin_notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
