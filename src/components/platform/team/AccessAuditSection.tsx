import { useState, useEffect } from 'react';
import {
  History,
  Calendar,
  User,
  QrCode,
  Upload,
  Key,
  CheckCircle,
  XCircle,
  Filter,
  RefreshCw,
  Download,
  Search
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface AuditLog {
  id: string;
  staff_id: string;
  access_method: string;
  logged_in_at: string;
  logged_out_at: string | null;
  device_fingerprint: any;
  was_successful: boolean;
  failure_reason: string | null;
  staff_member: {
    full_name: string;
    phone_number: string;
    department: string;
    role: string;
  };
}

export default function AccessAuditSection() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMethod, setFilterMethod] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('week');

  useEffect(() => {
    loadAuditLogs();
  }, [dateRange]);

  useEffect(() => {
    filterLogs();
  }, [logs, filterMethod, filterStatus, filterDepartment, searchTerm]);

  const loadAuditLogs = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('staff_access_log')
        .select(`
          *,
          staff:platform_staff(full_name, phone_number, department, role)
        `)
        .order('logged_in_at', { ascending: false })
        .limit(100);

      if (dateRange !== 'all') {
        const now = new Date();
        let startDate = new Date();

        if (dateRange === 'today') {
          startDate.setHours(0, 0, 0, 0);
        } else if (dateRange === 'week') {
          startDate.setDate(now.getDate() - 7);
        } else if (dateRange === 'month') {
          startDate.setMonth(now.getMonth() - 1);
        }

        query = query.gte('logged_in_at', startDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      const formattedLogs = (data || []).map((log: any) => ({
        id: log.id,
        staff_id: log.staff_id,
        access_method: log.access_method,
        logged_in_at: log.logged_in_at,
        logged_out_at: log.logged_out_at,
        device_fingerprint: log.device_fingerprint,
        was_successful: log.was_successful,
        failure_reason: log.failure_reason,
        staff_member: log.staff || {},
      }));

      setLogs(formattedLogs);
    } catch (error) {
      console.error('Error loading audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterLogs = () => {
    let filtered = logs;

    if (filterMethod !== 'all') {
      filtered = filtered.filter((log) => log.access_method === filterMethod);
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter((log) =>
        filterStatus === 'success' ? log.was_successful : !log.was_successful
      );
    }

    if (filterDepartment !== 'all') {
      filtered = filtered.filter((log) => log.staff_member.department === filterDepartment);
    }

    if (searchTerm) {
      filtered = filtered.filter((log) =>
        log.staff_member.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.staff_member.phone_number?.includes(searchTerm)
      );
    }

    setFilteredLogs(filtered);
  };

  const getAccessMethodBadge = (method: string) => {
    const methods: Record<string, { icon: any; color: string; label: string }> = {
      qr_scan: { icon: QrCode, color: 'from-emerald-500 to-teal-600', label: 'مسح QR' },
      qr_upload: { icon: Upload, color: 'from-blue-500 to-indigo-600', label: 'رفع QR' },
      pin_code: { icon: Key, color: 'from-purple-500 to-purple-600', label: 'رمز PIN' },
    };

    const method_info = methods[method] || { icon: User, color: 'from-gray-500 to-gray-600', label: method };
    const Icon = method_info.icon;

    return (
      <div className="flex items-center gap-2">
        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${method_info.color} flex items-center justify-center`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <span className="text-sm font-bold text-gray-300">{method_info.label}</span>
      </div>
    );
  };

  const getDepartmentBadge = (department: string) => {
    const badges: Record<string, { color: string; label: string }> = {
      b2b: { color: 'from-blue-500 to-blue-600', label: 'المزادات' },
      b2f: { color: 'from-emerald-500 to-emerald-600', label: 'المزارع' },
      hq: { color: 'from-purple-500 to-purple-600', label: 'الإدارة العليا' },
    };

    const badge = badges[department] || { color: 'from-gray-500 to-gray-600', label: department };

    return (
      <span className={`px-2 py-1 rounded-lg text-xs font-bold bg-gradient-to-r ${badge.color} text-white`}>
        {badge.label}
      </span>
    );
  };

  const exportLogs = () => {
    const csv = [
      ['الاسم', 'الجوال', 'القسم', 'طريقة الدخول', 'وقت الدخول', 'وقت الخروج', 'الحالة', 'سبب الفشل'],
      ...filteredLogs.map((log) => [
        log.staff_member.full_name || '',
        log.staff_member.phone_number || '',
        log.staff_member.department || '',
        log.access_method,
        new Date(log.logged_in_at).toLocaleString('ar-SA'),
        log.logged_out_at ? new Date(log.logged_out_at).toLocaleString('ar-SA') : 'لم يخرج بعد',
        log.was_successful ? 'نجح' : 'فشل',
        log.failure_reason || '',
      ]),
    ];

    const csvContent = csv.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `audit_log_${new Date().toISOString()}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin text-orange-400 mx-auto mb-4" />
          <p className="text-white font-medium">جاري تحميل سجل الدخول...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <History className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-orange-200 text-sm leading-relaxed">
              <strong>سجل التدقيق:</strong> جميع محاولات الدخول (ناجحة أو فاشلة) مسجلة مع التفاصيل الكاملة:
              من دخل، متى، من أي جهاز، بأي طريقة (QR/Upload/PIN).
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <History className="w-6 h-6 text-orange-400" />
          <div>
            <h3 className="text-white font-bold text-lg">سجل الدخول</h3>
            <p className="text-gray-400 text-sm">{filteredLogs.length} سجل</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="today">اليوم</option>
            <option value="week">آخر 7 أيام</option>
            <option value="month">آخر 30 يوم</option>
            <option value="all">الكل</option>
          </select>

          <button
            onClick={exportLogs}
            className="px-4 py-2 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-xl font-bold transition-all flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            تصدير
          </button>

          <button
            onClick={loadAuditLogs}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-all flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            تحديث
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث..."
            className="w-full pr-10 pl-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <select
          value={filterMethod}
          onChange={(e) => setFilterMethod(e.target.value)}
          className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="all">كل الطرق</option>
          <option value="qr_scan">مسح QR</option>
          <option value="qr_upload">رفع QR</option>
          <option value="pin_code">رمز PIN</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="all">كل الحالات</option>
          <option value="success">ناجح فقط</option>
          <option value="failed">فاشل فقط</option>
        </select>

        <select
          value={filterDepartment}
          onChange={(e) => setFilterDepartment(e.target.value)}
          className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="all">كل الأقسام</option>
          <option value="b2b">المزادات</option>
          <option value="b2f">المزارع</option>
          <option value="hq">الإدارة العليا</option>
        </select>
      </div>

      <div className="space-y-3">
        {filteredLogs.map((log) => (
          <div
            key={log.id}
            className={`bg-white/5 border rounded-xl p-4 hover:bg-white/10 transition-all ${
              log.was_successful ? 'border-emerald-500/20' : 'border-red-500/20'
            }`}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center flex-shrink-0 ${
                  log.was_successful ? 'from-emerald-500 to-teal-600' : 'from-red-500 to-red-600'
                }`}>
                  {log.was_successful ? (
                    <CheckCircle className="w-5 h-5 text-white" />
                  ) : (
                    <XCircle className="w-5 h-5 text-white" />
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="text-white font-bold">
                      {log.staff_member.full_name || 'غير محدد'}
                    </h4>
                    {getDepartmentBadge(log.staff_member.department)}
                    <span className="text-gray-400 text-xs">
                      {log.staff_member.phone_number}
                    </span>
                  </div>

                  <div className="flex items-center gap-6 text-sm">
                    {getAccessMethodBadge(log.access_method)}

                    <div className="flex items-center gap-2 text-gray-400">
                      <Calendar className="w-4 h-4" />
                      {new Date(log.logged_in_at).toLocaleString('ar-SA')}
                    </div>

                    {log.logged_out_at && (
                      <div className="flex items-center gap-2 text-gray-400">
                        خرج: {new Date(log.logged_out_at).toLocaleString('ar-SA')}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                {log.was_successful ? (
                  <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400">
                    نجح
                  </span>
                ) : (
                  <div className="text-right">
                    <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-red-500/20 text-red-400 block mb-1">
                      فشل
                    </span>
                    {log.failure_reason && (
                      <span className="text-xs text-red-300">{log.failure_reason}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredLogs.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-full bg-gray-500/10 flex items-center justify-center mx-auto mb-4">
            <History className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-400">لا توجد سجلات</p>
          <p className="text-gray-500 text-sm mt-1">جرب تغيير معايير البحث أو النطاق الزمني</p>
        </div>
      )}
    </div>
  );
}
