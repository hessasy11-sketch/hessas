import { useState, useEffect } from 'react';
import {
  Users,
  Shield,
  UserPlus,
  Search,
  Grid,
  List,
  Phone,
  Mail,
  Power,
  PowerOff,
  Eye,
  Edit3,
  Check,
  X,
  QrCode,
  Lock,
  Activity,
  Settings,
  TrendingUp,
  RefreshCw,
  ArrowUpRight,
  Zap,
  Target,
  Award,
  Star,
  Clock,
  Download,
  Filter,
  Bell,
  BarChart3,
  Layers,
  ChevronRight
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import StaffManagementSection from './team/StaffManagementSection';
import QRManagementSection from './team/QRManagementSection';
import SessionManagementSection from './team/SessionManagementSection';
import AccessAuditSection from './team/AccessAuditSection';

interface StaffMember {
  id: string;
  user_id: string | null;
  phone_number: string;
  full_name: string;
  email: string | null;
  role: string;
  department: string;
  reports_to: string | null;
  is_active: boolean;
  qr_code: string | null;
  requires_pin: boolean;
  created_at: string;
}

type SectionType = 'staff' | 'qr' | 'sessions' | 'audit' | 'permissions' | 'analytics';
type ViewMode = 'grid' | 'list';

interface TeamStats {
  totalStaff: number;
  activeStaff: number;
  pendingQRs: number;
  activeSessions: number;
  recentAccessLogs: number;
  totalRoles: number;
  avgPermissions: number;
  qrEnabled: number;
}

export default function TeamManagementView() {
  const [activeSection, setActiveSection] = useState<SectionType>('staff');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [stats, setStats] = useState<TeamStats>({
    totalStaff: 0,
    activeStaff: 0,
    pendingQRs: 0,
    activeSessions: 0,
    recentAccessLogs: 0,
    totalRoles: 0,
    avgPermissions: 8,
    qrEnabled: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadStats(), loadStaff()]);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const [staffResult, activeStaffResult, qrResult, sessionsResult, auditResult] = await Promise.all([
        supabase.from('platform_staff').select('id', { count: 'exact', head: true }),
        supabase.from('platform_staff').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('platform_staff').select('id', { count: 'exact', head: true }).is('qr_code', null),
        supabase.from('platform_staff_sessions').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('staff_access_log').select('id', { count: 'exact', head: true }).gte('access_time', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
      ]);

      const qrEnabledCount = (staffResult.count || 0) - (qrResult.count || 0);

      setStats({
        totalStaff: staffResult.count || 0,
        activeStaff: activeStaffResult.count || 0,
        pendingQRs: qrResult.count || 0,
        activeSessions: sessionsResult.count || 0,
        recentAccessLogs: auditResult.count || 0,
        totalRoles: 7,
        avgPermissions: 8,
        qrEnabled: qrEnabledCount
      });
    } catch (error) {
      console.error('Error loading team stats:', error);
    }
  };

  const loadStaff = async () => {
    try {
      const { data, error } = await supabase
        .from('platform_staff')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setStaff(data);
      }
    } catch (error) {
      console.error('Error loading staff:', error);
    }
  };

  const filteredStaff = staff.filter(member => {
    const matchesSearch =
      member.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.phone_number.includes(searchTerm) ||
      (member.email && member.email.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesDepartment = filterDepartment === 'all' || member.department === filterDepartment;
    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'active' && member.is_active) ||
      (filterStatus === 'inactive' && !member.is_active);

    return matchesSearch && matchesDepartment && matchesStatus;
  });

  const getDepartmentColor = (department: string) => {
    const colors: Record<string, string> = {
      b2b: 'from-blue-500 to-cyan-500',
      b2f: 'from-emerald-500 to-teal-500',
      hq: 'from-purple-500 to-pink-500',
    };
    return colors[department] || 'from-gray-500 to-gray-600';
  };

  const getRoleBadge = (role: string) => {
    const roles: Record<string, { name: string; icon: any }> = {
      super_admin: { name: 'مدير عام', icon: Award },
      admin: { name: 'مدير', icon: Shield },
      manager: { name: 'مشرف', icon: Target },
      staff: { name: 'موظف', icon: Users },
      sales: { name: 'مبيعات', icon: TrendingUp },
      operations: { name: 'عمليات', icon: Activity },
      finance: { name: 'مالية', icon: Zap },
    };
    return roles[role] || { name: role, icon: Users };
  };

  const toggleStaffStatus = async (staffId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('platform_staff')
        .update({ is_active: !currentStatus })
        .eq('id', staffId);

      if (!error) {
        await loadStaff();
        await loadStats();
      }
    } catch (error) {
      console.error('Error toggling staff status:', error);
    }
  };

  const sections = [
    {
      id: 'staff' as SectionType,
      title: 'إدارة الموظفين',
      icon: Users,
      color: 'from-blue-500 to-cyan-500',
      stat: `${stats.activeStaff} / ${stats.totalStaff}`,
      label: 'موظف نشط',
      description: 'عرض وإدارة جميع الموظفين'
    },
    {
      id: 'qr' as SectionType,
      title: 'نظام الدخول الذكي',
      icon: QrCode,
      color: 'from-emerald-500 to-teal-500',
      stat: stats.qrEnabled,
      label: 'QR مُفعّل',
      description: 'إدارة باركود الدخول والـ PIN'
    },
    {
      id: 'sessions' as SectionType,
      title: 'جلسات الإدارة',
      icon: Clock,
      color: 'from-orange-500 to-red-500',
      stat: stats.activeSessions,
      label: 'جلسة نشطة',
      description: 'متابعة الجلسات النشطة'
    },
    {
      id: 'audit' as SectionType,
      title: 'سجل التدقيق',
      icon: Activity,
      color: 'from-purple-500 to-pink-500',
      stat: stats.recentAccessLogs,
      label: 'عملية (24 ساعة)',
      description: 'سجل الدخول والمراجعة'
    },
    {
      id: 'permissions' as SectionType,
      title: 'الصلاحيات',
      icon: Lock,
      color: 'from-indigo-500 to-blue-500',
      stat: stats.avgPermissions,
      label: 'صلاحية/دور',
      description: 'إدارة الأدوار والصلاحيات'
    },
    {
      id: 'analytics' as SectionType,
      title: 'التحليلات',
      icon: BarChart3,
      color: 'from-pink-500 to-rose-500',
      stat: stats.totalRoles,
      label: 'دور مُعرّف',
      description: 'إحصائيات ورؤى عميقة'
    },
  ];

  if (loading) {
    return (
      <div className="min-h-[600px] flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-ping opacity-20"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse"></div>
            <RefreshCw className="w-20 h-20 text-white animate-spin relative z-10" />
          </div>
          <p className="text-white text-xl font-bold mb-2">جاري التحميل...</p>
          <p className="text-gray-400">نقوم بتحميل بيانات الفريق والصلاحيات</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8" dir="rtl">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20 backdrop-blur-xl border border-white/10 p-8">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDUpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30"></div>

        <div className="relative z-10 flex items-center justify-between flex-wrap gap-6">
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl blur-xl opacity-50 animate-pulse"></div>
              <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-2xl">
                <Shield className="w-10 h-10 text-white" />
              </div>
            </div>
            <div>
              <h2 className="text-4xl font-black text-white mb-2 tracking-tight">
                مركز القيادة المتقدم
              </h2>
              <p className="text-lg text-blue-200 leading-relaxed">
                إدارة شاملة للفريق، الأدوار، والصلاحيات مع تحليلات فورية
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              disabled={loading}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white rounded-xl font-bold transition-all flex items-center gap-2 border border-white/20 disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              تحديث
            </button>
            <button className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg shadow-blue-500/50">
              <Download className="w-5 h-5" />
              تصدير
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[
          {
            label: 'إجمالي الموظفين',
            value: stats.totalStaff,
            icon: Users,
            color: 'from-blue-500 to-cyan-500',
            trend: '+12%'
          },
          {
            label: 'موظف نشط',
            value: stats.activeStaff,
            icon: Activity,
            color: 'from-emerald-500 to-teal-500',
            trend: '+8%'
          },
          {
            label: 'الأدوار المُعرفة',
            value: stats.totalRoles,
            icon: Shield,
            color: 'from-purple-500 to-pink-500',
            trend: '+2'
          },
          {
            label: 'متوسط الصلاحيات',
            value: stats.avgPermissions,
            icon: Zap,
            color: 'from-orange-500 to-red-500',
            trend: '+3%'
          },
          {
            label: 'QR مُفعّل',
            value: stats.qrEnabled,
            icon: QrCode,
            color: 'from-indigo-500 to-blue-500',
            trend: `+${stats.qrEnabled}`
          },
          {
            label: 'نشاط حديث',
            value: stats.recentAccessLogs,
            icon: Clock,
            color: 'from-pink-500 to-rose-500',
            trend: '24 ساعة'
          }
        ].map((stat, index) => (
          <div
            key={index}
            className="group relative overflow-hidden rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-6 hover:bg-white/10 transition-all duration-300 hover:scale-105 cursor-pointer"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-10 transition-opacity`}></div>

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                  <ArrowUpRight className="w-3 h-3" />
                  {stat.trend}
                </span>
              </div>

              <div className="text-3xl font-black text-white mb-1">{stat.value}</div>
              <div className="text-sm text-gray-400">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 p-6 text-right ${
              activeSection === section.id
                ? 'bg-gradient-to-br from-white/20 to-white/10 border-white/30 scale-105 shadow-2xl'
                : 'bg-white/5 border-white/10 hover:bg-white/10 hover:scale-102'
            }`}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${section.color} opacity-0 group-hover:opacity-10 transition-opacity`}></div>

            <div className="relative z-10">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${section.color} flex items-center justify-center shadow-lg ${
                  activeSection === section.id ? 'scale-110' : ''
                } transition-transform`}>
                  <section.icon className="w-7 h-7 text-white" />
                </div>

                {activeSection === section.id && (
                  <div className="flex items-center gap-1 text-white">
                    <ChevronRight className="w-5 h-5 animate-pulse" />
                  </div>
                )}
              </div>

              <h3 className="text-white font-bold text-lg mb-2">{section.title}</h3>
              <p className="text-gray-400 text-sm mb-4">{section.description}</p>

              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-white">{section.stat}</span>
                <span className="text-gray-400 text-xs">{section.label}</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 overflow-hidden">
        {activeSection === 'staff' && (
          <div className="p-8 space-y-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-black text-white mb-1">إدارة الموظفين</h3>
                <p className="text-gray-400">عرض وإدارة جميع الموظفين في المنصة</p>
              </div>
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  <Grid className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  <List className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex-1 min-w-[300px] relative">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="بحث بالاسم، الجوال، أو البريد..."
                  className="w-full pr-12 pl-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <select
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">كل الأقسام</option>
                <option value="b2b">المزادات (B2B)</option>
                <option value="b2f">استثمار المزارع (B2F)</option>
                <option value="hq">الإدارة العليا (HQ)</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">كل الحالات</option>
                <option value="active">نشط فقط</option>
                <option value="inactive">معطل فقط</option>
              </select>

              <button className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/50">
                <UserPlus className="w-5 h-5" />
                إضافة موظف
              </button>
            </div>

            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-6">
                {filteredStaff.map((member) => {
                  const roleInfo = getRoleBadge(member.role);
                  const RoleIcon = roleInfo.icon;

                  return (
                    <div
                      key={member.id}
                      className="group relative overflow-hidden rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300 hover:scale-105 cursor-pointer"
                    >
                      <div className={`absolute inset-0 bg-gradient-to-br ${getDepartmentColor(member.department)} opacity-0 group-hover:opacity-10 transition-opacity`}></div>

                      <div className="relative z-10 p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${getDepartmentColor(member.department)} flex items-center justify-center shadow-lg`}>
                            <RoleIcon className="w-8 h-8 text-white" />
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            {member.is_active ? (
                              <div className="flex items-center gap-1 px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-bold">
                                <Check className="w-3 h-3" />
                                نشط
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-bold">
                                <X className="w-3 h-3" />
                                معطل
                              </div>
                            )}

                            {member.qr_code && (
                              <div className="flex items-center gap-1 px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-bold">
                                <QrCode className="w-3 h-3" />
                                QR
                              </div>
                            )}
                          </div>
                        </div>

                        <h3 className="text-xl font-black text-white mb-2">{member.full_name}</h3>

                        <div className="space-y-2 mb-4">
                          <div className="flex items-center gap-2 text-sm text-gray-400">
                            <Phone className="w-4 h-4" />
                            {member.phone_number}
                          </div>
                          {member.email && (
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                              <Mail className="w-4 h-4" />
                              {member.email}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mb-4">
                          <span className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold bg-gradient-to-r ${getDepartmentColor(member.department)} text-white text-center`}>
                            {member.department.toUpperCase()}
                          </span>
                          <span className="flex-1 px-3 py-2 rounded-lg text-xs font-bold bg-white/10 text-gray-300 text-center">
                            {roleInfo.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleStaffStatus(member.id, member.is_active)}
                            className={`flex-1 px-4 py-2 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                              member.is_active
                                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                                : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                            }`}
                          >
                            {member.is_active ? (
                              <>
                                <PowerOff className="w-4 h-4" />
                                تعطيل
                              </>
                            ) : (
                              <>
                                <Power className="w-4 h-4" />
                                تفعيل
                              </>
                            )}
                          </button>

                          <button className="p-2 rounded-xl bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-all">
                            <Eye className="w-5 h-5" />
                          </button>

                          <button className="p-2 rounded-xl bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-all">
                            <Edit3 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <StaffManagementSection onStaffUpdated={loadStats} />
            )}

            {filteredStaff.length === 0 && viewMode === 'grid' && (
              <div className="text-center py-12">
                <div className="w-20 h-20 rounded-full bg-gray-500/10 flex items-center justify-center mx-auto mb-4">
                  <Users className="w-10 h-10 text-gray-400" />
                </div>
                <p className="text-xl font-bold text-gray-400 mb-2">لا توجد نتائج</p>
                <p className="text-gray-500">جرب تغيير معايير البحث أو الفلترة</p>
              </div>
            )}
          </div>
        )}

        {activeSection === 'qr' && <QRManagementSection onQRUpdated={loadStats} />}
        {activeSection === 'sessions' && <SessionManagementSection />}
        {activeSection === 'audit' && <AccessAuditSection />}

        {activeSection === 'permissions' && (
          <div className="p-12 text-center">
            <Lock className="w-16 h-16 mx-auto mb-4 text-emerald-400" />
            <h3 className="text-2xl font-bold text-white mb-2">إدارة الصلاحيات</h3>
            <p className="text-gray-400">قريباً: تخصيص الصلاحيات مع واجهة Drag & Drop</p>
          </div>
        )}

        {activeSection === 'analytics' && (
          <div className="p-12 text-center">
            <BarChart3 className="w-16 h-16 mx-auto mb-4 text-orange-400" />
            <h3 className="text-2xl font-bold text-white mb-2">التحليلات المتقدمة</h3>
            <p className="text-gray-400">قريباً: رسوم بيانية تفاعلية ورؤى عميقة</p>
          </div>
        )}
      </div>

      <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-teal-600/10 border border-emerald-500/20">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-emerald-400" />
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
