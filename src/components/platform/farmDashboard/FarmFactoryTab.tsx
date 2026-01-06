import { useState, useEffect } from 'react';
import { Factory, Plus, Package, TrendingUp } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface ProductionBatch {
  id: string;
  batch_number: string;
  product_type: string;
  input_quantity: number;
  input_unit: string;
  output_quantity?: number;
  output_unit?: string;
  production_date: string;
  quality_grade: string;
  status: string;
  production_cost?: number;
  sale_price?: number;
  notes?: string;
}

interface FarmFactoryTabProps {
  farmId: string;
  canManage: boolean;
}

const FarmFactoryTab = ({ farmId, canManage }: FarmFactoryTabProps) => {
  const [batches, setBatches] = useState<ProductionBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    loadBatches();
  }, [farmId]);

  const loadBatches = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('farm_factory_batches')
        .select('*')
        .eq('farm_id', farmId)
        .order('production_date', { ascending: false });

      if (error) throw error;

      setBatches(data || []);
    } catch (err: any) {
      console.error('Error loading batches:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700';
      case 'in_progress': return 'bg-yellow-100 text-yellow-700';
      case 'quality_check': return 'bg-blue-100 text-blue-700';
      case 'packaged': return 'bg-purple-100 text-purple-700';
      case 'sold': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'premium': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'standard': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'economy': return 'bg-gray-100 text-gray-700 border-gray-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR'
    }).format(amount);
  };

  const filteredBatches = batches.filter(batch => {
    if (filter === 'all') return true;
    return batch.status === filter;
  });

  const stats = {
    total: batches.length,
    in_progress: batches.filter(b => b.status === 'in_progress').length,
    completed: batches.filter(b => b.status === 'completed').length,
    sold: batches.filter(b => b.status === 'sold').length,
    total_revenue: batches
      .filter(b => b.sale_price)
      .reduce((sum, b) => sum + (b.sale_price || 0), 0)
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
        <h2 className="text-xl font-bold text-gray-900">إدارة المصنع</h2>
        {canManage && (
          <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2">
            <Plus className="w-4 h-4" />
            دفعة إنتاج جديدة
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-5 h-5 text-blue-600" />
            <span className="text-sm text-gray-600">إجمالي الدفعات</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Factory className="w-5 h-5 text-yellow-600" />
            <span className="text-sm text-gray-600">قيد التنفيذ</span>
          </div>
          <p className="text-2xl font-bold text-yellow-600">{stats.in_progress}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-5 h-5 text-green-600" />
            <span className="text-sm text-gray-600">مكتملة</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            <span className="text-sm text-gray-600">إجمالي الإيرادات</span>
          </div>
          <p className="text-xl font-bold text-purple-600">{formatCurrency(stats.total_revenue)}</p>
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
          الكل ({stats.total})
        </button>
        <button
          onClick={() => setFilter('in_progress')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'in_progress'
              ? 'bg-yellow-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          قيد التنفيذ ({stats.in_progress})
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'completed'
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          مكتملة ({stats.completed})
        </button>
        <button
          onClick={() => setFilter('sold')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'sold'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          مباعة ({stats.sold})
        </button>
      </div>

      {/* Batches List */}
      <div className="space-y-3">
        {filteredBatches.map((batch) => (
          <div
            key={batch.id}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900">
                    {batch.batch_number} - {batch.product_type}
                  </h3>
                  <span className={`text-xs px-2 py-1 rounded ${getStatusColor(batch.status)}`}>
                    {batch.status === 'in_progress' ? 'قيد التنفيذ' :
                     batch.status === 'completed' ? 'مكتملة' :
                     batch.status === 'quality_check' ? 'فحص الجودة' :
                     batch.status === 'packaged' ? 'معبأة' :
                     batch.status === 'sold' ? 'مباعة' : batch.status}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded border ${getQualityColor(batch.quality_grade)}`}>
                    {batch.quality_grade === 'premium' ? 'ممتاز' :
                     batch.quality_grade === 'standard' ? 'قياسي' :
                     batch.quality_grade === 'economy' ? 'اقتصادي' : batch.quality_grade}
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  المدخلات: {batch.input_quantity} {batch.input_unit}
                  {batch.output_quantity && ` • المخرجات: ${batch.output_quantity} ${batch.output_unit}`}
                </p>
                {batch.notes && (
                  <p className="text-xs text-gray-500 mt-1">{batch.notes}</p>
                )}
              </div>

              <div className="text-right">
                <p className="text-xs text-gray-600">
                  {new Date(batch.production_date).toLocaleDateString('ar-SA')}
                </p>
                {batch.sale_price && (
                  <p className="text-sm font-bold text-green-600 mt-1">
                    {formatCurrency(batch.sale_price)}
                  </p>
                )}
              </div>
            </div>

            {(batch.production_cost || batch.sale_price) && (
              <div className="flex gap-4 text-sm pt-3 border-t border-gray-100">
                {batch.production_cost && (
                  <div>
                    <span className="text-gray-600">تكلفة الإنتاج: </span>
                    <span className="font-semibold text-gray-900">
                      {formatCurrency(batch.production_cost)}
                    </span>
                  </div>
                )}
                {batch.sale_price && batch.production_cost && (
                  <div>
                    <span className="text-gray-600">الربح: </span>
                    <span className="font-semibold text-green-600">
                      {formatCurrency(batch.sale_price - batch.production_cost)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredBatches.length === 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <Factory className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">لا توجد دفعات إنتاج {filter !== 'all' && `في حالة "${filter}"`}</p>
        </div>
      )}
    </div>
  );
};

export default FarmFactoryTab;
