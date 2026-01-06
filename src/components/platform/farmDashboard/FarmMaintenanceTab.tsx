import { useState, useEffect } from 'react';
import { Wrench, Truck, Plus, AlertCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface Asset {
  id: string;
  name: string;
  type: string;
  status: string;
  ownership: string;
  last_maintenance_date?: string;
  next_maintenance_date?: string;
}

interface MaintenanceLog {
  id: string;
  type: string;
  description: string;
  status: string;
  priority: string;
  scheduled_date?: string;
  cost?: number;
  asset?: { name: string };
}

interface FarmMaintenanceTabProps {
  farmId: string;
  canManage: boolean;
}

const FarmMaintenanceTab = ({ farmId, canManage }: FarmMaintenanceTabProps) => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'assets' | 'maintenance'>('assets');

  useEffect(() => {
    loadData();
  }, [farmId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load assets
      const { data: assetsData, error: assetsError } = await supabase
        .from('farm_assets')
        .select('*')
        .eq('farm_id', farmId)
        .order('created_at', { ascending: false });

      if (assetsError) throw assetsError;
      setAssets(assetsData || []);

      // Load maintenance logs
      const { data: maintenanceData, error: maintenanceError } = await supabase
        .from('farm_maintenance_logs')
        .select(`
          *,
          asset:farm_assets(name)
        `)
        .eq('farm_id', farmId)
        .order('created_at', { ascending: false });

      if (maintenanceError) throw maintenanceError;
      setMaintenance(maintenanceData || []);
    } catch (err: any) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getAssetStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'under_maintenance': return 'bg-yellow-100 text-yellow-700';
      case 'retired': return 'bg-gray-100 text-gray-700';
      case 'rented': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getMaintenancePriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'normal': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">الأصول والصيانة</h2>
        {canManage && (
          <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2">
            <Plus className="w-4 h-4" />
            {activeView === 'assets' ? 'إضافة معدة' : 'طلب صيانة'}
          </button>
        )}
      </div>

      {/* View Toggle */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveView('assets')}
          className={`px-4 py-2 border-b-2 transition-colors ${
            activeView === 'assets'
              ? 'border-green-600 text-green-600 font-semibold'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <Truck className="w-4 h-4 inline-block ml-2" />
          الآلات والمعدات ({assets.length})
        </button>
        <button
          onClick={() => setActiveView('maintenance')}
          className={`px-4 py-2 border-b-2 transition-colors ${
            activeView === 'maintenance'
              ? 'border-green-600 text-green-600 font-semibold'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <Wrench className="w-4 h-4 inline-block ml-2" />
          سجل الصيانة ({maintenance.length})
        </button>
      </div>

      {/* Assets View */}
      {activeView === 'assets' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {assets.map((asset) => (
            <div
              key={asset.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">{asset.name}</h3>
                  <p className="text-sm text-gray-600">{asset.type}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${getAssetStatusColor(asset.status)}`}>
                  {asset.status}
                </span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">الملكية:</span>
                  <span className="font-medium text-gray-900">{asset.ownership}</span>
                </div>
                {asset.last_maintenance_date && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">آخر صيانة:</span>
                    <span className="font-medium text-gray-900">
                      {new Date(asset.last_maintenance_date).toLocaleDateString('ar-SA')}
                    </span>
                  </div>
                )}
                {asset.next_maintenance_date && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">الصيانة القادمة:</span>
                    <span className="font-medium text-gray-900">
                      {new Date(asset.next_maintenance_date).toLocaleDateString('ar-SA')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {assets.length === 0 && (
            <div className="col-span-2 bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
              <Truck className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">لا توجد معدات مسجلة</p>
            </div>
          )}
        </div>
      )}

      {/* Maintenance View */}
      {activeView === 'maintenance' && (
        <div className="space-y-3">
          {maintenance.map((log) => (
            <div
              key={log.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900">{log.type}</h3>
                    <span className={`text-xs px-2 py-1 rounded border ${getMaintenancePriorityColor(log.priority)}`}>
                      {log.priority === 'urgent' ? 'عاجل' : log.priority === 'high' ? 'عالي' : 'عادي'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{log.description}</p>
                  {log.asset && (
                    <p className="text-xs text-gray-500 mt-1">المعدة: {log.asset.name}</p>
                  )}
                </div>
                <span className={`text-xs px-2 py-1 rounded ${
                  log.status === 'completed' ? 'bg-green-100 text-green-700' :
                  log.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {log.status}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500">
                {log.scheduled_date && (
                  <span>
                    موعد: {new Date(log.scheduled_date).toLocaleDateString('ar-SA')}
                  </span>
                )}
                {log.cost && (
                  <span className="font-semibold text-gray-900">
                    {log.cost.toLocaleString('ar-SA')} ريال
                  </span>
                )}
              </div>
            </div>
          ))}

          {maintenance.length === 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
              <Wrench className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">لا توجد سجلات صيانة</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FarmMaintenanceTab;
