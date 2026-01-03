import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { FarmOperationCard } from './FarmOperationCard';
import { FarmSeasonsView } from '../seasonal/FarmSeasonsView';
import { Loader2, Activity, AlertCircle } from 'lucide-react';

interface FarmOperation {
  farmId: string;
  farmName: string;
  treeType: string;
  location: string;
  investorsCount: number;
  activeSeasonsCount: number;
  operationStatus: 'no_season' | 'active' | 'completed';
}

export function OperationsManagement() {
  const [farms, setFarms] = useState<FarmOperation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFarm, setSelectedFarm] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    loadFarmsWithInvestors();
  }, []);

  const loadFarmsWithInvestors = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get all investment requests that have been transferred to operations
      const { data: requests, error: requestsError } = await supabase
        .from('b2f_investment_requests')
        .select(`
          id,
          farm_id,
          tree_type,
          status,
          operational_status
        `)
        .eq('status', 'operational');

      if (requestsError) throw requestsError;

      if (!requests || requests.length === 0) {
        setFarms([]);
        setLoading(false);
        return;
      }

      // Group by farm_id
      const farmGroups = requests.reduce((acc: Record<string, any[]>, request) => {
        const farmId = request.farm_id;
        if (!farmId) return acc;

        if (!acc[farmId]) {
          acc[farmId] = [];
        }
        acc[farmId].push(request);
        return acc;
      }, {});

      // Get farm details
      const farmIds = Object.keys(farmGroups);
      const { data: farmsData, error: farmsError } = await supabase
        .from('b2f_farms')
        .select('id, name, location, city')
        .in('id', farmIds);

      if (farmsError) throw farmsError;

      // Get active seasons count for each farm
      const { data: seasonsData } = await supabase
        .from('farm_seasons')
        .select('farm_id, status')
        .in('farm_id', farmIds);

      const seasonsCountMap: Record<string, number> = {};
      (seasonsData || []).forEach(season => {
        if (season.status === 'active' || season.status === 'harvest') {
          seasonsCountMap[season.farm_id] = (seasonsCountMap[season.farm_id] || 0) + 1;
        }
      });

      // Build farm operations data
      const farmsOperations: FarmOperation[] = (farmsData || []).map((farm) => {
        const farmRequests = farmGroups[farm.id] || [];
        const investorsCount = farmRequests.length;

        // Get most common tree type
        const treeTypes = farmRequests.map(r => r.tree_type);
        const treeType = treeTypes[0] || 'other';

        // Get active seasons count
        const activeSeasonsCount = seasonsCountMap[farm.id] || 0;

        // Determine operation status based on seasons
        let operationStatus: 'no_season' | 'active' | 'completed' = 'no_season';
        if (activeSeasonsCount > 0) {
          operationStatus = 'active';
        }

        return {
          farmId: farm.id,
          farmName: farm.name,
          treeType,
          location: farm.city || farm.location,
          investorsCount,
          activeSeasonsCount,
          operationStatus
        };
      });

      setFarms(farmsOperations);
    } catch (err) {
      console.error('Error loading farms:', err);
      setError('حدث خطأ أثناء تحميل المزارع');
    } finally {
      setLoading(false);
    }
  };

  const handleManageFarm = (farmId: string, farmName: string) => {
    setSelectedFarm({ id: farmId, name: farmName });
  };

  // Show farm seasons view if a farm is selected
  if (selectedFarm) {
    return (
      <FarmSeasonsView
        farmId={selectedFarm.id}
        farmName={selectedFarm.name}
        onBack={() => setSelectedFarm(null)}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-green-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">جاري تحميل المزارع...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">حدث خطأ</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadFarmsWithInvestors}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  if (farms.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">لا توجد مزارع للتشغيل</h3>
          <p className="text-gray-600">
            لا يوجد مزارع تحتوي على مستثمرين تم نقلهم للتشغيل حتى الآن
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Activity className="w-8 h-8 text-green-600" />
          <h1 className="text-3xl font-bold text-gray-900">التشغيل والمتابعة</h1>
        </div>
        <p className="text-gray-600 mr-11">
          إدارة تشغيل المزارع ومتابعة المواسم والمستثمرين
        </p>
      </div>

      {/* Stats Bar */}
      <div className="bg-gradient-to-l from-green-50 to-white rounded-xl border border-green-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-1">إجمالي المزارع</p>
            <p className="text-3xl font-bold text-green-700">{farms.length}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-1">إجمالي المستثمرين</p>
            <p className="text-3xl font-bold text-blue-700">
              {farms.reduce((sum, farm) => sum + farm.investorsCount, 0)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-1">المواسم النشطة</p>
            <p className="text-3xl font-bold text-orange-600">
              {farms.reduce((sum, farm) => sum + farm.activeSeasonsCount, 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Farms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {farms.map((farm) => (
          <FarmOperationCard
            key={farm.farmId}
            farmId={farm.farmId}
            farmName={farm.farmName}
            treeType={farm.treeType}
            location={farm.location}
            investorsCount={farm.investorsCount}
            activeSeasonsCount={farm.activeSeasonsCount}
            operationStatus={farm.operationStatus}
            onManageClick={() => handleManageFarm(farm.farmId, farm.farmName)}
          />
        ))}
      </div>
    </div>
  );
}
