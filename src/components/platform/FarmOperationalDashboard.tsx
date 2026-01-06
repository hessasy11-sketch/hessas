import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  LayoutDashboard, Users, CheckSquare, Wrench,
  Truck, Factory, Calculator, TreePine, AlertCircle, Calendar
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import FarmSummaryTab from './farmDashboard/FarmSummaryTab';
import FarmTeamTab from './farmDashboard/FarmTeamTab';
import FarmTasksTab from './farmDashboard/FarmTasksTab';
import FarmMaintenanceTab from './farmDashboard/FarmMaintenanceTab';
import FarmAssetsTab from './farmDashboard/FarmAssetsTab';
import FarmFactoryTab from './farmDashboard/FarmFactoryTab';
import FarmFinanceTab from './farmDashboard/FarmFinanceTab';
import FarmInventoryTab from './farmDashboard/FarmInventoryTab';

interface FarmDashboardData {
  farm: {
    id: string;
    name: string;
    code: string;
    location: string;
    operational_status: string;
    investment_type: string;
    has_factory: boolean;
  };
  manager?: {
    id: string;
    name: string;
    phone: string;
  };
  tasks: {
    total: number;
    open: number;
    urgent: number;
    completed_this_month: number;
  };
  financial: {
    expenses_this_month: number;
    expenses_pending_approval: number;
    total_expenses: number;
  };
  team_count: number;
}

type TabKey = 'summary' | 'team' | 'tasks' | 'maintenance' | 'assets' | 'factory' | 'finance' | 'inventory';

const FarmOperationalDashboard = () => {
  const { farmId } = useParams<{ farmId: string }>();
  const [activeTab, setActiveTab] = useState<TabKey>('summary');
  const [dashboardData, setDashboardData] = useState<FarmDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canManage, setCanManage] = useState(false);

  useEffect(() => {
    if (farmId) {
      loadDashboard();
      checkPermissions();
    }
  }, [farmId]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: err } = await supabase
        .rpc('get_farm_dashboard_summary', { p_farm_id: farmId });

      if (err) throw err;

      setDashboardData(data);
    } catch (err: any) {
      console.error('Error loading dashboard:', err);
      setError(err.message || 'فشل تحميل لوحة المزرعة');
    } finally {
      setLoading(false);
    }
  };

  const checkPermissions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error: err } = await supabase
        .rpc('can_manage_farm', {
          p_user_id: user.id,
          p_farm_id: farmId
        });

      if (!err && data) {
        setCanManage(true);
      }
    } catch (err) {
      console.error('Error checking permissions:', err);
    }
  };

  const tabs = [
    { key: 'summary' as TabKey, label: 'ملخص المزرعة', icon: LayoutDashboard },
    { key: 'team' as TabKey, label: 'الإدارة والفريق', icon: Users },
    { key: 'tasks' as TabKey, label: 'المهام التشغيلية', icon: CheckSquare },
    {
      key: 'maintenance' as TabKey,
      label: 'الأصول والصيانة',
      icon: Wrench,
      subLabel: 'الفنيين + المعدات'
    },
    { key: 'finance' as TabKey, label: 'الحاسبة المالية', icon: Calculator },
    { key: 'inventory' as TabKey, label: 'محتويات المزرعة', icon: TreePine },
  ];

  // Add factory tab only if farm has factory
  if (dashboardData?.farm?.has_factory) {
    tabs.splice(5, 0, {
      key: 'factory' as TabKey,
      label: 'المصنع',
      icon: Factory
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل لوحة المزرعة...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <div className="flex items-center gap-3 text-red-600 mb-2">
            <AlertCircle className="w-5 h-5" />
            <h3 className="font-semibold">خطأ في تحميل البيانات</h3>
          </div>
          <p className="text-red-700 text-sm">{error}</p>
          <button
            onClick={loadDashboard}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center text-gray-600">
          <AlertCircle className="w-12 h-12 mx-auto mb-4" />
          <p>لم يتم العثور على بيانات المزرعة</p>
        </div>
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'summary':
        return <FarmSummaryTab data={dashboardData} onRefresh={loadDashboard} />;
      case 'team':
        return <FarmTeamTab farmId={farmId!} canManage={canManage} onRefresh={loadDashboard} />;
      case 'tasks':
        return <FarmTasksTab farmId={farmId!} canManage={canManage} />;
      case 'maintenance':
        return <FarmMaintenanceTab farmId={farmId!} canManage={canManage} />;
      case 'assets':
        return <FarmAssetsTab farmId={farmId!} canManage={canManage} />;
      case 'factory':
        return <FarmFactoryTab farmId={farmId!} canManage={canManage} />;
      case 'finance':
        return <FarmFinanceTab farmId={farmId!} canManage={canManage} />;
      case 'inventory':
        return <FarmInventoryTab farmId={farmId!} canManage={canManage} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {dashboardData.farm.name}
              </h1>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                <span>الكود: {dashboardData.farm.code}</span>
                <span>•</span>
                <span>{dashboardData.farm.location}</span>
                <span>•</span>
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded">
                  {dashboardData.farm.operational_status}
                </span>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="flex gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{dashboardData.team_count}</div>
                <div className="text-xs text-gray-600">أعضاء الفريق</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{dashboardData.tasks.open}</div>
                <div className="text-xs text-gray-600">مهام مفتوحة</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{dashboardData.tasks.urgent}</div>
                <div className="text-xs text-gray-600">مهام عاجلة</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;

              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`
                    flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap
                    ${isActive
                      ? 'border-green-600 text-green-600 bg-green-50'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <div className="text-right">
                    <div className="font-medium text-sm">{tab.label}</div>
                    {tab.subLabel && (
                      <div className="text-xs opacity-75">{tab.subLabel}</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default FarmOperationalDashboard;
