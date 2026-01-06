import { useState, useEffect } from 'react';
import { TreePine, Plus, Package } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface InventoryItem {
  id: string;
  item_type: string;
  name: string;
  category?: string;
  quantity: number;
  unit: string;
  location_section?: string;
  health_status?: string;
  planted_date?: string;
  expected_harvest_date?: string;
}

interface FarmInventoryTabProps {
  farmId: string;
  canManage: boolean;
}

const FarmInventoryTab = ({ farmId, canManage }: FarmInventoryTabProps) => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    loadInventory();
  }, [farmId]);

  const loadInventory = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('farm_inventory')
        .select('*')
        .eq('farm_id', farmId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setInventory(data || []);
    } catch (err: any) {
      console.error('Error loading inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'excellent': return 'bg-green-100 text-green-700';
      case 'good': return 'bg-blue-100 text-blue-700';
      case 'fair': return 'bg-yellow-100 text-yellow-700';
      case 'poor': return 'bg-orange-100 text-orange-700';
      case 'diseased': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'tree': return '🌳';
      case 'crop': return '🌾';
      case 'seed': return '🌱';
      case 'fertilizer': return '🧪';
      default: return '📦';
    }
  };

  const filteredInventory = inventory.filter(item => {
    if (filter === 'all') return true;
    return item.item_type === filter;
  });

  const stats = {
    all: inventory.length,
    trees: inventory.filter(i => i.item_type === 'tree').length,
    crops: inventory.filter(i => i.item_type === 'crop').length,
    supplies: inventory.filter(i => ['seed', 'fertilizer', 'tool', 'supply'].includes(i.item_type)).length
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
        <h2 className="text-xl font-bold text-gray-900">محتويات المزرعة</h2>
        {canManage && (
          <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2">
            <Plus className="w-4 h-4" />
            إضافة محتوى
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-3xl mb-2">🌳</div>
          <p className="text-sm text-gray-600">الأشجار</p>
          <p className="text-2xl font-bold text-gray-900">{stats.trees}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-3xl mb-2">🌾</div>
          <p className="text-sm text-gray-600">المحاصيل</p>
          <p className="text-2xl font-bold text-gray-900">{stats.crops}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-3xl mb-2">📦</div>
          <p className="text-sm text-gray-600">المستلزمات</p>
          <p className="text-2xl font-bold text-gray-900">{stats.supplies}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-3xl mb-2">✅</div>
          <p className="text-sm text-gray-600">إجمالي العناصر</p>
          <p className="text-2xl font-bold text-gray-900">{stats.all}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'all'
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          الكل ({stats.all})
        </button>
        <button
          onClick={() => setFilter('tree')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'tree'
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          🌳 الأشجار ({stats.trees})
        </button>
        <button
          onClick={() => setFilter('crop')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'crop'
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          🌾 المحاصيل ({stats.crops})
        </button>
        <button
          onClick={() => setFilter('seed')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'seed'
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          🌱 البذور
        </button>
      </div>

      {/* Inventory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredInventory.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{getTypeIcon(item.item_type)}</span>
                <div>
                  <h3 className="font-semibold text-gray-900">{item.name}</h3>
                  {item.category && (
                    <p className="text-xs text-gray-600">{item.category}</p>
                  )}
                </div>
              </div>
              {item.health_status && (
                <span className={`text-xs px-2 py-1 rounded ${getHealthColor(item.health_status)}`}>
                  {item.health_status === 'excellent' ? 'ممتاز' :
                   item.health_status === 'good' ? 'جيد' :
                   item.health_status === 'fair' ? 'مقبول' :
                   item.health_status === 'poor' ? 'ضعيف' :
                   item.health_status === 'diseased' ? 'مريض' : item.health_status}
                </span>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">الكمية:</span>
                <span className="font-semibold text-gray-900">
                  {item.quantity} {item.unit}
                </span>
              </div>

              {item.location_section && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">القسم:</span>
                  <span className="font-medium text-gray-900">{item.location_section}</span>
                </div>
              )}

              {item.planted_date && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">تاريخ الزراعة:</span>
                  <span className="font-medium text-gray-900">
                    {new Date(item.planted_date).toLocaleDateString('ar-SA')}
                  </span>
                </div>
              )}

              {item.expected_harvest_date && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">الحصاد المتوقع:</span>
                  <span className="font-medium text-gray-900">
                    {new Date(item.expected_harvest_date).toLocaleDateString('ar-SA')}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredInventory.length === 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">لا توجد محتويات {filter !== 'all' && `من نوع "${filter}"`}</p>
        </div>
      )}
    </div>
  );
};

export default FarmInventoryTab;
