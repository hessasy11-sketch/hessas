import { useNavigate } from 'react-router-dom';
import { Building2, Leaf, Calculator, TrendingUp, Users, ArrowRight } from 'lucide-react';
import HQFarmCommandCard from './HQFarmCommandCard';
import ExecutiveOpsRoomCard from './ExecutiveOpsRoomCard';

interface DepartmentCard {
  id: string;
  title: string;
  description: string;
  path: string;
  icon: typeof Building2;
  color: string;
  gradient: string;
}

const departments: DepartmentCard[] = [
  {
    id: 'b2b',
    title: 'مزاد الشركات',
    description: 'إدارة المزادات التجارية للشركات والمؤسسات ومتابعة النشاط العام.',
    path: '/hq/b2b',
    icon: Building2,
    color: 'from-blue-500 to-blue-600',
    gradient: 'bg-gradient-to-br from-blue-50 to-blue-100',
  },
  {
    id: 'b2f',
    title: 'استثمار أشجار المزارع',
    description: 'إدارة الاستثمار الزراعي وربط الإدارة بالمزارع والفرق التشغيلية.',
    path: '/hq/b2f',
    icon: Leaf,
    color: 'from-green-500 to-green-600',
    gradient: 'bg-gradient-to-br from-green-50 to-green-100',
  },
  {
    id: 'finance',
    title: 'المحاسبة',
    description: 'متابعة الإيرادات والمصروفات والتقارير المالية للمنصة.',
    path: '/hq/finance',
    icon: Calculator,
    color: 'from-yellow-500 to-yellow-600',
    gradient: 'bg-gradient-to-br from-yellow-50 to-yellow-100',
  },
  {
    id: 'marketing',
    title: 'التسويق',
    description: 'إدارة الحملات والقنوات التسويقية وقياس الأداء.',
    path: '/hq/marketing',
    icon: TrendingUp,
    color: 'from-purple-500 to-purple-600',
    gradient: 'bg-gradient-to-br from-purple-50 to-purple-100',
  },
  {
    id: 'partners',
    title: 'الشركاء',
    description: 'إدارة شركاء المنصة وتوزيع الأرباح وربطهم بالمزارع.',
    path: '/hq/partners',
    icon: Users,
    color: 'from-orange-500 to-orange-600',
    gradient: 'bg-gradient-to-br from-orange-50 to-orange-100',
  },
];

export default function HQDashboard() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full mb-6 shadow-lg">
            <span className="text-4xl">👑</span>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            لوحة الإدارة العليا
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            مركز القيادة لمتابعة أقسام المنصة واتخاذ القرارات الإدارية.
          </p>
        </div>

        {/* Executive Operations Room - Top Priority */}
        <div className="mb-8">
          <ExecutiveOpsRoomCard />
        </div>

        {/* Farm Command Card - Featured */}
        <div className="mb-8">
          <HQFarmCommandCard />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {departments.map((dept) => {
            const Icon = dept.icon;
            return (
              <button
                key={dept.id}
                onClick={() => navigate(dept.path)}
                className={`${dept.gradient} rounded-2xl p-8 text-right transition-all duration-300 hover:shadow-xl hover:scale-105 border border-gray-200/50 group relative overflow-hidden`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                <div className="relative">
                  <div className={`inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br ${dept.color} rounded-xl mb-6 shadow-lg group-hover:shadow-xl transition-shadow duration-300`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>

                  <h3 className="text-2xl font-bold text-gray-900 mb-3 flex items-center justify-between">
                    {dept.title}
                    <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all duration-300" />
                  </h3>

                  <p className="text-gray-600 leading-relaxed">
                    {dept.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-gray-700 rounded-xl hover:bg-gray-50 transition-colors shadow-sm border border-gray-200"
          >
            <ArrowRight className="w-5 h-5 rotate-180" />
            العودة للصفحة الرئيسية
          </button>
        </div>
      </div>
    </div>
  );
}
