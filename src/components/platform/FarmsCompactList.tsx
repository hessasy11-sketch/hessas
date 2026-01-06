import { useNavigate } from 'react-router-dom';
import { ExternalLink, User, Clock, AlertCircle, Lock, Unlock } from 'lucide-react';

interface FarmListItem {
  farm_id: string;
  farm_name: string;
  farm_location: string;
  operational_status: string;
  manager_name: string | null;
  last_activity: string | null;
  pending_tasks_count: number;
  overdue_tasks_count: number;
  bookings_enabled: boolean;
}

interface FarmsCompactListProps {
  farms: FarmListItem[];
}

export default function FarmsCompactList({ farms }: FarmsCompactListProps) {
  const navigate = useNavigate();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded">
            نشطة
          </span>
        );
      case 'setup':
        return (
          <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded">
            إعداد
          </span>
        );
      case 'suspended':
        return (
          <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded">
            معلقة
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded">
            {status}
          </span>
        );
    }
  };

  const getTimeAgo = (dateString: string | null) => {
    if (!dateString) return 'لا يوجد نشاط';

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    return `منذ ${diffDays} يوم`;
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200">
        <h2 className="text-lg font-bold text-slate-900">قائمة المزارع المختصرة</h2>
        <p className="text-sm text-slate-600">Top 10 Farms - Read Only</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-right text-xs font-bold text-slate-700">المزرعة</th>
              <th className="px-4 py-3 text-right text-xs font-bold text-slate-700">المدير</th>
              <th className="px-4 py-3 text-center text-xs font-bold text-slate-700">الحالة</th>
              <th className="px-4 py-3 text-center text-xs font-bold text-slate-700">المهام</th>
              <th className="px-4 py-3 text-center text-xs font-bold text-slate-700">الحجوزات</th>
              <th className="px-4 py-3 text-right text-xs font-bold text-slate-700">آخر نشاط</th>
              <th className="px-4 py-3 text-center text-xs font-bold text-slate-700">الإجراء</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {farms.length > 0 ? (
              farms.map((farm) => (
                <tr
                  key={farm.farm_id}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-bold text-sm text-slate-900">{farm.farm_name}</div>
                      <div className="text-xs text-slate-500">{farm.farm_location}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {farm.manager_name ? (
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-emerald-500" />
                        <span className="text-sm text-slate-700">{farm.manager_name}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">غير معيّن</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {getStatusBadge(farm.operational_status)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {farm.overdue_tasks_count > 0 ? (
                        <>
                          <AlertCircle className="w-4 h-4 text-red-500" />
                          <span className="text-sm font-bold text-red-600">
                            {farm.overdue_tasks_count} متأخر
                          </span>
                        </>
                      ) : farm.pending_tasks_count > 0 ? (
                        <>
                          <Clock className="w-4 h-4 text-amber-500" />
                          <span className="text-sm font-bold text-amber-600">
                            {farm.pending_tasks_count} معلق
                          </span>
                        </>
                      ) : (
                        <span className="text-xs text-slate-400">لا مهام</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {farm.bookings_enabled ? (
                      <div className="flex items-center justify-center gap-1">
                        <Unlock className="w-4 h-4 text-emerald-500" />
                        <span className="text-xs text-emerald-600 font-medium">مفتوحة</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-1">
                        <Lock className="w-4 h-4 text-red-500" />
                        <span className="text-xs text-red-600 font-medium">مغلقة</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-slate-600">
                      {getTimeAgo(farm.last_activity)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => navigate(`/admin/b2f/farms/${farm.farm_id}`)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg transition-colors"
                    >
                      <span>فتح</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                  لا توجد مزارع لعرضها
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
