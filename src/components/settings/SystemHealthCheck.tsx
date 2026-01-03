import { useState } from 'react';
import { Activity, CheckCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export function SystemHealthCheck() {
  const [checking, setChecking] = useState(false);
  const [report, setReport] = useState<any>(null);

  const runHealthCheck = async () => {
    setChecking(true);
    
    try {
      const { count: slidersCount } = await supabase.from('slider_settings').select('*', { count: 'exact', head: true });
      const { count: filtersCount } = await supabase.from('filter_settings').select('*', { count: 'exact', head: true });
      const { count: auctionsCount } = await supabase.from('auctions').select('*', { count: 'exact', head: true });

      setReport({
        sliders: { status: slidersCount > 0 ? 'excellent' : 'warning', count: slidersCount },
        filters: { status: filtersCount > 0 ? 'excellent' : 'warning', count: filtersCount },
        auctions: { status: auctionsCount > 0 ? 'excellent' : 'warning', count: auctionsCount }
      });
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">الفحص الصحي للنظام</h3>
        <p className="text-gray-600">فحص شامل لجميع مكونات النظام</p>
      </div>

      <button
        onClick={runHealthCheck}
        disabled={checking}
        className="w-full p-6 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-xl font-bold text-lg hover:shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-3"
      >
        <Activity className={`w-6 h-6 ${checking ? 'animate-spin' : ''}`} />
        {checking ? 'جاري الفحص...' : 'بدء الفحص الصحي'}
      </button>

      {report && (
        <div className="space-y-3">
          {Object.entries(report).map(([key, data]: [string, any]) => (
            <div key={key} className="bg-white rounded-xl p-5 border-2 border-gray-100">
              <div className="flex items-center gap-4">
                {data.status === 'excellent' ? (
                  <CheckCircle className="w-6 h-6 text-green-500" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-orange-500" />
                )}
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900">{key}</h4>
                  <p className="text-sm text-gray-600">العناصر: {data.count}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
