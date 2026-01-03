import { useState, useEffect } from 'react';
import { Shield, Store, Sprout, X, ArrowRight, Crown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import B2FControlPanel from './B2F/B2FControlPanel';
import { EnhancedAuctionsManagement } from './EnhancedAuctionsManagement';
import PlatformCommandCenter from './platform/PlatformCommandCenter';

type DashboardSection = 'main' | 'auctions' | 'b2f' | 'platform';

interface UserPermissions {
  isPlatformAdmin: boolean;
  hasB2BAccess: boolean;
  hasB2FAccess: boolean;
}

export function AdminDashboard() {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState<DashboardSection>('main');
  const [permissions, setPermissions] = useState<UserPermissions>({
    isPlatformAdmin: false,
    hasB2BAccess: false,
    hasB2FAccess: false
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchPermissions = async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_platform_admin, role')
        .eq('id', user.id)
        .maybeSingle();

      if (profile) {
        const isPlatformAdmin = profile.is_platform_admin || false;
        const hasB2BAccess = isPlatformAdmin || profile.role === 'b2b_admin';
        const hasB2FAccess = isPlatformAdmin || profile.role === 'b2f_admin';

        setPermissions({
          isPlatformAdmin,
          hasB2BAccess,
          hasB2FAccess
        });

        const accessibleSections = [];
        if (hasB2BAccess) accessibleSections.push('auctions');
        if (hasB2FAccess) accessibleSections.push('b2f');

        if (accessibleSections.length === 1 && !isPlatformAdmin) {
          setActiveSection(accessibleSections[0] as DashboardSection);
        }
      }
      setLoading(false);
    };

    fetchPermissions();
  }, [user]);

  if (activeSection === 'platform') {
    return (
      <PlatformCommandCenter
        onClose={() => setActiveSection('main')}
        onNavigateToB2F={() => setActiveSection('b2f')}
        onNavigateToAuctions={() => setActiveSection('auctions')}
      />
    );
  }

  if (activeSection === 'b2f') {
    return <B2FControlPanel onClose={() => setActiveSection('main')} />;
  }

  if (activeSection === 'auctions') {
    return <EnhancedAuctionsManagement onClose={() => setActiveSection('main')} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br from-slate-700 to-gray-900 flex items-center justify-center animate-pulse">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100" dir="rtl">
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="absolute top-10 right-10 w-72 h-72 bg-orange-500 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-emerald-500 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="relative z-10 p-4 md:p-8 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-slate-700 to-gray-900 flex items-center justify-center shadow-2xl">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-3">
            نقطة الدخول الرئيسية
          </h1>
          <p className="text-gray-600 text-lg">
            اختر الوجهة المناسبة
          </p>
        </div>

        {/* بوابة قيادة المنصة - الإدارة العليا */}
        {permissions.isPlatformAdmin && (
        <div className="mb-12">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Crown className="w-6 h-6 text-slate-700" />
            بوابة قيادة المنصة (الإدارة العليا)
          </h2>
          <button
            onClick={() => setActiveSection('platform')}
            className="group w-full relative bg-gradient-to-br from-slate-700 via-gray-800 to-slate-900 text-white rounded-3xl p-8 shadow-2xl hover:shadow-3xl transition-all duration-300 overflow-hidden hover:scale-[1.02] active:scale-[0.98] text-right"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

            <div className="relative">
              <div className="flex items-start gap-6">
                <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                  <Crown className="w-10 h-10 text-orange-400" />
                </div>

                <div className="flex-1">
                  <h3 className="text-2xl font-black mb-3">
                    بوابة قيادة المنصة
                  </h3>

                  <p className="text-slate-200 leading-relaxed mb-6 text-base">
                    لوحة الإدارة العليا - رؤية شاملة وإشراف على جميع الأقسام + إدارة الصلاحيات
                  </p>

                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-white/10 rounded-lg p-3 backdrop-blur">
                      <div className="text-white/80 text-xs mb-1">مؤشرات الأداء</div>
                      <div className="text-white text-sm font-bold">KPI Dashboard</div>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3 backdrop-blur">
                      <div className="text-white/80 text-xs mb-1">إدارة الصلاحيات</div>
                      <div className="text-white text-sm font-bold">Permissions</div>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3 backdrop-blur">
                      <div className="text-white/80 text-xs mb-1">تقارير التوثيق</div>
                      <div className="text-white text-sm font-bold">Reports</div>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3 backdrop-blur">
                      <div className="text-white/80 text-xs mb-1">التنبيهات الحرجة</div>
                      <div className="text-white text-sm font-bold">Alerts</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-orange-300 font-bold group-hover:gap-3 transition-all">
                    <span>دخول الإدارة العليا</span>
                    <ArrowRight className="w-5 h-5" />
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-10 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-all duration-1000"></div>
          </button>
        </div>
        )}

        {/* الأقسام التنفيذية */}
        {(permissions.hasB2BAccess || permissions.hasB2FAccess) && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">الأقسام التنفيذية</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* مزاد الشركات */}
            {permissions.hasB2BAccess && (
            <button
              onClick={() => setActiveSection('auctions')}
              className="group relative bg-white rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 border-2 border-gray-100 overflow-hidden hover:scale-[1.02] active:scale-[0.98] text-right"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-red-600 opacity-0 group-hover:opacity-5 transition-opacity duration-300"></div>

              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 mb-5">
                  <Store className="w-8 h-8 text-white" />
                </div>

                <h2 className="text-2xl font-black text-gray-900 mb-3">
                  مزاد الشركات (B2B)
                </h2>

                <p className="text-gray-600 leading-relaxed mb-6 text-base">
                  إدارة المزادات والإعلانات والخطط والاشتراكات والإحصائيات الكاملة
                </p>

                <div className="space-y-2 mb-6">
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div>
                    <span>إدارة المزادات والإعلانات</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div>
                    <span>إدارة الخطط والاشتراكات</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div>
                    <span>التقارير والإحصائيات</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-orange-600 font-bold group-hover:gap-3 transition-all">
                  <span>الدخول إلى لوحة التحكم</span>
                  <ArrowRight className="w-5 h-5" />
                </div>
              </div>

              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-all duration-1000"></div>
            </button>
            )}

            {/* استثمار أشجار المزارع */}
            {permissions.hasB2FAccess && (
            <button
              onClick={() => setActiveSection('b2f')}
              className="group relative bg-white rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 border-2 border-gray-100 overflow-hidden hover:scale-[1.02] active:scale-[0.98] text-right"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-600 opacity-0 group-hover:opacity-5 transition-opacity duration-300"></div>

              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 mb-5">
                  <Sprout className="w-8 h-8 text-white" />
                </div>

                <h2 className="text-2xl font-black text-gray-900 mb-3">
                  استثمار أشجار المزارع (B2F)
                </h2>

                <p className="text-gray-600 leading-relaxed mb-6 text-base">
                  إدارة المزارع والعروض الاستثمارية والطلبات والعمليات التشغيلية
                </p>

                <div className="space-y-2 mb-6">
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                    <span>إدارة العروض الاستثمارية</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                    <span>معالجة طلبات الاستثمار</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                    <span>التشغيل والمتابعة</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-emerald-600 font-bold group-hover:gap-3 transition-all">
                  <span>الدخول إلى لوحة التحكم</span>
                  <ArrowRight className="w-5 h-5" />
                </div>
              </div>

              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-all duration-1000"></div>
            </button>
            )}
          </div>
        </div>
        )}

        {permissions.isPlatformAdmin && (
        <div className="mt-8 bg-gradient-to-br from-blue-50 via-slate-50 to-gray-50 rounded-2xl p-6 border border-gray-200 shadow-lg">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-700 to-gray-800 flex items-center justify-center flex-shrink-0 shadow-lg">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                نظام إدارة متكامل
              </h3>
              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-slate-600 mt-1.5 flex-shrink-0"></div>
                  <p><strong>بوابة قيادة المنصة:</strong> للإدارة العليا - رؤية شاملة وإشراف</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-orange-500 mt-1.5 flex-shrink-0"></div>
                  <p><strong>مزاد الشركات:</strong> إدارة تنفيذية كاملة للمزادات</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0"></div>
                  <p><strong>استثمار الأشجار:</strong> إدارة تنفيذية كاملة للمزارع</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
