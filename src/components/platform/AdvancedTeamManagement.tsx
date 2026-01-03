import { useState, useEffect } from 'react';
import {
  Users,
  Shield,
  UserPlus,
  Search,
  Filter,
  Grid,
  List,
  Phone,
  Mail,
  Power,
  PowerOff,
  Eye,
  Edit3,
  Trash2,
  Check,
  X,
  QrCode,
  Lock,
  Activity,
  Settings,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  ArrowUpRight,
  Zap,
  Target,
  Award,
  Star,
  Clock,
  Download,
  Upload
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

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

interface RolePermissions {
  role_key: string;
  role_name_ar: string;
  permissions_count: number;
  active_users: number;
  hierarchy_level: number;
}

type ViewMode = 'grid' | 'list' | 'org-chart';
type ActivePanel = 'staff' | 'roles' | 'permissions' | 'analytics';

export default function AdvancedTeamManagement() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [roles, setRoles] = useState<RolePermissions[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [activePanel, setActivePanel] = useState<ActivePanel>('staff');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalStaff: 0,
    activeStaff: 0,
    totalRoles: 0,
    avgPermissions: 0,
    qrEnabled: 0,
    recentActivity: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadStaff(), loadRoles(), loadStats()]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStaff = async () => {
    const { data, error } = await supabase
      .from('platform_staff')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setStaff(data);
    }
  };

  const loadRoles = async () => {
    const { data, error } = await supabase
      .from('role_definitions')
      .select('*')
      .eq('is_active', true)
      .order('hierarchy_level');

    if (!error && data) {
      const rolesWithCounts: RolePermissions[] = data.map(role => ({
        role_key: role.role_key,
        role_name_ar: role.role_name_ar,
        permissions_count: 0,
        active_users: staff.filter(s => s.role === role.role_key && s.is_active).length,
        hierarchy_level: role.hierarchy_level
      }));
      setRoles(rolesWithCounts);
    }
  };

  const loadStats = async () => {
    const activeStaffCount = staff.filter(s => s.is_active).length;
    const qrEnabledCount = staff.filter(s => s.qr_code).length;

    setStats({
      totalStaff: staff.length,
      activeStaff: activeStaffCount,
      totalRoles: roles.length,
      avgPermissions: 8,
      qrEnabled: qrEnabledCount,
      recentActivity: 24
    });
  };

  const filteredStaff = staff.filter(member => {
    const matchesSearch =
      member.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.phone_number.includes(searchTerm) ||
      (member.email && member.email.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesDepartment = filterDepartment === 'all' || member.department === filterDepartment;
    const matchesRole = filterRole === 'all' || member.role === filterRole;
    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'active' && member.is_active) ||
      (filterStatus === 'inactive' && !member.is_active);

    return matchesSearch && matchesDepartment && matchesRole && matchesStatus;
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-ping opacity-20"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse"></div>
            <RefreshCw className="w-20 h-20 text-white animate-spin relative z-10" />
          </div>
          <p className="text-white text-xl font-bold">جاري التحميل...</p>
          <p className="text-gray-400 mt-2">نقوم بتحميل بيانات الفريق والصلاحيات</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8" dir="rtl">
      <div className="max-w-[1920px] mx-auto space-y-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20 backdrop-blur-xl border border-white/10 p-8">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDUpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30"></div>

          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl blur-xl opacity-50 animate-pulse"></div>
                <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-2xl">
                  <Shield className="w-10 h-10 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-4xl font-black text-white mb-2 tracking-tight">
                  مركز القيادة المتقدم
                </h1>
                <p className="text-lg text-blue-200">
                  إدارة شاملة للفريق، الأدوار، والصلاحيات مع تحليلات فورية
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={loadData}
                className="px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white rounded-xl font-bold transition-all flex items-center gap-2 border border-white/20"
              >
                <RefreshCw className="w-5 h-5" />
                تحديث
              </button>
              <button className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg shadow-blue-500/50">
                <Download className="w-5 h-5" />
                تصدير
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {[
            {
              label: 'إجمالي الموظفين',
              value: stats.totalStaff,
              icon: Users,
              color: 'from-blue-500 to-cyan-500',
              trend: '+12%',
              bgPattern: 'opacity-10'
            },
            {
              label: 'موظف نشط',
              value: stats.activeStaff,
              icon: Activity,
              color: 'from-emerald-500 to-teal-500',
              trend: '+8%',
              bgPattern: 'opacity-10'
            },
            {
              label: 'الأدوار المُعرفة',
              value: stats.totalRoles,
              icon: Shield,
              color: 'from-purple-500 to-pink-500',
              trend: '+2',
              bgPattern: 'opacity-10'
            },
            {
              label: 'متوسط الصلاحيات',
              value: stats.avgPermissions,
              icon: Zap,
              color: 'from-orange-500 to-red-500',
              trend: '+3%',
              bgPattern: 'opacity-10'
            },
            {
              label: 'QR مُفعّل',
              value: stats.qrEnabled,
              icon: QrCode,
              color: 'from-indigo-500 to-blue-500',
              trend: '+15',
              bgPattern: 'opacity-10'
            },
            {
              label: 'نشاط حديث',
              value: stats.recentActivity,
              icon: Clock,
              color: 'from-pink-500 to-rose-500',
              trend: '24 ساعة',
              bgPattern: 'opacity-10'
            }
          ].map((stat, index) => (
            <div
              key={index}
              className="group relative overflow-hidden rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-6 hover:bg-white/10 transition-all duration-300 hover:scale-105 cursor-pointer"
            >
              <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-10 transition-opacity" style={{ backgroundImage: `linear-gradient(to bottom right, ${stat.color})` }}></div>

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

        <div className="flex items-center gap-3 flex-wrap">
          {[
            { id: 'staff', label: 'الموظفين', icon: Users, color: 'blue' },
            { id: 'roles', label: 'الأدوار', icon: Shield, color: 'purple' },
            { id: 'permissions', label: 'الصلاحيات', icon: Lock, color: 'emerald' },
            { id: 'analytics', label: 'التحليلات', icon: TrendingUp, color: 'orange' }
          ].map((panel) => (
            <button
              key={panel.id}
              onClick={() => setActivePanel(panel.id as ActivePanel)}
              className={`relative px-6 py-3 rounded-xl font-bold transition-all duration-300 flex items-center gap-2 ${
                activePanel === panel.id
                  ? `bg-gradient-to-r from-${panel.color}-500 to-${panel.color}-600 text-white shadow-lg shadow-${panel.color}-500/50`
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              <panel.icon className="w-5 h-5" />
              {panel.label}
              {activePanel === panel.id && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rounded-full"></div>
              )}
            </button>
          ))}
        </div>

        {activePanel === 'staff' && (
          <div className="space-y-6">
            <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-6">
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

                <div className="flex items-center gap-3">
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

                  <button className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/50">
                    <UserPlus className="w-5 h-5" />
                    إضافة موظف
                  </button>
                </div>
              </div>
            </div>

            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
              <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-right p-4 text-sm font-bold text-gray-400">الموظف</th>
                        <th className="text-right p-4 text-sm font-bold text-gray-400">التواصل</th>
                        <th className="text-right p-4 text-sm font-bold text-gray-400">القسم</th>
                        <th className="text-right p-4 text-sm font-bold text-gray-400">الدور</th>
                        <th className="text-right p-4 text-sm font-bold text-gray-400">الحالة</th>
                        <th className="text-right p-4 text-sm font-bold text-gray-400">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStaff.map((member) => {
                        const roleInfo = getRoleBadge(member.role);
                        const RoleIcon = roleInfo.icon;

                        return (
                          <tr key={member.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getDepartmentColor(member.department)} flex items-center justify-center`}>
                                  <RoleIcon className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                  <div className="text-white font-bold">{member.full_name}</div>
                                  {member.qr_code && (
                                    <div className="flex items-center gap-1 text-xs text-blue-400">
                                      <QrCode className="w-3 h-3" />
                                      QR مُفعّل
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="space-y-1">
                                <div className="text-sm text-gray-400">{member.phone_number}</div>
                                {member.email && <div className="text-xs text-gray-500">{member.email}</div>}
                              </div>
                            </td>
                            <td className="p-4">
                              <span className={`px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r ${getDepartmentColor(member.department)} text-white`}>
                                {member.department.toUpperCase()}
                              </span>
                            </td>
                            <td className="p-4">
                              <span className="text-white text-sm">{roleInfo.name}</span>
                            </td>
                            <td className="p-4">
                              {member.is_active ? (
                                <div className="flex items-center gap-2 text-emerald-400">
                                  <Check className="w-4 h-4" />
                                  <span className="text-sm font-bold">نشط</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 text-red-400">
                                  <X className="w-4 h-4" />
                                  <span className="text-sm font-bold">معطل</span>
                                </div>
                              )}
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => toggleStaffStatus(member.id, member.is_active)}
                                  className={`p-2 rounded-lg transition-all ${
                                    member.is_active
                                      ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                                      : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                                  }`}
                                >
                                  {member.is_active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                                </button>
                                <button className="p-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-all">
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button className="p-2 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-all">
                                  <Edit3 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {filteredStaff.length === 0 && (
              <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-12 text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-500/10 flex items-center justify-center">
                  <Users className="w-10 h-10 text-gray-400" />
                </div>
                <p className="text-xl font-bold text-gray-400 mb-2">لا توجد نتائج</p>
                <p className="text-gray-500">جرب تغيير معايير البحث أو الفلترة</p>
              </div>
            )}
          </div>
        )}

        {activePanel === 'roles' && (
          <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-8">
            <div className="text-center py-12">
              <Shield className="w-16 h-16 mx-auto mb-4 text-purple-400" />
              <h3 className="text-2xl font-bold text-white mb-2">إدارة الأدوار</h3>
              <p className="text-gray-400">قريباً: إدارة متقدمة للأدوار والمستويات الهرمية</p>
            </div>
          </div>
        )}

        {activePanel === 'permissions' && (
          <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-8">
            <div className="text-center py-12">
              <Lock className="w-16 h-16 mx-auto mb-4 text-emerald-400" />
              <h3 className="text-2xl font-bold text-white mb-2">إدارة الصلاحيات</h3>
              <p className="text-gray-400">قريباً: تخصيص الصلاحيات مع واجهة Drag & Drop</p>
            </div>
          </div>
        )}

        {activePanel === 'analytics' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-6">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-orange-400" />
                نشاط الفريق
              </h3>
              <div className="h-64 flex items-center justify-center text-gray-400">
                رسم بياني للنشاط
              </div>
            </div>

            <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-6">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Activity className="w-6 h-6 text-blue-400" />
                توزيع الأقسام
              </h3>
              <div className="h-64 flex items-center justify-center text-gray-400">
                رسم دائري للتوزيع
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
