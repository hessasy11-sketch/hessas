import { useState, useEffect } from 'react';
import { Trees, Plus, Loader2, Leaf } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface FarmContent {
  id: string;
  content_type: string;
  quantity: number;
  unit: string;
  location: string;
  health_status: string;
  notes: string;
}

export default function FarmContentsView({ farmId }: { farmId: string }) {
  const [contents, setContents] = useState<FarmContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'trees' | 'crops'>('all');

  useEffect(() => {
    loadContents();
  }, [farmId, filter]);

  const loadContents = async () => {
    try {
      let query = supabase
        .from('fc_farm_contents')
        .select('*')
        .eq('farm_id', farmId)
        .order('content_type');

      if (filter !== 'all') {
        query = query.eq('content_type', filter === 'trees' ? 'tree' : 'crop');
      }

      const { data, error } = await query;

      if (error) throw error;
      setContents(data || []);
    } catch (error) {
      console.error('Error loading contents:', error);
    } finally {
      setLoading(false);
    }
  };

  const getHealthStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      excellent: 'bg-green-100 text-green-700',
      good: 'bg-blue-100 text-blue-700',
      fair: 'bg-yellow-100 text-yellow-700',
      poor: 'bg-red-100 text-red-700'
    };
    return colors[status] || colors.good;
  };

  const getTotalTrees = () => {
    return contents
      .filter(c => c.content_type === 'tree')
      .reduce((sum, c) => sum + (c.quantity || 0), 0);
  };

  const getTotalCrops = () => {
    return contents
      .filter(c => c.content_type === 'crop')
      .reduce((sum, c) => sum + (c.quantity || 0), 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-green-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">محتويات المزرعة</h2>
        <p className="text-sm text-gray-600 mt-1">
          الأشجار والمحاصيل في المزرعة
        </p>
      </div>

      {/* إحصائيات */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <Trees className="w-6 h-6 opacity-80" />
            <span className="text-3xl font-bold">{getTotalTrees()}</span>
          </div>
          <p className="text-sm opacity-90">إجمالي الأشجار</p>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <Leaf className="w-6 h-6 opacity-80" />
            <span className="text-3xl font-bold">{getTotalCrops()}</span>
          </div>
          <p className="text-sm opacity-90">إجمالي المحاصيل</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <Plus className="w-6 h-6 opacity-80" />
            <span className="text-3xl font-bold">{contents.length}</span>
          </div>
          <p className="text-sm opacity-90">إجمالي الأنواع</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {['all', 'trees', 'crops'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {f === 'all' && 'الكل'}
              {f === 'trees' && 'الأشجار'}
              {f === 'crops' && 'المحاصيل'}
            </button>
          ))}
        </div>

        <button className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
          <Plus className="w-4 h-4" />
          إضافة محتوى
        </button>
      </div>

      {/* Contents List */}
      {contents.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <Trees className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">لا توجد محتويات</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {contents.map((content) => (
            <div
              key={content.id}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                {content.content_type === 'tree' ? (
                  <Trees className="w-6 h-6 text-green-600" />
                ) : (
                  <Leaf className="w-6 h-6 text-amber-600" />
                )}
                <span className={`text-xs px-2 py-1 rounded-full ${getHealthStatusColor(content.health_status)}`}>
                  {content.health_status}
                </span>
              </div>

              <div className="space-y-2">
                <div className="text-lg font-semibold text-gray-900">
                  {content.quantity} {content.unit}
                </div>
                <div className="text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>النوع:</span>
                    <span className="font-medium">{content.content_type === 'tree' ? 'شجرة' : 'محصول'}</span>
                  </div>
                  {content.location && (
                    <div className="flex justify-between mt-1">
                      <span>الموقع:</span>
                      <span className="font-medium">{content.location}</span>
                    </div>
                  )}
                </div>
                {content.notes && (
                  <p className="text-xs text-gray-500 mt-2 line-clamp-2">{content.notes}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
