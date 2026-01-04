import { useState, useEffect } from 'react';
import { Building2, AlertCircle, Clock, FileText, TrendingUp } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { adminSessionManager } from '../../../utils/adminSessionManager';

interface Farm {
  farm_id: string;
  farm_name: string;
  location: string | null;
  tree_type: string | null;
  pending_approvals: number;
  overdue_tasks: number;
  last_logbook_entry: string | null;
}

export default function MyFarmsTab() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);
  const session = adminSessionManager.getSession();

  useEffect(() => {
    loadMyFarms();
  }, []);

  const loadMyFarms = async () => {
    if (!session?.user_id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('get_investment_manager_farms', { p_user_id: session.user_id });

      if (error) throw error;

      setFarms(data || []);
    } catch (error) {
      console.error('Error loading investment manager farms:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (overdue: number, pending: number) => {
    if (overdue > 0) return 'border-red-200 bg-red-50';
    if (pending > 0) return 'border-orange-200 bg-orange-50';
    return 'border-green-200 bg-green-50';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (farms.length === 0) {
    return (
      <div className="text-center py-20">
        <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-2">لا توجد مزارع مُسندة لك</h3>
        <p className="text-gray-600">لم يتم تعيينك كمدير استثمار على أي مزرعة بعد</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">مزارعي</h2>
          <p className="text-sm text-gray-600 mt-1">المزارع التي أنت مسؤول عنها استثمارياً</p>
        </div>
        <div className="px-4 py-2 bg-green-100 rounded-xl">
          <span className="text-2xl font-bold text-green-600">{farms.length}</span>
          <span className="text-sm text-gray-600 mr-2">مزرعة</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {farms.map((farm) => (
          <div
            key={farm.farm_id}
            className={`border-2 rounded-xl p-5 ${getStatusColor(farm.overdue_tasks, farm.pending_approvals)}`}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{farm.farm_name}</h3>
                {farm.location && (
                  <p className="text-sm text-gray-600 mt-1">{farm.location}</p>
                )}
                {farm.tree_type && (
                  <div className="mt-2 inline-block px-3 py-1 bg-white rounded-lg text-sm font-medium text-green-700">
                    {farm.tree_type}
                  </div>
                )}
              </div>
              <Building2 className="w-10 h-10 text-gray-400" />
            </div>

            <div className="grid grid-cols-3 gap-3 pt-4 border-t">
              <div className="text-center">
                <div className={`text-2xl font-bold ${farm.overdue_tasks > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                  {farm.overdue_tasks}
                </div>
                <div className="text-xs text-gray-600 mt-1 flex items-center justify-center gap-1">
                  <Clock className="w-3 h-3" />
                  متأخرة
                </div>
              </div>

              <div className="text-center">
                <div className={`text-2xl font-bold ${farm.pending_approvals > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                  {farm.pending_approvals}
                </div>
                <div className="text-xs text-gray-600 mt-1 flex items-center justify-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  بانتظار الاعتماد
                </div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-gray-700">
                  {farm.last_logbook_entry
                    ? new Date(farm.last_logbook_entry).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' })
                    : '-'}
                </div>
                <div className="text-xs text-gray-600 mt-1 flex items-center justify-center gap-1">
                  <FileText className="w-3 h-3" />
                  آخر تحديث
                </div>
              </div>
            </div>

            {(farm.overdue_tasks > 0 || farm.pending_approvals > 0) && (
              <button className="w-full mt-4 py-2 px-4 bg-white border-2 border-green-200 text-green-700 rounded-lg font-medium hover:bg-green-50 transition-colors flex items-center justify-center gap-2">
                <TrendingUp className="w-4 h-4" />
                عرض التفاصيل
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
