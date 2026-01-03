import { useState, useEffect } from 'react';
import {
  Clock,
  Activity,
  LogOut,
  User,
  Monitor,
  MapPin,
  Calendar,
  AlertTriangle,
  RefreshCw,
  X
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface ActiveSession {
  id: string;
  device_id: string;
  device_fingerprint: any;
  logged_in_at: string;
  last_activity_at: string;
  is_active: boolean;
  staff_member: {
    full_name: string;
    phone_number: string;
    role: string;
    department: string;
  };
}

export default function SessionManagementSection() {
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<ActiveSession | null>(null);

  useEffect(() => {
    loadActiveSessions();

    const interval = setInterval(loadActiveSessions, 30000);

    return () => clearInterval(interval);
  }, []);

  const loadActiveSessions = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('staff_access_devices')
        .select(`
          id,
          device_id,
          device_fingerprint,
          logged_in_at,
          last_activity_at,
          is_active,
          staff:platform_staff(full_name, phone_number, role, department)
        `)
        .eq('is_active', true)
        .order('last_activity_at', { ascending: false });

      if (error) throw error;

      const formattedSessions = (data || []).map((session: any) => ({
        id: session.id,
        device_id: session.device_id,
        device_fingerprint: session.device_fingerprint,
        logged_in_at: session.logged_in_at,
        last_activity_at: session.last_activity_at,
        is_active: session.is_active,
        staff_member: session.staff || {},
      }));

      setSessions(formattedSessions);
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const terminateSession = async (sessionId: string) => {
    if (!confirm('هل أنت متأكد من إنهاء هذه الجلسة؟ سيتم تسجيل خروج الموظف فوراً.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('staff_access_devices')
        .update({ is_active: false })
        .eq('id', sessionId);

      if (error) throw error;

      await loadActiveSessions();
      alert('تم إنهاء الجلسة بنجاح');
    } catch (error) {
      console.error('Error terminating session:', error);
      alert('فشل إنهاء الجلسة');
    }
  };

  const getIdleTime = (lastActivity: string) => {
    const now = new Date();
    const lastActivityDate = new Date(lastActivity);
    const diff = Math.floor((now.getTime() - lastActivityDate.getTime()) / 1000 / 60);

    if (diff < 1) return 'نشط الآن';
    if (diff < 5) return `${diff} دقيقة`;
    if (diff < 30) return `${diff} دقيقة (سيتم الإنهاء تلقائياً بعد ${30 - diff} دقيقة)`;
    return `${diff} دقيقة (جلسة منتهية)`;
  };

  const getIdleStatus = (lastActivity: string) => {
    const now = new Date();
    const lastActivityDate = new Date(lastActivity);
    const diff = Math.floor((now.getTime() - lastActivityDate.getTime()) / 1000 / 60);

    if (diff < 5) return 'active';
    if (diff < 15) return 'idle';
    if (diff < 30) return 'warning';
    return 'expired';
  };

  const getDepartmentBadge = (department: string) => {
    const badges: Record<string, { color: string; label: string }> = {
      b2b: { color: 'from-blue-500 to-blue-600', label: 'المزادات' },
      b2f: { color: 'from-emerald-500 to-emerald-600', label: 'المزارع' },
      hq: { color: 'from-purple-500 to-purple-600', label: 'الإدارة العليا' },
    };

    const badge = badges[department] || { color: 'from-gray-500 to-gray-600', label: department };

    return (
      <span className={`px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r ${badge.color} text-white shadow-sm`}>
        {badge.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin text-purple-400 mx-auto mb-4" />
          <p className="text-white font-medium">جاري تحميل الجلسات النشطة...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Clock className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-purple-200 text-sm leading-relaxed">
              <strong>نظام الجلسات:</strong> تنتهي الجلسة تلقائياً بعد 30 دقيقة من عدم النشاط.
              الجلسة لا تنتهي عند الانتقال للواجهة العامة - تنتهي فقط بالخروج أو الخمول.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-purple-400" />
          <div>
            <h3 className="text-white font-bold text-lg">الجلسات النشطة</h3>
            <p className="text-gray-400 text-sm">{sessions.length} جلسة</p>
          </div>
        </div>

        <button
          onClick={loadActiveSessions}
          className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-all flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          تحديث
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {sessions.map((session) => {
          const idleStatus = getIdleStatus(session.last_activity_at);
          const statusColors = {
            active: 'from-emerald-500 to-teal-600',
            idle: 'from-yellow-500 to-orange-600',
            warning: 'from-orange-500 to-red-600',
            expired: 'from-red-500 to-red-600',
          };

          return (
            <div
              key={session.id}
              className="bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/10 transition-all"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${statusColors[idleStatus]} flex items-center justify-center flex-shrink-0`}>
                    <User className="w-6 h-6 text-white" />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-white font-bold text-lg">
                        {session.staff_member.full_name || 'غير محدد'}
                      </h3>
                      {getDepartmentBadge(session.staff_member.department)}
                    </div>

                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm text-gray-400">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>{getIdleTime(session.last_activity_at)}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>دخول: {new Date(session.logged_in_at).toLocaleString('ar-SA')}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Monitor className="w-4 h-4" />
                        <span>{session.device_id.substring(0, 20)}...</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4" />
                        <span>آخر نشاط: {new Date(session.last_activity_at).toLocaleString('ar-SA')}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedSession(session)}
                    className="px-4 py-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-xl font-bold transition-all"
                  >
                    التفاصيل
                  </button>

                  <button
                    onClick={() => terminateSession(session.id)}
                    className="px-4 py-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-xl font-bold transition-all flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    إنهاء
                  </button>
                </div>
              </div>

              {idleStatus === 'warning' && (
                <div className="mt-4 bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-400" />
                  <span className="text-orange-200 text-sm font-bold">
                    تحذير: الجلسة قريبة من الانتهاء التلقائي
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {sessions.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-full bg-gray-500/10 flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-400">لا توجد جلسات نشطة حالياً</p>
          <p className="text-gray-500 text-sm mt-1">جميع الموظفين قاموا بتسجيل الخروج</p>
        </div>
      )}

      {selectedSession && (
        <SessionDetailsModal
          session={selectedSession}
          onClose={() => setSelectedSession(null)}
        />
      )}
    </div>
  );
}

interface SessionDetailsModalProps {
  session: ActiveSession;
  onClose: () => void;
}

function SessionDetailsModal({ session, onClose }: SessionDetailsModalProps) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl max-w-2xl w-full border border-white/10 shadow-2xl">
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4 rounded-t-2xl flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">تفاصيل الجلسة</h2>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-white/5 rounded-xl p-4">
            <h3 className="text-white font-bold mb-3">معلومات الموظف</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">الاسم:</span>
                <span className="text-white font-bold">{session.staff_member.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">الجوال:</span>
                <span className="text-white">{session.staff_member.phone_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">المسمى:</span>
                <span className="text-white">{session.staff_member.role}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">القسم:</span>
                <span className="text-white">{session.staff_member.department}</span>
              </div>
            </div>
          </div>

          <div className="bg-white/5 rounded-xl p-4">
            <h3 className="text-white font-bold mb-3">معلومات الجلسة</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">معرف الجهاز:</span>
                <span className="text-white font-mono text-xs">{session.device_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">وقت الدخول:</span>
                <span className="text-white">{new Date(session.logged_in_at).toLocaleString('ar-SA')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">آخر نشاط:</span>
                <span className="text-white">{new Date(session.last_activity_at).toLocaleString('ar-SA')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">الحالة:</span>
                <span className="text-emerald-400 font-bold">نشطة</span>
              </div>
            </div>
          </div>

          {session.device_fingerprint && (
            <div className="bg-white/5 rounded-xl p-4">
              <h3 className="text-white font-bold mb-3">بصمة الجهاز</h3>
              <div className="space-y-2 text-sm">
                {session.device_fingerprint.browser && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">المتصفح:</span>
                    <span className="text-white">{session.device_fingerprint.browser}</span>
                  </div>
                )}
                {session.device_fingerprint.os && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">نظام التشغيل:</span>
                    <span className="text-white">{session.device_fingerprint.os}</span>
                  </div>
                )}
                {session.device_fingerprint.screenResolution && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">دقة الشاشة:</span>
                    <span className="text-white">{session.device_fingerprint.screenResolution}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full bg-white/5 hover:bg-white/10 text-white px-6 py-3 rounded-xl font-bold transition-all"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
