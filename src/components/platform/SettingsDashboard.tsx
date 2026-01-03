import { ArrowRight, Settings, Database, Bell, Shield, Palette, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function SettingsDashboard() {
  const navigate = useNavigate();

  const settingsSections = [
    {
      title: 'إعدادات النظام',
      icon: Settings,
      color: 'from-blue-500 to-blue-600',
      description: 'إعدادات عامة للمنصة',
    },
    {
      title: 'قاعدة البيانات',
      icon: Database,
      color: 'from-emerald-500 to-emerald-600',
      description: 'إدارة قواعد البيانات والنسخ الاحتياطي',
    },
    {
      title: 'الإشعارات',
      icon: Bell,
      color: 'from-orange-500 to-orange-600',
      description: 'إعدادات الإشعارات والتنبيهات',
    },
    {
      title: 'الأمان',
      icon: Shield,
      color: 'from-red-500 to-red-600',
      description: 'إعدادات الأمان والصلاحيات',
    },
    {
      title: 'المظهر',
      icon: Palette,
      color: 'from-purple-500 to-purple-600',
      description: 'تخصيص مظهر المنصة',
    },
    {
      title: 'اللغة والمنطقة',
      icon: Globe,
      color: 'from-teal-500 to-teal-600',
      description: 'إعدادات اللغة والمنطقة الزمنية',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg">
                  <Settings className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white">
                    الإعدادات المتقدمة
                  </h1>
                  <p className="text-gray-400 text-sm mt-1">
                    إدارة إعدادات المنصة المتقدمة
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate('/hq', { replace: true })}
              className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all border border-slate-600"
            >
              <ArrowRight className="w-5 h-5" />
              <span>العودة للوحة الرئيسية</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {settingsSections.map((section, index) => (
            <div
              key={index}
              className="group relative overflow-hidden rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-6 hover:bg-white/10 transition-all duration-300 cursor-pointer"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${section.color} opacity-0 group-hover:opacity-10 transition-opacity`}></div>

              <div className="relative">
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${section.color} flex items-center justify-center mb-4 shadow-lg`}>
                  <section.icon className="w-7 h-7 text-white" />
                </div>

                <h3 className="text-white font-bold text-lg mb-2">{section.title}</h3>
                <p className="text-gray-400 text-sm">{section.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="p-8 rounded-2xl bg-gradient-to-r from-orange-500/10 to-orange-600/10 border border-orange-500/20 text-center">
          <Settings className="w-16 h-16 text-orange-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">الإعدادات المتقدمة</h2>
          <p className="text-gray-400">
            تحكم كامل في جميع إعدادات المنصة
          </p>
        </div>
      </div>
    </div>
  );
}
