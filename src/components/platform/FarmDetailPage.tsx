import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, LayoutDashboard, Users, Cog, DollarSign, TrendingUp, FileText, Package } from 'lucide-react';

type Tab = 'overview' | 'team' | 'operations' | 'investment' | 'finance' | 'reports';

interface TabConfig {
  id: Tab;
  label: string;
  icon: typeof LayoutDashboard;
  description: string;
}

const tabs: TabConfig[] = [
  {
    id: 'overview',
    label: 'نظرة عامة',
    icon: LayoutDashboard,
    description: 'ملخص حالة المزرعة والمؤشرات الأساسية.',
  },
  {
    id: 'team',
    label: 'فريق المزرعة',
    icon: Users,
    description: 'إدارة مدير المزرعة والمهندسين والمشرفين والعمال.',
  },
  {
    id: 'operations',
    label: 'التشغيل',
    icon: Cog,
    description: 'متابعة الأعمال اليومية والمهام (يُفعل لاحقًا).',
  },
  {
    id: 'investment',
    label: 'الاستثمار',
    icon: TrendingUp,
    description: 'إدارة المستثمرين والعقود المرتبطة بالمزرعة.',
  },
  {
    id: 'finance',
    label: 'المالية',
    icon: DollarSign,
    description: 'مصروفات المزرعة وإيراداتها ورسوم الصيانة.',
  },
  {
    id: 'reports',
    label: 'التقارير',
    icon: FileText,
    description: 'تقارير تشغيلية واستثمارية قابلة للمراجعة.',
  },
];

export default function FarmDetailPage() {
  const { farmId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const currentTab = tabs.find(t => t.id === activeTab);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <button
          onClick={() => navigate('/hq/b2f')}
          className="inline-flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors mb-8"
        >
          <ArrowRight className="w-5 h-5 rotate-180" />
          العودة للمزارع
        </button>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 mb-8">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-2xl">🌳</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                مزرعة الخير
              </h1>
              <p className="text-gray-600">
                الرياض • مدير المزرعة: أحمد محمد
              </p>
            </div>
          </div>
          <p className="text-gray-600 mt-4">
            مركز إدارة المزرعة وتشغيلها واستثمارها.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-200 overflow-x-auto">
            <div className="flex gap-2 p-2 min-w-max">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-200 whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'bg-green-100 text-green-700 shadow-sm'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-12">
            {currentTab && (
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
                  <currentTab.icon className="w-10 h-10 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  {currentTab.label}
                </h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  {currentTab.description}
                </p>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg text-sm">
                  <Package className="w-4 h-4" />
                  <span>Skeleton فقط – التطوير لاحقًا</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
