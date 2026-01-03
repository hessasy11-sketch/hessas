import { useState, useEffect } from 'react';
import { MapPin, TrendingUp, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export function RegionsCitiesIntelligence() {
  const [regions, setRegions] = useState<any[]>([]);
  const [autoDynamic, setAutoDynamic] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRegions();
    loadSettings();
  }, []);

  const loadRegions = async () => {
    const { data } = await supabase
      .from('regions')
      .select('*, cities(count)');
    if (data) setRegions(data);
    setLoading(false);
  };

  const loadSettings = async () => {
    const { data } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'dynamic_regions')
      .maybeSingle();
    if (data?.setting_value?.enabled) setAutoDynamic(true);
  };

  const toggleDynamic = async () => {
    const newValue = !autoDynamic;
    await supabase
      .from('system_settings')
      .upsert({
        setting_key: 'dynamic_regions',
        setting_value: { enabled: newValue },
        category: 'regions'
      }, { onConflict: 'setting_key' });
    setAutoDynamic(newValue);
  };

  if (loading) return <div className="flex justify-center p-8"><RefreshCw className="w-8 h-8 animate-spin text-blue-500" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">المدن والمناطق الذكية</h3>
        <p className="text-gray-600">إدارة وترتيب ذكي للمناطق والمدن</p>
      </div>

      <div className="bg-white rounded-xl p-6 border-2 border-gray-100">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={autoDynamic}
            onChange={toggleDynamic}
            className="w-5 h-5"
          />
          <div>
            <div className="font-bold text-gray-900">ترتيب ديناميكي تلقائي</div>
            <div className="text-sm text-gray-600">النظام يعيد ترتيب المدن حسب النشاط والطلب</div>
          </div>
        </label>
      </div>

      <div className="space-y-3">
        {regions.map((region, i) => (
          <div key={i} className="bg-white rounded-xl p-4 border-2 border-gray-100">
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-blue-500" />
              <div className="flex-1">
                <div className="font-bold text-gray-900">{region.name_ar}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
