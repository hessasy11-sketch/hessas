import { useState, useEffect } from 'react';
import { Filter, Save, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface FilterSetting {
  id: string;
  filter_name: string;
  is_enabled: boolean;
  order_index: number;
  is_predictive: boolean;
}

export function SmartFilters() {
  const { user } = useAuth();
  const [filters, setFilters] = useState<FilterSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [predictiveMode, setPredictiveMode] = useState(false);

  useEffect(() => {
    loadFilters();
    loadPredictiveMode();
  }, []);

  const loadFilters = async () => {
    try {
      const { data, error } = await supabase
        .from('filter_settings')
        .select('*')
        .order('order_index');

      if (error) throw error;
      setFilters(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPredictiveMode = async () => {
    try {
      const { data } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'predictive_filters')
        .maybeSingle();

      if (data?.setting_value?.enabled) {
        setPredictiveMode(true);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const updateFilter = async (id: string, updates: Partial<FilterSetting>) => {
    try {
      const { error } = await supabase
        .from('filter_settings')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      await supabase.from('system_logs').insert({
        action_type: 'filter_updated',
        action_data: { filter_id: id, updates, admin_id: user?.id }
      });

      loadFilters();
    } catch (error) {
      console.error('Error:', error);
      alert('حدث خطأ في التحديث');
    }
  };

  const togglePredictiveMode = async () => {
    try {
      const newValue = !predictiveMode;
      
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          setting_key: 'predictive_filters',
          setting_value: { enabled: newValue },
          category: 'filters',
          description: 'الفلترة التنبؤية الذكية'
        }, { onConflict: 'setting_key' });

      if (error) throw error;
      
      setPredictiveMode(newValue);
      alert(newValue ? '✅ تم تفعيل الفلترة التنبؤية' : '⏸️ تم إيقاف الفلترة التنبؤية');
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const filterLabels: Record<string, string> = {
    region: 'المنطقة',
    city: 'المدينة',
    category: 'الصنف',
    price: 'السعر',
    time_remaining: 'الوقت المتبقي',
    plan_type: 'الباقات',
    auction_type: 'نوع المزاد',
    status: 'الحالة'
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
      <div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">الفلترة الذكية</h3>
        <p className="text-gray-600">تحكم في الفلاتر المتاحة للمستخدمين</p>
      </div>

      <div className="bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-3">
          <Filter className="w-6 h-6 text-purple-600" />
          <h4 className="text-lg font-bold text-purple-900">الفلترة التنبؤية</h4>
        </div>
        <p className="text-purple-800 text-sm mb-4">
          النظام يقترح فلاتر تلقائياً بناءً على محتوى الصفحة ووقت اليوم وسلوك المستخدم
        </p>
        <label className="flex items-center gap-2 cursor-pointer">
          <input 
            type="checkbox" 
            checked={predictiveMode}
            onChange={togglePredictiveMode}
            className="w-5 h-5" 
          />
          <span className="text-sm font-semibold text-purple-900">
            {predictiveMode ? 'مفعّل' : 'معطّل'}
          </span>
        </label>
      </div>

      {filters.length === 0 ? (
        <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-8 text-center">
          <p className="text-gray-600">لا توجد فلاتر محفوظة</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {filters.map((filter) => (
            <div
              key={filter.id}
              className="bg-white rounded-xl p-5 border-2 border-gray-100 hover:border-blue-200 transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-gray-900 mb-1">
                    {filterLabels[filter.filter_name] || filter.filter_name}
                  </h4>
                  <p className="text-xs text-gray-500">الترتيب: {filter.order_index}</p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filter.is_enabled}
                    onChange={(e) => updateFilter(filter.id, { is_enabled: e.target.checked })}
                    className="w-5 h-5"
                  />
                  <span className="text-sm font-semibold">
                    {filter.is_enabled ? 'مفعّل' : 'معطّل'}
                  </span>
                </label>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
