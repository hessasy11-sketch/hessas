import { useState, useEffect } from 'react';
import { Wrench, Truck, Plus, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import CreateMaintenanceModal from './modals/CreateMaintenanceModal';
import CreateAssetModal from './modals/CreateAssetModal';

interface MaintenanceIssue {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  requires_proof: boolean;
  proof_url?: string;
  created_by_name?: string;
  created_at: string;
  asset?: { name: string };
}

interface Asset {
  id: string;
  name: string;
  asset_type: string;
  status: string;
  last_maintenance_date?: string;
  next_maintenance_date?: string;
  service_count: number;
  notes?: string;
}

interface FarmMaintenanceTabV2Props {
  farmId: string;
  canManage: boolean;
}

const FarmMaintenanceTabV2 = ({ farmId, canManage }: FarmMaintenanceTabV2Props) => {
  const [activeSection, setActiveSection] = useState<'maintenance' | 'assets'>('maintenance');
  const [maintenance, setMaintenance] = useState<MaintenanceIssue[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [showAssetModal, setShowAssetModal] = useState(false);

  useEffect(() => {
    loadData();
  }, [farmId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load maintenance stats
      const { data: statsData } = await supabase
        .rpc('get_farm_maintenance_stats', { p_farm_id: farmId });
      setStats(statsData);

      // Load maintenance issues
      const { data: maintenanceData } = await supabase
        .from('farm_maintenance')
        .select(`
          *,
          asset:farm_assets(name)
        `)
        .eq('farm_id', farmId)
        .order('created_at', { ascending: false });
      setMaintenance(maintenanceData || []);

      // Load assets
      const { data: assetsData } = await supabase
        .from('farm_assets')
        .select('*')
        .eq('farm_id', farmId)
        .order('created_at', { ascending: false });
      setAssets(assetsData || []);
    } catch (err: any) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-yellow-100 text-yellow-700';
      case 'in_progress': return 'bg-blue-100 text-blue-700';
      case 'submitted': return 'bg-purple-100 text-purple-700';
      case 'approved': return 'bg-green-100 text-green-700';
      case 'completed': return 'bg-gray-100 text-gray-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getAssetStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'under_maintenance': return 'bg-yellow-100 text-yellow-700';
      case 'broken': return 'bg-red-100 text-red-700';
      case 'retired': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
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
      {/* Header with Stats */}
      <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">الأصول والصيانة</h2>
          <div className="flex gap-2">
            {canManage && (
              <>
                <button
                  onClick={() => setShowMaintenanceModal(true)}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2 text-sm"
                >
                  <AlertTriangle className="w-4 h-4" />
                  بلاغ صيانة
                </button>
                <button
                  onClick={() => setShowAssetModal(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  إضافة معدة
                </button>
              </>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-3">
              <div className="text-xs text-gray-600 mb-1">أعطال مفتوحة</div>
              <div className="text-2xl font-bold text-orange-600">{stats.open}</div>
            </div>
            <div className="bg-white rounded-lg p-3">
              <div className="text-xs text-gray-600 mb-1">قيد الاعتماد</div>
              <div className="text-2xl font-bold text-purple-600">{stats.pending_approval}</div>
            </div>
            <div className="bg-white rounded-lg p-3">
              <div className="text-xs text-gray-600 mb-1">عاجل</div>
              <div className="text-2xl font-bold text-red-600">{stats.urgent}</div>
            </div>
            <div className="bg-white rounded-lg p-3">
              <div className="text-xs text-gray-600 mb-1">مكتملة الشهر</div>
              <div className="text-2xl font-bold text-green-600">{stats.completed_this_month}</div>
            </div>
          </div>
        )}
      </div>

      {/* Section Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveSection('maintenance')}
          className={`px-4 py-2 border-b-2 transition-colors flex items-center gap-2 ${
            activeSection === 'maintenance'
              ? 'border-orange-600 text-orange-600 font-semibold'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <Wrench className="w-4 h-4" />
          الصيانة والأعطال ({maintenance.length})
        </button>
        <button
          onClick={() => setActiveSection('assets')}
          className={`px-4 py-2 border-b-2 transition-colors flex items-center gap-2 ${
            activeSection === 'assets'
              ? 'border-green-600 text-green-600 font-semibold'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <Truck className="w-4 h-4" />
          المعدات والآلات ({assets.length})
        </button>
      </div>

      {/* Maintenance Section */}
      {activeSection === 'maintenance' && (
        <div className="space-y-3">
          {maintenance.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
              <p className="text-gray-600">لا توجد بلاغات صيانة</p>
              <p className="text-sm text-gray-500 mt-1">المزرعة في حالة ممتازة!</p>
            </div>
          ) : (
            maintenance.map((issue) => (
              <div
                key={issue.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">{issue.title}</h3>
                      <span className={`text-xs px-2 py-1 rounded ${getStatusColor(issue.status)}`}>
                        {issue.status === 'new' ? 'جديد' :
                         issue.status === 'in_progress' ? 'قيد العمل' :
                         issue.status === 'submitted' ? 'مقدم' :
                         issue.status === 'approved' ? 'معتمد' :
                         issue.status === 'completed' ? 'مكتمل' :
                         issue.status === 'rejected' ? 'مرفوض' : issue.status}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded border ${getPriorityColor(issue.priority)}`}>
                        {issue.priority === 'urgent' ? 'عاجل' :
                         issue.priority === 'high' ? 'عالي' :
                         issue.priority === 'medium' ? 'متوسط' : 'منخفض'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{issue.description}</p>
                    {issue.asset && (
                      <p className="text-xs text-gray-500">المعدة: {issue.asset.name}</p>
                    )}
                  </div>
                  {issue.requires_proof && (
                    <div className="text-xs text-orange-600 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      يتطلب إثبات
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
                  <span>{issue.created_by_name || 'غير محدد'}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(issue.created_at).toLocaleDateString('ar-SA')}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Assets Section */}
      {activeSection === 'assets' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {assets.length === 0 ? (
            <div className="col-span-2 bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
              <Truck className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">لا توجد معدات مسجلة</p>
            </div>
          ) : (
            assets.map((asset) => (
              <div
                key={asset.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">{asset.name}</h3>
                    <p className="text-sm text-gray-600">{asset.asset_type}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${getAssetStatusColor(asset.status)}`}>
                    {asset.status === 'active' ? 'نشط' :
                     asset.status === 'under_maintenance' ? 'تحت الصيانة' :
                     asset.status === 'broken' ? 'معطل' :
                     asset.status === 'retired' ? 'متوقف' : asset.status}
                  </span>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">عدد الصيانات:</span>
                    <span className="font-medium text-gray-900">{asset.service_count}</span>
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
                      <span className="font-medium text-green-600">
                        {new Date(asset.next_maintenance_date).toLocaleDateString('ar-SA')}
                      </span>
                    </div>
                  )}
                </div>

                {asset.notes && (
                  <p className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-100">
                    {asset.notes}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Modals */}
      {showMaintenanceModal && (
        <CreateMaintenanceModal
          farmId={farmId}
          assets={assets}
          onClose={() => setShowMaintenanceModal(false)}
          onSuccess={() => {
            setShowMaintenanceModal(false);
            loadData();
          }}
        />
      )}

      {showAssetModal && (
        <CreateAssetModal
          farmId={farmId}
          onClose={() => setShowAssetModal(false)}
          onSuccess={() => {
            setShowAssetModal(false);
            loadData();
          }}
        />
      )}
    </div>
  );
};

export default FarmMaintenanceTabV2;
