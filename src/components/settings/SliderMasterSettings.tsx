import { useState, useEffect } from 'react';
import { Save, RotateCcw, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface SliderSetting {
  id: string;
  slider_name: string;
  is_enabled: boolean;
  order_index: number;
  spacing: number;
  speed: string;
  animation_type: string;
  card_size: string;
  auto_sort: boolean;
}

export function SliderMasterSettings() {
  const { user } = useAuth();
  const [sliders, setSliders] = useState<SliderSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSliders();
  }, []);

  const loadSliders = async () => {
    try {
      const { data, error } = await supabase
        .from('slider_settings')
        .select('*')
        .order('order_index');

      if (error) throw error;
      setSliders(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSlider = async (id: string, updates: Partial<SliderSetting>) => {
    try {
      const { error } = await supabase
        .from('slider_settings')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      await supabase.from('system_logs').insert({
        action_type: 'slider_updated',
        action_data: { slider_id: id, updates, admin_id: user?.id }
      });

      loadSliders();
    } catch (error) {
      console.error('Error:', error);
      alert('حدث خطأ في التحديث');
    }
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      await supabase.from('system_logs').insert({
        action_type: 'all_sliders_saved',
        action_data: { total_sliders: sliders.length, admin_id: user?.id }
      });
      alert('✅ تم حفظ جميع الإعدادات!');
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSaving(false);
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
          <h3 className="text-2xl font-bold text-gray-900">إعدادات السلايدرات</h3>
          <p className="text-gray-600">تحكم كامل في جميع السلايدرات</p>
        </div>
        <button
          onClick={saveAll}
          disabled={saving}
          className="px-6 py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 flex items-center gap-2 disabled:opacity-50"
        >
          <Save className="w-5 h-5" />
          {saving ? 'جاري الحفظ...' : 'حفظ الكل'}
        </button>
      </div>

      {sliders.length === 0 ? (
        <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-8 text-center">
          <p className="text-gray-600">لا توجد سلايدرات محفوظة</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sliders.map((slider) => (
            <div key={slider.id} className="bg-white rounded-xl p-6 border-2 border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-bold text-gray-900">{slider.slider_name}</h4>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={slider.is_enabled}
                    onChange={(e) => updateSlider(slider.id, { is_enabled: e.target.checked })}
                    className="w-5 h-5"
                  />
                  <span className="text-sm font-semibold">مفعّل</span>
                </label>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    المسافة: {slider.spacing}px
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={slider.spacing}
                    onChange={(e) => updateSlider(slider.id, { spacing: parseInt(e.target.value) })}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">السرعة</label>
                  <select
                    value={slider.speed}
                    onChange={(e) => updateSlider(slider.id, { speed: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg"
                  >
                    <option value="slow">بطيء</option>
                    <option value="normal">عادي</option>
                    <option value="fast">سريع</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">الترتيب</label>
                  <input
                    type="number"
                    value={slider.order_index}
                    onChange={(e) => updateSlider(slider.id, { order_index: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
