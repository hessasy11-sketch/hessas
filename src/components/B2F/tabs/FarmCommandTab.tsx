import { useState, useEffect } from 'react';
import {
  Command,
  MapPin,
  TrendingUp,
  Users,
  Activity,
  Leaf,
  ArrowRight,
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useNavigate } from 'react-router-dom';

interface OperationalFarm {
  id: string;
  operational_name: string;
  operational_status: string;
  current_occupancy: number;
  total_capacity: number;
  available_slots: number;
  born_at: string;
  last_activity_at: string;
  manager: {
    full_name: string;
  } | null;
  reference_farm: {
    name: string;
    location: string;
    city: string;
  };
}

interface Stats {
  total_farms: number;
  active_farms: number;
  total_trees: number;
  total_teams: number;
  open_tickets: number;
}

export default function FarmCommandTab() {
  const navigate = useNavigate();
  const [farms, setFarms] = useState<OperationalFarm[]>([]);
  const [stats, setStats] = useState<Stats>({
    total_farms: 0,
    active_farms: 0,
    total_trees: 0,
    total_teams: 0,
    open_tickets: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // جلب المزارع
      const { data: farmsData, error: farmsError } = await supabase
        .from('fc_operational_farms')
        .select(`
          *,
          manager:platform_staff!farm_manager_id(full_name),
          reference_farm:b2f_farms!reference_farm_id(name, location, city)
        `)
        .order('born_at', { ascending: false });

      if (farmsError) throw farmsError;

      setFarms(farmsData || []);

      // حساب الإحصائيات
      const activeFarms = farmsData?.filter(f => f.operational_status === 'active').length || 0;

      // جلب إجمالي الأشجار
      const { data: treesData } = await supabase
        .from('fc_farm_contents')
        .select('quantity')
        .eq('content_type', 'trees');

      const totalTrees = treesData?.reduce((sum, item) => sum + item.quantity, 0) || 0;

      // جلب عدد الفرق
      const { data: teamsData } = await supabase
        .from('fc_teams')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true);

      // جلب البلاغات المفتوحة
      const { data: ticketsData } = await supabase
        .from('fc_technicians')
        .select('id', { count: 'exact', head: true })
        .in('status', ['open', 'in_progress']);

      setStats({
        total_farms: farmsData?.length || 0,
        active_farms: activeFarms,
        total_trees: totalTrees,
        total_teams: teamsData?.length || 0,
        open_tickets: ticketsData?.length || 0
      });
    } catch (error) {
      console.error('Error loading farm command data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      setup: 'orange',
      active: 'green',
      maintenance: 'blue',
      inactive: 'gray'
    };
    return colors[status as keyof typeof colors] || 'gray';
  };

  const getStatusText = (status: string) => {
    const texts = {
      setup: 'تحت الإعداد',
      active: 'نشطة',
      maintenance: 'صيانة',
      inactive: 'غير نشطة'
    };
    return texts[status as keyof typeof texts] || status;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-8 text-white">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
            <Command className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-black">قيادة المزارع</h1>
            <p className="text-emerald-50 mt-1">
              لوحة قيادة وطنية لإدارة المزارع التشغيلية على مستوى المملكة
            </p>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-4 mt-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <MapPin className="w-5 h-5 opacity-80" />
              <span className="text-3xl font-bold">{stats.total_farms}</span>
            </div>
            <p className="text-sm opacity-90">إجمالي المزارع</p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="w-5 h-5 opacity-80" />
              <span className="text-3xl font-bold">{stats.active_farms}</span>
            </div>
            <p className="text-sm opacity-90">نشطة</p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <Leaf className="w-5 h-5 opacity-80" />
              <span className="text-3xl font-bold">{stats.total_trees.toLocaleString()}</span>
            </div>
            <p className="text-sm opacity-90">إجمالي الأشجار</p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-5 h-5 opacity-80" />
              <span className="text-3xl font-bold">{stats.total_teams}</span>
            </div>
            <p className="text-sm opacity-90">فرق العمل</p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <Activity className="w-5 h-5 opacity-80" />
              <span className="text-3xl font-bold">{stats.open_tickets}</span>
            </div>
            <p className="text-sm opacity-90">بلاغات مفتوحة</p>
          </div>
        </div>
      </div>

      {/* قائمة المزارع */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">المزارع التشغيلية</h2>
          <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
            {farms.length} مزرعة
          </span>
        </div>

        {farms.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              لا توجد مزارع تشغيلية بعد
            </h3>
            <p className="text-gray-600">
              ستظهر المزارع هنا بعد اكتمال العقود من قسم الاستثمار
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {farms.map((farm) => {
              const statusColor = getStatusColor(farm.operational_status);
              const statusText = getStatusText(farm.operational_status);

              return (
                <button
                  key={farm.id}
                  onClick={() => navigate(`/admin/b2f/farm-command/farms/${farm.id}`)}
                  className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-all text-right group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 mb-1">
                        {farm.operational_name}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4" />
                        <span>{farm.reference_farm?.name}</span>
                        <span>•</span>
                        <span>{farm.reference_farm?.city}</span>
                      </div>
                    </div>
                    <span className={`px-3 py-1 bg-${statusColor}-100 text-${statusColor}-700 rounded-full text-xs font-semibold`}>
                      {statusText}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-white rounded-lg p-3 border border-gray-100">
                      <div className="text-2xl font-bold text-emerald-600">
                        {farm.current_occupancy}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">محجوز</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-gray-100">
                      <div className="text-2xl font-bold text-gray-900">
                        {farm.total_capacity}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">السعة</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-gray-100">
                      <div className="text-2xl font-bold text-blue-600">
                        {farm.available_slots}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">متاح</div>
                    </div>
                  </div>

                  {farm.manager && (
                    <div className="flex items-center gap-2 text-sm text-gray-700 mb-3">
                      <Users className="w-4 h-4" />
                      <span>المدير: {farm.manager.full_name}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Clock className="w-4 h-4" />
                    <span>
                      آخر نشاط: {farm.last_activity_at
                        ? new Date(farm.last_activity_at).toLocaleDateString('ar-SA')
                        : 'لا يوجد'}
                    </span>
                  </div>

                  <div className="flex items-center justify-end text-emerald-600 mt-4 pt-4 border-t border-gray-200 group-hover:translate-x-1 transition-transform">
                    <span className="text-sm font-medium ml-1">فتح لوحة المزرعة</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
