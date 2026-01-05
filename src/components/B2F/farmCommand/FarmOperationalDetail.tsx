import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  LayoutDashboard,
  Package,
  Users,
  Wrench,
  Cog,
  Factory,
  Calculator,
  Clock,
  Plus,
  MapPin,
  Activity,
  Loader2
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';

type TabId = 'command' | 'contents' | 'teams' | 'technicians' | 'equipment' | 'facilities' | 'finance' | 'events';

interface Tab {
  id: TabId;
  label: string;
  icon: typeof LayoutDashboard;
  description: string;
}

const tabs: Tab[] = [
  {
    id: 'command',
    label: 'القيادة',
    icon: LayoutDashboard,
    description: 'ملخص المهام والأعطال والمعدات والمالية'
  },
  {
    id: 'contents',
    label: 'المحتويات',
    icon: Package,
    description: 'الأشجار والمحاصيل والأعداد'
  },
  {
    id: 'teams',
    label: 'الفِرق',
    icon: Users,
    description: 'بناء الفرق وإدارة الأعضاء'
  },
  {
    id: 'technicians',
    label: 'الفنيين',
    icon: Wrench,
    description: 'البلاغات والإسناد والمتابعة'
  },
  {
    id: 'equipment',
    label: 'المعدات',
    icon: Cog,
    description: 'سجل الأصول والصيانة'
  },
  {
    id: 'facilities',
    label: 'المنشآت',
    icon: Factory,
    description: 'المصانع والمستودعات'
  },
  {
    id: 'finance',
    label: 'الحاسبة المالية',
    icon: Calculator,
    description: 'الدخل والمصروف والملخص الشهري'
  },
  {
    id: 'events',
    label: 'سجل الأحداث',
    icon: Clock,
    description: 'Timeline لكل ما يحدث في المزرعة'
  }
];

interface OperationalFarm {
  id: string;
  operational_name: string;
  operational_status: string;
  farm_manager_id: string | null;
  current_occupancy: number;
  total_capacity: number;
  manager: {
    name_ar: string;
  } | null;
  reference_farm: {
    name: string;
    location: string;
    city: string;
  };
}

export default function FarmOperationalDetail() {
  const { farmId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>('command');
  const [farm, setFarm] = useState<OperationalFarm | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (farmId) {
      loadFarm();
    }
  }, [farmId]);

  const loadFarm = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('fc_operational_farms')
        .select(`
          *,
          manager:platform_staff!farm_manager_id(name_ar),
          reference_farm:b2f_farms!reference_farm_id(name, location, city)
        `)
        .eq('id', farmId)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        navigate('/admin/b2f/farm-command');
        return;
      }

      setFarm(data);
    } catch (error) {
      console.error('Error loading farm:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!farm) {
    return null;
  }

  const currentTab = tabs.find(t => t.id === activeTab);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100" dir="rtl">
      {/* Header ثابت */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <button
            onClick={() => navigate('/admin/b2f/farm-command')}
            className="inline-flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 transition-colors mb-4"
          >
            <ArrowRight className="w-4 h-4 rotate-180" />
            العودة لقائمة المزارع
          </button>

          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
                <MapPin className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-gray-900">
                  {farm.operational_name}
                </h1>
                <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                  <span>{farm.reference_farm?.name}</span>
                  <span>•</span>
                  <span>{farm.reference_farm?.city}</span>
                  {farm.manager && (
                    <>
                      <span>•</span>
                      <span>المدير: {farm.manager.name_ar}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <Plus className="w-5 h-5 text-gray-700" />
              </button>
              <button className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <Activity className="w-5 h-5 text-gray-700" />
              </button>
            </div>
          </div>
        </div>

        {/* التبويبات */}
        <div className="max-w-7xl mx-auto px-4 overflow-x-auto">
          <div className="flex gap-2 pb-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* المحتوى */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          {currentTab && (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-100 rounded-full mb-6">
                <currentTab.icon className="w-10 h-10 text-emerald-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                {currentTab.label}
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                {currentTab.description}
              </p>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm">
                <Package className="w-4 h-4" />
                <span>قيد التطوير - سيتم إضافة الوظائف قريباً</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
