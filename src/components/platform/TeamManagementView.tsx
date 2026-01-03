import { useState, useEffect } from 'react';
import {
  Users,
  QrCode,
  Shield,
  History,
  UserPlus,
  Clock,
  Settings,
  CheckCircle,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import StaffManagementSection from './team/StaffManagementSection';
import QRManagementSection from './team/QRManagementSection';
import SessionManagementSection from './team/SessionManagementSection';
import AccessAuditSection from './team/AccessAuditSection';

type SectionType = 'staff' | 'qr' | 'sessions' | 'audit';

interface TeamStats {
  totalStaff: number;
  activeStaff: number;
  pendingQRs: number;
  activeSessions: number;
  recentAccessLogs: number;
}

export default function TeamManagementView() {
  const [activeSection, setActiveSection] = useState<SectionType>('staff');
  const [stats, setStats] = useState<TeamStats>({
    totalStaff: 0,
    activeStaff: 0,
    pendingQRs: 0,
    activeSessions: 0,
    recentAccessLogs: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);

      const [staffResult, activeStaffResult, qrResult, sessionsResult, auditResult] = await Promise.all([
        supabase.from('platform_staff').select('id', { count: 'exact', head: true }),
        supabase.from('platform_staff').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('platform_staff').select('id', { count: 'exact', head: true }).is('qr_code', null),
        supabase.from('staff_access_devices').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('staff_access_log').select('id', { count: 'exact', head: true }).gte('logged_in_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
      ]);

      setStats({
        totalStaff: staffResult.count || 0,
        activeStaff: activeStaffResult.count || 0,
        pendingQRs: qrResult.count || 0,
        activeSessions: sessionsResult.count || 0,
        recentAccessLogs: auditResult.count || 0,
      });
    } catch (error) {
      console.error('Error loading team stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const sections = [
    {
      id: 'staff' as SectionType,
      title: 'إدارة الموظفين',
      icon: Users,
      color: 'from-blue-500 to-blue-600',
      stat: `${stats.activeStaff} / ${stats.totalStaff}`,
      label: 'موظف نشط',
    },
    {
      id: 'qr' as SectionType,
      title: 'نظام الباركود والـ PIN',
      icon: QrCode,
      color: 'from-emerald-500 to-emerald-600',
      stat: stats.pendingQRs,
      label: 'ينتظر باركود',
    },
    {
      id: 'sessions' as SectionType,
      title: 'جلسات الإدارة',
      icon: Clock,
      color: 'from-purple-500 to-purple-600',
      stat: stats.activeSessions,
      label: 'جلسة نشطة',
    },
    {
      id: 'audit' as SectionType,
      title: 'سجل الدخول والتدقيق',
      icon: History,
      color: 'from-orange-500 to-orange-600',
      stat: stats.recentAccessLogs,
      label: 'عملية دخول (24 ساعة)',
    },
  ];

  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 backdrop-blur-sm rounded-2xl border border-blue-500/20 p-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-black text-white mb-2">
              إدارة الفريق والصلاحيات
            </h2>
            <p className="text-blue-200 text-sm leading-relaxed">
              نظام متكامل لإدارة الموظفين، إصدار باركود الدخول، متابعة الجلسات، وتدقيق الوصول
            </p>
          </div>
          <button
            onClick={loadStats}
            disabled={loading}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            تحديث
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 p-6 text-right ${
              activeSection === section.id
                ? 'bg-gradient-to-br from-white/20 to-white/10 border-white/30 scale-105 shadow-xl'
                : 'bg-white/5 border-white/10 hover:bg-white/10 hover:scale-102'
            }`}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${section.color} opacity-0 group-hover:opacity-10 transition-opacity`}></div>

            <div className="relative">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${section.color} flex items-center justify-center mb-4 shadow-lg ${
                activeSection === section.id ? 'scale-110' : ''
              } transition-transform`}>
                <section.icon className="w-6 h-6 text-white" />
              </div>

              <h3 className="text-white font-bold text-base mb-3">{section.title}</h3>

              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-white">{section.stat}</span>
                <span className="text-gray-400 text-xs">{section.label}</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 overflow-hidden">
        {activeSection === 'staff' && <StaffManagementSection onStaffUpdated={loadStats} />}
        {activeSection === 'qr' && <QRManagementSection onQRUpdated={loadStats} />}
        {activeSection === 'sessions' && <SessionManagementSection />}
        {activeSection === 'audit' && <AccessAuditSection />}
      </div>

      <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-teal-600/10 border border-emerald-500/20">
        <div className="flex items-center gap-3">
          <CheckCircle className="w-6 h-6 text-emerald-400" />
          <div>
            <p className="text-white font-bold">نظام إدارة الفريق متكامل وآمن</p>
            <p className="text-gray-400 text-sm mt-1">
              جميع العمليات مسجلة ومؤرخة، الباركود محمي بـ PIN اختياري، الجلسات تنتهي تلقائياً بعد 30 دقيقة خمول
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
