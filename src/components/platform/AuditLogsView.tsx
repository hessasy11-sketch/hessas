import { useState, useEffect } from 'react';
import { Shield, Activity, CheckCircle2, XCircle, Camera, Upload, Lock, Key, AlertTriangle, TrendingUp, Users, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AuditLog {
  log_id: string;
  log_type: 'access' | 'operation';
  log_timestamp: string;
  staff_id: string;
  staff_name: string;
  staff_role: string;
  operation: string;
  details: any;
  success: boolean;
  device_info: any;
  ip_address: string;
}

interface AccessStats {
  total_attempts: number;
  successful_attempts: number;
  failed_attempts: number;
  camera_scans: number;
  image_uploads: number;
  new_devices: number;
  pin_required: number;
  pin_verified: number;
  unique_staff: number;
}

export function AuditLogsView() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AccessStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'access' | 'operation'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [logsResult, statsResult] = await Promise.all([
        supabase.rpc('get_all_audit_logs', { p_limit: 100, p_offset: 0 }),
        supabase.rpc('get_access_statistics', { p_days: 7 })
      ]);

      if (logsResult.data) {
        setLogs(logsResult.data);
      }

      if (statsResult.data) {
        setStats(statsResult.data);
      }
    } catch (error) {
      console.error('Error loading audit logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    if (filter !== 'all' && log.log_type !== filter) return false;
    if (searchTerm) {
      return log.staff_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
             log.operation.toLowerCase().includes(searchTerm.toLowerCase());
    }
    return true;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'الآن';
    if (minutes < 60) return `منذ ${minutes} دقيقة`;
    if (hours < 24) return `منذ ${hours} ساعة`;
    if (days < 7) return `منذ ${days} يوم`;

    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getLogIcon = (log: AuditLog) => {
    if (log.log_type === 'operation') {
      if (log.operation.includes('PIN')) return <Key className="w-5 h-5" />;
      return <Shield className="w-5 h-5" />;
    }

    if (log.details.access_method === 'image_upload') return <Upload className="w-5 h-5" />;
    return <Camera className="w-5 h-5" />;
  };

  const getLogColor = (log: AuditLog) => {
    if (log.log_type === 'operation') return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
    if (!log.success) return 'text-red-400 bg-red-500/10 border-red-500/30';
    return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Activity className="w-12 h-12 text-slate-400 mx-auto mb-3 animate-spin" />
          <p className="text-slate-400" dir="rtl">جاري تحميل السجلات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">سجل التدقيق الشامل</h2>
            <p className="text-slate-400 text-sm">مراقبة جميع عمليات الدخول والإدارة</p>
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                <p className="text-slate-400 text-sm">إجمالي المحاولات</p>
              </div>
              <p className="text-2xl font-bold text-white">{stats.total_attempts}</p>
              <p className="text-xs text-emerald-400 mt-1">
                {stats.successful_attempts} ناجح / {stats.failed_attempts} فاشل
              </p>
            </div>

            <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <Camera className="w-5 h-5 text-blue-400" />
                <p className="text-slate-400 text-sm">طرق الدخول</p>
              </div>
              <p className="text-2xl font-bold text-white">{stats.camera_scans + stats.image_uploads}</p>
              <p className="text-xs text-blue-400 mt-1">
                {stats.camera_scans} كاميرا / {stats.image_uploads} رفع
              </p>
            </div>

            <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-5 h-5 text-amber-400" />
                <p className="text-slate-400 text-sm">أجهزة جديدة</p>
              </div>
              <p className="text-2xl font-bold text-white">{stats.new_devices}</p>
              <p className="text-xs text-amber-400 mt-1">
                تتطلب مراجعة
              </p>
            </div>

            <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-purple-400" />
                <p className="text-slate-400 text-sm">موظفون نشطون</p>
              </div>
              <p className="text-2xl font-bold text-white">{stats.unique_staff}</p>
              <p className="text-xs text-purple-400 mt-1">
                آخر 7 أيام
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث بالاسم أو العملية..."
            className="flex-1 px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />

          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-bold transition-colors ${
                filter === 'all'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              الكل ({logs.length})
            </button>
            <button
              onClick={() => setFilter('access')}
              className={`px-4 py-2 rounded-lg font-bold transition-colors ${
                filter === 'access'
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              دخول ({logs.filter(l => l.log_type === 'access').length})
            </button>
            <button
              onClick={() => setFilter('operation')}
              className={`px-4 py-2 rounded-lg font-bold transition-colors ${
                filter === 'operation'
                  ? 'bg-purple-500 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              عمليات ({logs.filter(l => l.log_type === 'operation').length})
            </button>
          </div>
        </div>

        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">لا توجد سجلات</p>
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.log_id}
                className="bg-slate-900/50 rounded-lg p-4 border border-slate-700 hover:border-slate-600 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${getLogColor(log)}`}>
                    {getLogIcon(log)}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-white font-bold">{log.staff_name}</h3>
                        <p className="text-slate-400 text-sm">{log.staff_role}</p>
                      </div>
                      <div className="flex items-center gap-2 text-slate-500 text-xs">
                        <Clock className="w-4 h-4" />
                        <span>{formatDate(log.log_timestamp)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        log.log_type === 'operation'
                          ? 'bg-purple-500/20 text-purple-400'
                          : log.success
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {log.operation}
                      </span>

                      {log.log_type === 'access' && (
                        <>
                          {log.details.requires_pin && (
                            <span className="px-2 py-1 bg-amber-500/20 text-amber-400 rounded text-xs flex items-center gap-1">
                              <Lock className="w-3 h-3" />
                              PIN
                            </span>
                          )}
                          {log.details.is_new_device && (
                            <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              جهاز جديد
                            </span>
                          )}
                        </>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {log.ip_address && (
                        <div className="text-slate-500">
                          IP: <span className="text-slate-400">{log.ip_address}</span>
                        </div>
                      )}
                      {log.details.failure_reason && (
                        <div className="text-red-400">
                          السبب: {log.details.failure_reason}
                        </div>
                      )}
                      {log.details.admin_name && (
                        <div className="text-slate-500">
                          بواسطة: <span className="text-blue-400">{log.details.admin_name}</span>
                        </div>
                      )}
                      {log.details.redirect_route && (
                        <div className="text-slate-500">
                          التوجيه: <span className="text-emerald-400">{log.details.redirect_route}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {filteredLogs.length > 0 && (
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700 text-center">
          <p className="text-slate-400 text-sm">
            عرض {filteredLogs.length} من أصل {logs.length} سجل
          </p>
        </div>
      )}
    </div>
  );
}
