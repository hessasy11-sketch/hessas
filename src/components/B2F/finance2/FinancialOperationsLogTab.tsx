import { useState, useEffect } from 'react';
import { Activity, User, Calendar, FileText, CheckCircle, XCircle, Edit, DollarSign, Filter, Search, CreditCard, Settings, Upload, Ban } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface LogEntry {
  id: string;
  operation_type: string;
  operation_description: string;
  performed_by: string;
  target_id: string | null;
  target_type: string | null;
  invoice_number: string | null;
  transaction_number: string | null;
  sales_request_id: string | null;
  old_value: string | null;
  new_value: string | null;
  metadata: any;
  created_at: string;
}

const operationTypeLabels: Record<string, string> = {
  gateway_enabled: 'تفعيل بوابة دفع',
  gateway_disabled: 'تعطيل بوابة دفع',
  gateway_config_updated: 'تحديث إعدادات بوابة',
  invoice_created: 'إنشاء فاتورة',
  invoice_status_changed: 'تغيير حالة فاتورة',
  invoice_sent: 'إرسال فاتورة',
  payment_approved: 'اعتماد دفع',
  payment_rejected: 'رفض دفع',
  payment_refunded: 'استرداد دفع',
  receipt_uploaded: 'رفع إيصال',
  receipt_approved: 'اعتماد إيصال',
  receipt_rejected: 'رفض إيصال'
};

const mockLogs_REMOVED: any[] = [
  {
    id: '1',
    timestamp: '2026-01-01T14:35:22',
    user: 'أحمد المدير',
    action: 'إصدار فاتورة',
    entity_type: 'invoice',
    entity_id: 'INV-2026-001',
    description: 'تم إصدار فاتورة جديدة للمستثمر أحمد محمد العتيبي',
    status: 'success',
    amount: 15000
  },
  {
    id: '2',
    timestamp: '2026-01-01T14:30:15',
    user: 'النظام الآلي',
    action: 'تأكيد دفع',
    entity_type: 'payment',
    entity_id: 'TXN-20260101-A7B2',
    description: 'تم تأكيد الدفع عبر بوابة مدى بنجاح',
    status: 'success',
    amount: 15000
  },
  {
    id: '3',
    timestamp: '2026-01-01T10:20:45',
    user: 'سارة المحاسبة',
    action: 'تفعيل بوابة دفع',
    entity_type: 'gateway',
    entity_id: 'mada',
    description: 'تم تفعيل بوابة مدى للدفع الإلكتروني',
    status: 'success'
  },
  {
    id: '4',
    timestamp: '2026-01-01T09:15:30',
    user: 'النظام الآلي',
    action: 'محاولة دفع فاشلة',
    entity_type: 'payment',
    entity_id: 'TXN-20260101-FAIL',
    description: 'فشلت عملية الدفع - رصيد غير كافٍ',
    status: 'failed',
    amount: 8500
  },
  {
    id: '5',
    timestamp: '2025-12-31T18:50:00',
    user: 'أحمد المدير',
    action: 'تعديل بيانات بوابة',
    entity_type: 'gateway',
    entity_id: 'bank_transfer',
    description: 'تم تحديث بيانات الحساب البنكي',
    status: 'success'
  },
  {
    id: '6',
    timestamp: '2025-12-31T16:25:10',
    user: 'النظام الآلي',
    action: 'إرسال إشعار',
    entity_type: 'notification',
    entity_id: 'NOT-125',
    description: 'تم إرسال إشعار تذكير بالدفع للمستثمر',
    status: 'success'
  }
];

export default function FinancialOperationsLogTab() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [operationTypeFilter, setOperationTypeFilter] = useState<string>('all');
  const [userFilter, setUserFilter] = useState<string>('all');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('b2f_financial_operations_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch =
      log.operation_description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.performed_by.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.invoice_number?.includes(searchTerm)) ||
      (log.transaction_number?.includes(searchTerm));

    const matchesOperationType = operationTypeFilter === 'all' || log.operation_type === operationTypeFilter;
    const matchesUser = userFilter === 'all' || log.performed_by === userFilter;

    return matchesSearch && matchesOperationType && matchesUser;
  });

  const uniqueUsers = Array.from(new Set(logs.map(l => l.performed_by)));

  const stats = {
    total: logs.length,
    today: logs.filter(l => {
      const today = new Date().toDateString();
      const logDate = new Date(l.created_at).toDateString();
      return today === logDate;
    }).length
  };

  const getActionIcon = (operationType: string) => {
    if (operationType.includes('invoice')) return FileText;
    if (operationType.includes('payment')) return DollarSign;
    if (operationType.includes('gateway')) return Settings;
    if (operationType.includes('receipt')) return Upload;
    return Activity;
  };

  const getOperationBadge = (operationType: string) => {
    const typeConfig: Record<string, any> = {
      gateway_enabled: { className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
      gateway_disabled: { className: 'bg-red-100 text-red-700 border-red-200' },
      gateway_config_updated: { className: 'bg-blue-100 text-blue-700 border-blue-200' },
      invoice_created: { className: 'bg-blue-100 text-blue-700 border-blue-200' },
      invoice_status_changed: { className: 'bg-purple-100 text-purple-700 border-purple-200' },
      invoice_sent: { className: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
      payment_approved: { className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
      payment_rejected: { className: 'bg-red-100 text-red-700 border-red-200' },
      payment_refunded: { className: 'bg-amber-100 text-amber-700 border-amber-200' },
      receipt_uploaded: { className: 'bg-blue-100 text-blue-700 border-blue-200' },
      receipt_approved: { className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
      receipt_rejected: { className: 'bg-red-100 text-red-700 border-red-200' }
    };
    return typeConfig[operationType] || { className: 'bg-gray-100 text-gray-700 border-gray-200' };
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return {
      date: date.toLocaleDateString('ar-SA'),
      time: date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-gradient-to-br from-slate-500 to-gray-700 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
            <Activity className="w-7 h-7" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-black mb-1">سجل العمليات المالية</h2>
            <p className="text-slate-200 text-sm">سجل كامل بجميع الأنشطة والتغييرات المالية في النظام</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-5 border-2 border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-gray-600" />
            </div>
            <span className="text-sm text-gray-700 font-bold">إجمالي العمليات المسجلة</span>
          </div>
          <p className="text-3xl font-black text-gray-900">{stats.total}</p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-5 border-2 border-blue-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-sm text-blue-700 font-bold">عمليات اليوم</span>
          </div>
          <p className="text-3xl font-black text-gray-900">{stats.today}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border-2 border-gray-200 p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="البحث في الوصف، المستخدم، أو رقم الفاتورة..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
            />
          </div>

          <div className="relative">
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={operationTypeFilter}
              onChange={(e) => setOperationTypeFilter(e.target.value)}
              className="w-full pr-10 pl-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
            >
              <option value="all">جميع أنواع العمليات</option>
              {Object.entries(operationTypeLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          <div className="relative">
            <User className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="w-full pr-10 pl-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
            >
              <option value="all">جميع المستخدمين</option>
              {uniqueUsers.map(user => (
                <option key={user} value={user}>{user}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Log Entries */}
      {loading ? (
        <div className="bg-white rounded-xl border-2 border-gray-200 p-12 text-center">
          <div className="flex items-center justify-center gap-2 text-gray-500">
            <div className="w-6 h-6 border-4 border-gray-600 border-t-transparent rounded-full animate-spin"></div>
            <span>جاري التحميل...</span>
          </div>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="bg-white rounded-xl border-2 border-gray-200 p-12 text-center">
          <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-bold">لا توجد عمليات مسجلة</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLogs.map((log) => {
            const ActionIcon = getActionIcon(log.operation_type);
            const operationBadge = getOperationBadge(log.operation_type);
            const dateTime = formatDateTime(log.created_at);
            const operationLabel = operationTypeLabels[log.operation_type] || log.operation_type;

            return (
              <div
                key={log.id}
                className="bg-white rounded-xl border-2 border-gray-200 p-5 shadow-sm hover:shadow-md transition-all"
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-gray-100 to-slate-100">
                    <ActionIcon className="w-6 h-6 text-gray-600" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1">
                        <h3 className="font-black text-gray-900 text-lg mb-1">{operationLabel}</h3>
                        <p className="text-sm text-gray-700 leading-relaxed">{log.operation_description}</p>
                      </div>
                    </div>

                    {/* Meta Info */}
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <User className="w-4 h-4" />
                        <span className="font-medium">{log.performed_by}</span>
                      </div>

                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>{dateTime.date}</span>
                        <span className="text-gray-400">•</span>
                        <span className="text-xs">{dateTime.time}</span>
                      </div>

                      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border font-bold text-xs ${operationBadge.className}`}>
                        {operationLabel}
                      </div>

                      {log.invoice_number && (
                        <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold">
                          <FileText className="w-3 h-3" />
                          {log.invoice_number}
                        </div>
                      )}

                      {log.transaction_number && (
                        <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold">
                          <CreditCard className="w-3 h-3" />
                          {log.transaction_number}
                        </div>
                      )}

                      {log.old_value && log.new_value && (
                        <div className="inline-flex items-center gap-1 text-xs text-gray-500">
                          <span className="line-through">{log.old_value}</span>
                          <span>←</span>
                          <span className="font-bold text-gray-900">{log.new_value}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
