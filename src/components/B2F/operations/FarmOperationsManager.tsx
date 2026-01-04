import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import {
  Tractor,
  MapPin,
  Users,
  FileText,
  ChevronRight,
  Loader2,
  Plus,
  PlayCircle,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface FarmWithContracts {
  id: string;
  name: string;
  location: string;
  city: string;
  total_trees_available: number;
  active_contracts_count: number;
  total_investors: number;
  contract_trees: number;
  has_active_operation: boolean;
  operation_current_phase?: string;
  operation_progress?: number;
}

interface FarmOperationsManagerProps {
  onSelectFarm: (farmId: string) => void;
}

export default function FarmOperationsManager({ onSelectFarm }: FarmOperationsManagerProps) {
  const [farms, setFarms] = useState<FarmWithContracts[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'no_operation'>('all');

  useEffect(() => {
    loadFarms();
  }, []);

  const loadFarms = async () => {
    try {
      setLoading(true);

      // جلب المزارع مع حساب العقود النشطة
      const { data: farmsData, error: farmsError } = await supabase
        .from('b2f_farms')
        .select('id, name, location, city, total_trees_available')
        .eq('is_active', true)
        .order('name');

      if (farmsError) throw farmsError;

      // جلب إحصائيات العقود لكل مزرعة
      const farmsWithStats = await Promise.all(
        (farmsData || []).map(async (farm) => {
          // عدد العقود النشطة
          const { count: contractsCount } = await supabase
            .from('b2f_contracts')
            .select('*', { count: 'exact', head: true })
            .eq('farm_id', farm.id)
            .eq('status', 'active');

          // إجمالي الأشجار والمستثمرين
          const { data: contractsData } = await supabase
            .from('b2f_contracts')
            .select('trees_count, investor_phone')
            .eq('farm_id', farm.id)
            .eq('status', 'active');

          const contractTrees = contractsData?.reduce((sum, c) => sum + (c.trees_count || 0), 0) || 0;
          const uniqueInvestors = new Set(contractsData?.map(c => c.investor_phone).filter(Boolean)).size;

          // التحقق من وجود تشغيل نشط
          const { data: operationData } = await supabase
            .from('b2f_farm_operations')
            .select('current_phase, progress_percentage')
            .eq('farm_id', farm.id)
            .eq('is_active', true)
            .limit(1)
            .maybeSingle();

          return {
            ...farm,
            active_contracts_count: contractsCount || 0,
            total_investors: uniqueInvestors,
            contract_trees: contractTrees,
            has_active_operation: !!operationData,
            operation_current_phase: operationData?.current_phase,
            operation_progress: operationData?.progress_percentage
          };
        })
      );

      setFarms(farmsWithStats);
    } catch (error) {
      console.error('Error loading farms:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredFarms = farms.filter(farm => {
    if (filter === 'active') return farm.has_active_operation;
    if (filter === 'no_operation') return !farm.has_active_operation && farm.active_contracts_count > 0;
    return farm.active_contracts_count > 0; // فقط المزارع التي لديها عقود
  });

  const getPhaseClasses = (phase?: string) => {
    const classes: Record<string, { bg: string; border: string; text: string; textLight: string; bar: string }> = {
      preparation: {
        bg: 'bg-gray-50',
        border: 'border-gray-200',
        text: 'text-gray-900',
        textLight: 'text-gray-700',
        bar: 'bg-gray-500'
      },
      activation: {
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        text: 'text-emerald-900',
        textLight: 'text-emerald-700',
        bar: 'bg-emerald-500'
      },
      service: {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-900',
        textLight: 'text-blue-700',
        bar: 'bg-blue-500'
      },
      irrigation: {
        bg: 'bg-cyan-50',
        border: 'border-cyan-200',
        text: 'text-cyan-900',
        textLight: 'text-cyan-700',
        bar: 'bg-cyan-500'
      },
      fruiting: {
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        text: 'text-amber-900',
        textLight: 'text-amber-700',
        bar: 'bg-amber-500'
      },
      pre_harvest: {
        bg: 'bg-orange-50',
        border: 'border-orange-200',
        text: 'text-orange-900',
        textLight: 'text-orange-700',
        bar: 'bg-orange-500'
      },
      harvest: {
        bg: 'bg-green-50',
        border: 'border-green-200',
        text: 'text-green-900',
        textLight: 'text-green-700',
        bar: 'bg-green-500'
      },
      post_harvest: {
        bg: 'bg-teal-50',
        border: 'border-teal-200',
        text: 'text-teal-900',
        textLight: 'text-teal-700',
        bar: 'bg-teal-500'
      }
    };
    return classes[phase || ''] || classes.preparation;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* العنوان والإحصائيات */}
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <Tractor className="w-8 h-8" />
          <div>
            <h2 className="text-2xl font-bold">إدارة التشغيل على مستوى المزرعة</h2>
            <p className="text-emerald-100 text-sm">
              نظام مركزي لإدارة التشغيل - كل تحديث يصل تلقائياً لجميع المستثمرين المرتبطين
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="text-3xl font-bold mb-1">{farms.length}</div>
            <div className="text-sm text-emerald-100">إجمالي المزارع</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="text-3xl font-bold mb-1">
              {farms.filter(f => f.has_active_operation).length}
            </div>
            <div className="text-sm text-emerald-100">مزارع تحت التشغيل</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="text-3xl font-bold mb-1">
              {farms.reduce((sum, f) => sum + f.active_contracts_count, 0)}
            </div>
            <div className="text-sm text-emerald-100">إجمالي العقود النشطة</div>
          </div>
        </div>
      </div>

      {/* الفلاتر */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === 'all'
                ? 'bg-emerald-500 text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            جميع المزارع ({farms.filter(f => f.active_contracts_count > 0).length})
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === 'active'
                ? 'bg-emerald-500 text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            تحت التشغيل ({farms.filter(f => f.has_active_operation).length})
          </button>
          <button
            onClick={() => setFilter('no_operation')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === 'no_operation'
                ? 'bg-emerald-500 text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            لم يتم تفعيلها ({farms.filter(f => !f.has_active_operation && f.active_contracts_count > 0).length})
          </button>
        </div>
      </div>

      {/* قائمة المزارع */}
      {filteredFarms.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">لا توجد مزارع</h3>
          <p className="text-gray-600">لا توجد مزارع تطابق الفلتر المحدد</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredFarms.map((farm) => {
            const phaseClasses = getPhaseClasses(farm.operation_current_phase);

            return (
              <div
                key={farm.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all overflow-hidden"
              >
                {/* الرأس */}
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-gray-900">{farm.name}</h3>
                        {farm.has_active_operation ? (
                          <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            تحت التشغيل
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full">
                            جاهز للتفعيل
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {farm.location}
                        </span>
                        <span>•</span>
                        <span>{farm.city}</span>
                      </div>
                    </div>
                  </div>

                  {/* الإحصائيات */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-blue-50 rounded-lg p-3 text-center">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <FileText className="w-4 h-4 text-blue-600" />
                        <span className="text-2xl font-bold text-blue-600">
                          {farm.active_contracts_count}
                        </span>
                      </div>
                      <div className="text-xs text-blue-700">عقد نشط</div>
                    </div>

                    <div className="bg-purple-50 rounded-lg p-3 text-center">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <Users className="w-4 h-4 text-purple-600" />
                        <span className="text-2xl font-bold text-purple-600">
                          {farm.total_investors}
                        </span>
                      </div>
                      <div className="text-xs text-purple-700">مستثمر</div>
                    </div>

                    <div className="bg-emerald-50 rounded-lg p-3 text-center">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <Tractor className="w-4 h-4 text-emerald-600" />
                        <span className="text-2xl font-bold text-emerald-600">
                          {farm.contract_trees.toLocaleString()}
                        </span>
                      </div>
                      <div className="text-xs text-emerald-700">شجرة مُستثمرة</div>
                    </div>
                  </div>

                  {/* حالة التشغيل */}
                  {farm.has_active_operation && (
                    <div className={`${phaseClasses.bg} border ${phaseClasses.border} rounded-lg p-3 mb-4`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className={`text-sm font-semibold ${phaseClasses.text} mb-1`}>
                            المرحلة الحالية
                          </div>
                          <div className={`text-xs ${phaseClasses.textLight}`}>
                            {farm.operation_current_phase}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-2xl font-bold ${phaseClasses.textLight}`}>
                            {farm.operation_progress}%
                          </div>
                          <div className="text-xs text-gray-500">التقدم</div>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                        <div
                          className={`${phaseClasses.bar} h-2 rounded-full transition-all`}
                          style={{ width: `${farm.operation_progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* زر الإجراء */}
                  <button
                    onClick={() => onSelectFarm(farm.id)}
                    className="w-full px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                  >
                    {farm.has_active_operation ? (
                      <>
                        <Tractor className="w-5 h-5" />
                        إدارة تشغيل المزرعة
                        <ChevronRight className="w-5 h-5" />
                      </>
                    ) : (
                      <>
                        <PlayCircle className="w-5 h-5" />
                        بدء تشغيل المزرعة
                        <ChevronRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
