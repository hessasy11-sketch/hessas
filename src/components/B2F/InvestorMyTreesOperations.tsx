import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useInvestorIdentity } from '../../hooks/useInvestorIdentity';
import {
  Loader2,
  Sprout,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  Eye,
  TrendingUp,
  Droplet,
  Wrench,
  Shield,
  Package,
  Info
} from 'lucide-react';

interface FarmOperation {
  id: string;
  contract_number: string;
  farm_name: string;
  update_type: string;
  title: string;
  description: string;
  related_phase?: string;
  operation_date: string;
  is_read: boolean;
  read_at?: string;
  trees_count: number;
}

export default function InvestorMyTreesOperations() {
  const { phone } = useInvestorIdentity();
  const [operations, setOperations] = useState<FarmOperation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (phone) {
      loadOperations();
    }
  }, [phone]);

  const loadOperations = async () => {
    if (!phone) return;

    try {
      setLoading(true);

      const { data, error } = await supabase.rpc('get_investor_farm_operations', {
        p_phone: phone
      });

      if (error) throw error;

      setOperations(data || []);
    } catch (error) {
      console.error('Error loading operations:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (operationId: string) => {
    try {
      const { data, error } = await supabase.rpc('mark_operation_as_read', {
        p_operation_id: operationId
      });

      if (error) throw error;

      if (data?.success) {
        setOperations(prev =>
          prev.map(op =>
            op.id === operationId
              ? { ...op, is_read: true, read_at: new Date().toISOString() }
              : op
          )
        );
      }
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const getUpdateTypeIcon = (type: string) => {
    const icons: Record<string, any> = {
      phase_change: TrendingUp,
      progress_update: Clock,
      maintenance: Wrench,
      irrigation: Droplet,
      fertilization: Sprout,
      pest_control: Shield,
      harvest: Package,
      general: Info
    };
    return icons[type] || Clock;
  };

  const getUpdateTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      phase_change: 'emerald',
      progress_update: 'blue',
      maintenance: 'amber',
      irrigation: 'cyan',
      fertilization: 'green',
      pest_control: 'red',
      harvest: 'orange',
      general: 'gray'
    };
    return colors[type] || 'gray';
  };

  const filteredOperations = operations.filter(op => {
    if (filter === 'unread') return !op.is_read;
    return true;
  });

  const unreadCount = operations.filter(op => !op.is_read).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* الرأس */}
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <Sprout className="w-8 h-8" />
          <div>
            <h2 className="text-2xl font-bold">تشغيل أشجاري</h2>
            <p className="text-emerald-100 text-sm">
              تحديثات تشغيل المزارع المرتبطة بعقودك
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="text-3xl font-bold mb-1">{operations.length}</div>
            <div className="text-sm text-emerald-100">إجمالي التحديثات</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="text-3xl font-bold mb-1">{unreadCount}</div>
            <div className="text-sm text-emerald-100">غير مقروء</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="text-3xl font-bold mb-1">
              {new Set(operations.map(op => op.farm_name)).size}
            </div>
            <div className="text-sm text-emerald-100">مزرعة</div>
          </div>
        </div>
      </div>

      {/* الفلاتر */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === 'all'
                ? 'bg-emerald-500 text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            جميع التحديثات ({operations.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === 'unread'
                ? 'bg-emerald-500 text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            غير مقروء ({unreadCount})
          </button>
        </div>
      </div>

      {/* قائمة التحديثات */}
      {filteredOperations.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Sprout className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">لا توجد تحديثات</h3>
          <p className="text-gray-600">
            {filter === 'unread'
              ? 'جميع التحديثات تم قراءتها'
              : 'لا توجد تحديثات تشغيلية بعد'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOperations.map((operation) => {
            const Icon = getUpdateTypeIcon(operation.update_type);
            const color = getUpdateTypeColor(operation.update_type);
            const isExpanded = expandedId === operation.id;

            return (
              <div
                key={operation.id}
                className={`bg-white rounded-xl shadow-sm border-2 transition-all overflow-hidden ${
                  !operation.is_read
                    ? 'border-emerald-300 bg-emerald-50/30'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="p-5">
                  {/* الرأس */}
                  <div className="flex items-start gap-4 mb-3">
                    <div className={`p-3 rounded-lg bg-${color}-100 flex-shrink-0`}>
                      <Icon className={`w-6 h-6 text-${color}-600`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 text-lg mb-1">
                            {operation.title}
                          </h3>
                          <div className="flex items-center gap-3 text-sm text-gray-600 flex-wrap">
                            <span className="flex items-center gap-1">
                              <Sprout className="w-4 h-4" />
                              {operation.farm_name}
                            </span>
                            <span>•</span>
                            <span>عقد: {operation.contract_number}</span>
                            <span>•</span>
                            <span>{operation.trees_count} شجرة</span>
                          </div>
                        </div>

                        {!operation.is_read && (
                          <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full whitespace-nowrap">
                            جديد
                          </span>
                        )}
                      </div>

                      {/* التاريخ */}
                      <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {new Date(operation.operation_date).toLocaleDateString('ar-SA', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>

                      {/* الوصف المختصر */}
                      <p className="text-gray-700 leading-relaxed">
                        {isExpanded
                          ? operation.description
                          : operation.description?.substring(0, 150) + (operation.description?.length > 150 ? '...' : '')
                        }
                      </p>

                      {/* الأزرار */}
                      <div className="flex items-center gap-3 mt-4">
                        {operation.description?.length > 150 && (
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : operation.id)}
                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                          >
                            <Eye className="w-4 h-4" />
                            {isExpanded ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}
                          </button>
                        )}

                        {!operation.is_read && (
                          <button
                            onClick={() => markAsRead(operation.id)}
                            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                          >
                            <CheckCircle className="w-4 h-4" />
                            تعليم كمقروء
                          </button>
                        )}

                        {operation.is_read && operation.read_at && (
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            تم القراءة في {new Date(operation.read_at).toLocaleDateString('ar-SA')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* معلومات إضافية */}
      {operations.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-blue-900 mb-1">عن تشغيل أشجارك</h4>
              <p className="text-sm text-blue-700">
                هذه التحديثات تأتي مباشرة من إدارة المزارع وتشمل جميع عمليات التشغيل والصيانة
                المرتبطة بعقودك النشطة. يتم إبلاغك تلقائياً بأي تحديثات جديدة.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
