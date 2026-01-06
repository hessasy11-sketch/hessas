import { useState, useEffect } from 'react';
import { TreePine, Wheat, FileText, Plus, Camera } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import AddTreeTypeModal from './modals/AddTreeTypeModal';
import AddCropModal from './modals/AddCropModal';

interface TreeInventory {
  id: string;
  tree_type: string;
  tree_type_ar?: string;
  count: number;
  section?: string;
  health_status: string;
  planting_year?: number;
  notes?: string;
}

interface Crop {
  id: string;
  season_year: number;
  season_name?: string;
  crop_type: string;
  crop_type_ar?: string;
  status: string;
  estimated_quantity?: number;
  actual_quantity?: number;
  unit: string;
  quality_grade?: string;
}

interface AuditSnapshot {
  id: string;
  snapshot_date: string;
  total_trees: number;
  tree_summary: any;
  notes?: string;
  created_by_name?: string;
}

interface FarmContentsTabProps {
  farmId: string;
  canManage: boolean;
}

const FarmContentsTab = ({ farmId, canManage }: FarmContentsTabProps) => {
  const [activeSection, setActiveSection] = useState<'trees' | 'crops' | 'audit'>('trees');
  const [trees, setTrees] = useState<TreeInventory[]>([]);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [audits, setAudits] = useState<AuditSnapshot[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showTreeModal, setShowTreeModal] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [creatingAudit, setCreatingAudit] = useState(false);

  useEffect(() => {
    loadData();
  }, [farmId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load summary
      const { data: summaryData } = await supabase
        .rpc('get_farm_contents_summary', { p_farm_id: farmId });
      setSummary(summaryData);

      // Load trees
      const { data: treesData } = await supabase
        .from('farm_tree_inventory')
        .select('*')
        .eq('farm_id', farmId)
        .order('count', { ascending: false });
      setTrees(treesData || []);

      // Load crops
      const { data: cropsData } = await supabase
        .from('farm_crops')
        .select('*')
        .eq('farm_id', farmId)
        .order('season_year', { ascending: false });
      setCrops(cropsData || []);

      // Load audits
      const { data: auditsData } = await supabase
        .from('farm_audit_snapshots')
        .select('*')
        .eq('farm_id', farmId)
        .order('snapshot_date', { ascending: false })
        .limit(10);
      setAudits(auditsData || []);
    } catch (err: any) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const createAudit = async () => {
    if (!confirm('هل تريد إنشاء جرد لليوم؟\nسيتم حفظ لقطة من محتويات المزرعة الحالية.')) return;

    try {
      setCreatingAudit(true);

      const { data, error } = await supabase
        .rpc('create_farm_audit_snapshot', {
          p_farm_id: farmId,
          p_notes: null
        });

      if (error) throw error;

      alert('تم إنشاء الجرد بنجاح!');
      await loadData();
    } catch (err: any) {
      console.error('Error creating audit:', err);
      alert('فشل إنشاء الجرد: ' + err.message);
    } finally {
      setCreatingAudit(false);
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

  const getCropStatusColor = (status: string) => {
    switch (status) {
      case 'planned': return 'bg-blue-100 text-blue-700';
      case 'in_progress': return 'bg-yellow-100 text-yellow-700';
      case 'harvested': return 'bg-green-100 text-green-700';
      case 'sold': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  const totalTrees = summary?.total_trees || 0;
  const activeCrops = summary?.active_crops || 0;

  return (
    <div className="space-y-6">
      {/* Header with Summary */}
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">محتويات المزرعة</h2>
          {canManage && (
            <button
              onClick={createAudit}
              disabled={creatingAudit}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm disabled:opacity-50"
            >
              <Camera className="w-4 h-4" />
              {creatingAudit ? 'جاري الإنشاء...' : 'إنشاء جرد اليوم'}
            </button>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-3">
            <div className="text-3xl mb-1">🌳</div>
            <div className="text-xs text-gray-600">إجمالي الأشجار</div>
            <div className="text-2xl font-bold text-green-600">{totalTrees.toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-lg p-3">
            <div className="text-3xl mb-1">🌾</div>
            <div className="text-xs text-gray-600">محاصيل نشطة</div>
            <div className="text-2xl font-bold text-yellow-600">{activeCrops}</div>
          </div>
          <div className="bg-white rounded-lg p-3">
            <div className="text-3xl mb-1">📋</div>
            <div className="text-xs text-gray-600">أنواع الأشجار</div>
            <div className="text-2xl font-bold text-blue-600">{trees.length}</div>
          </div>
          <div className="bg-white rounded-lg p-3">
            <div className="text-3xl mb-1">📊</div>
            <div className="text-xs text-gray-600">سجلات الجرد</div>
            <div className="text-2xl font-bold text-purple-600">{audits.length}</div>
          </div>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveSection('trees')}
          className={`px-4 py-2 border-b-2 transition-colors flex items-center gap-2 ${
            activeSection === 'trees'
              ? 'border-green-600 text-green-600 font-semibold'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <TreePine className="w-4 h-4" />
          الأشجار ({trees.length})
        </button>
        <button
          onClick={() => setActiveSection('crops')}
          className={`px-4 py-2 border-b-2 transition-colors flex items-center gap-2 ${
            activeSection === 'crops'
              ? 'border-yellow-600 text-yellow-600 font-semibold'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <Wheat className="w-4 h-4" />
          المحاصيل ({crops.length})
        </button>
        <button
          onClick={() => setActiveSection('audit')}
          className={`px-4 py-2 border-b-2 transition-colors flex items-center gap-2 ${
            activeSection === 'audit'
              ? 'border-blue-600 text-blue-600 font-semibold'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          سجل الجرد ({audits.length})
        </button>
      </div>

      {/* Trees Section */}
      {activeSection === 'trees' && (
        <div>
          {canManage && (
            <div className="mb-4">
              <button
                onClick={() => setShowTreeModal(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                إضافة نوع شجر
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {trees.map((tree) => (
              <div
                key={tree.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {tree.tree_type_ar || tree.tree_type}
                    </h3>
                    {tree.section && (
                      <p className="text-xs text-gray-500">القسم: {tree.section}</p>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${getHealthColor(tree.health_status)}`}>
                    {tree.health_status === 'excellent' ? 'ممتاز' :
                     tree.health_status === 'good' ? 'جيد' :
                     tree.health_status === 'fair' ? 'مقبول' :
                     tree.health_status === 'poor' ? 'ضعيف' :
                     tree.health_status === 'diseased' ? 'مريض' : tree.health_status}
                  </span>
                </div>

                <div className="mb-3">
                  <div className="text-3xl font-bold text-green-600">
                    {tree.count.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-600">شجرة</div>
                </div>

                {tree.planting_year && (
                  <p className="text-xs text-gray-500">
                    سنة الزراعة: {tree.planting_year}
                  </p>
                )}
                {tree.notes && (
                  <p className="text-xs text-gray-600 mt-2 pt-2 border-t border-gray-100">
                    {tree.notes}
                  </p>
                )}
              </div>
            ))}

            {trees.length === 0 && (
              <div className="col-span-3 bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                <TreePine className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">لا توجد أشجار مسجلة</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Crops Section */}
      {activeSection === 'crops' && (
        <div>
          {canManage && (
            <div className="mb-4">
              <button
                onClick={() => setShowCropModal(true)}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                إضافة محصول
              </button>
            </div>
          )}

          <div className="space-y-3">
            {crops.map((crop) => (
              <div
                key={crop.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">
                        {crop.crop_type_ar || crop.crop_type}
                      </h3>
                      <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                        موسم {crop.season_year}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded ${getCropStatusColor(crop.status)}`}>
                        {crop.status === 'planned' ? 'مخطط' :
                         crop.status === 'in_progress' ? 'قيد التنفيذ' :
                         crop.status === 'harvested' ? 'تم الحصاد' :
                         crop.status === 'sold' ? 'تم البيع' : crop.status}
                      </span>
                      {crop.quality_grade && (
                        <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded">
                          {crop.quality_grade === 'excellent' ? 'ممتاز' :
                           crop.quality_grade === 'good' ? 'جيد' :
                           crop.quality_grade === 'standard' ? 'قياسي' : 'ضعيف'}
                        </span>
                      )}
                    </div>
                    {crop.season_name && (
                      <p className="text-sm text-gray-600">{crop.season_name}</p>
                    )}
                  </div>

                  <div className="text-right">
                    {(crop.actual_quantity || crop.estimated_quantity) && (
                      <div className="text-lg font-bold text-green-600">
                        {(crop.actual_quantity || crop.estimated_quantity)?.toLocaleString()} {crop.unit}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {crops.length === 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                <Wheat className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">لا توجد محاصيل مسجلة</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Audit Section */}
      {activeSection === 'audit' && (
        <div className="space-y-3">
          {audits.map((audit) => (
            <div
              key={audit.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    جرد {new Date(audit.snapshot_date).toLocaleDateString('ar-SA')}
                  </h3>
                  {audit.created_by_name && (
                    <p className="text-xs text-gray-500">بواسطة: {audit.created_by_name}</p>
                  )}
                </div>
                <div className="text-2xl font-bold text-green-600">
                  {audit.total_trees.toLocaleString()}
                </div>
              </div>

              {audit.tree_summary && (
                <div className="bg-gray-50 rounded-lg p-3 mb-2">
                  <div className="text-xs font-semibold text-gray-700 mb-2">توزيع الأشجار:</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {Object.entries(audit.tree_summary).map(([type, count]: [string, any]) => (
                      <div key={type} className="text-xs">
                        <span className="text-gray-600">{type}:</span>{' '}
                        <span className="font-semibold text-gray-900">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {audit.notes && (
                <p className="text-sm text-gray-600">{audit.notes}</p>
              )}
            </div>
          ))}

          {audits.length === 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">لا توجد سجلات جرد</p>
              <button
                onClick={createAudit}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
              >
                <Camera className="w-4 h-4" />
                إنشاء أول جرد
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showTreeModal && (
        <AddTreeTypeModal
          farmId={farmId}
          onClose={() => setShowTreeModal(false)}
          onSuccess={() => {
            setShowTreeModal(false);
            loadData();
          }}
        />
      )}

      {showCropModal && (
        <AddCropModal
          farmId={farmId}
          onClose={() => setShowCropModal(false)}
          onSuccess={() => {
            setShowCropModal(false);
            loadData();
          }}
        />
      )}
    </div>
  );
};

export default FarmContentsTab;
