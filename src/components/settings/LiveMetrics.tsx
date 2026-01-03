import { useState, useEffect } from 'react';
import { Users, MapPin, Search, Activity, TrendingUp, Clock, Package, Zap, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface MetricCard {
  title: string;
  value: string | number;
  trend?: string;
  icon: any;
  color: string;
  percentage?: number;
}

export function LiveMetrics() {
  const [metrics, setMetrics] = useState<MetricCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    loadMetrics();
    const interval = setInterval(() => {
      loadMetrics();
      setLastUpdate(new Date());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadMetrics = async () => {
    try {
      const { data: stats } = await supabase
        .from('public_statistics')
        .select('*')
        .order('recorded_at', { ascending: false})
        .limit(10);

      const { data: auctionsData, count: activeCount } = await supabase
        .from('auctions')
        .select('*', { count: 'exact' })
        .eq('status', 'active');

      const { data: allAuctions, count: totalCount } = await supabase
        .from('auctions')
        .select('id, status', { count: 'exact' });

      const metricsData: MetricCard[]= [
        {
          title: 'المزادات النشطة',
          value: activeCount || 0,
          icon: Activity,
          color: '#8B5CF6'
        },
        {
          title: 'إجمالي المزادات',
          value: totalCount || 0,
          icon: Package,
          color: '#EC4899'
        }
      ];

      setMetrics(metricsData);
    } catch (error) {
      console.error('Error loading metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">المقاييس اللحظية</h3>
          <p className="text-gray-600">بيانات حقيقية من قاعدة البيانات</p>
        </div>
        <div className="text-sm text-gray-500">
          آخر تحديث: {lastUpdate.toLocaleTimeString('ar-SA')}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <div
              key={index}
              className="bg-white rounded-xl p-5 border-2 border-gray-100 hover:border-gray-200 transition-all hover:shadow-lg"
            >
              <div className="flex items-start justify-between mb-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${metric.color}15` }}
                >
                  <Icon className="w-6 h-6" style={{ color: metric.color }} />
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-2xl font-bold text-gray-900">{metric.value}</div>
                <div className="text-sm text-gray-600">{metric.title}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xl font-bold mb-2">نظام المقاييس الحية</h4>
            <p className="text-blue-50 text-sm">
              يتم تحديث البيانات تلقائياً كل 30 ثانية من قاعدة البيانات المباشرة
            </p>
          </div>
          <Zap className="w-16 h-16 opacity-20" />
        </div>
      </div>
    </div>
  );
}
