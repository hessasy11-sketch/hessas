import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import {
  CheckCircle,
  Wrench,
  Droplet,
  Sprout,
  Calendar,
  Package,
  Loader2,
  MapPin,
  Clock,
  TrendingUp,
  AlertCircle,
  ChevronRight,
  Edit3,
  PauseCircle,
  PlayCircle
} from 'lucide-react';
import { useSystemMessages } from '../../../hooks/useSystemMessages';
import SystemMessageBanner from '../SystemMessageBanner';

interface TreeOperation {
  id: string;
  contractNumber: string;
  investorName: string;
  investorPhone: string;
  investorClassification: string;
  treeType: string;
  treeCount: number;
  currentPhase: string;
  progressPercentage: number;
  farmSection: string | null;
  farmPlot: string | null;
  internalCode: string | null;
  lastUpdateDescription: string;
  lastUpdateDate: string;
  isPaused: boolean;
  farm: {
    name: string;
    location: string;
    city: string;
  };
}

interface OperationPhase {
  id: string;
  nameAr: string;
  description: string;
  icon: string;
  color: string;
  orderNumber: number;
}

interface ClassificationInfo {
  id: string;
  nameAr: string;
  icon: string;
  color: string;
  description: string;
}

export default function NewOperationsTab() {
  const [operations, setOperations] = useState<TreeOperation[]>([]);
  const [phases, setPhases] = useState<OperationPhase[]>([]);
  const [classifications, setClassifications] = useState<ClassificationInfo[]>([]);
  const [selectedPhase, setSelectedPhase] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [selectedOperation, setSelectedOperation] = useState<TreeOperation | null>(null);
  const { getMessage } = useSystemMessages('operations');

  useEffect(() => {
    loadData();
  }, [selectedPhase]);

  const loadData = async () => {
    try {
      setLoading(true);

      // جلب المراحل
      const { data: phasesData } = await supabase
        .from('b2f_operation_phases')
        .select('*')
        .order('order_number');

      if (phasesData) setPhases(phasesData);

      // جلب التصنيفات
      const { data: classificationsData } = await supabase
        .from('b2f_investor_classifications')
        .select('*')
        .order('order_number');

      if (classificationsData) setClassifications(classificationsData);

      // جلب البطاقات التشغيلية
      let query = supabase
        .from('b2f_tree_operations')
        .select(`
          *,
          farm:b2f_farms(name, location, city)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (selectedPhase !== 'all') {
        query = query.eq('current_phase', selectedPhase);
      }

      const { data: operationsData, error } = await query;

      if (error) throw error;

      setOperations(operationsData || []);
    } catch (error) {
      console.error('Error loading operations:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPhaseIcon = (phaseId: string) => {
    const icons: Record<string, any> = {
      activation: CheckCircle,
      service: Wrench,
      irrigation: Droplet,
      fruiting: Sprout,
      pre_harvest: Calendar,
      ready: Package
    };
    return icons[phaseId] || CheckCircle;
  };

  const getPhaseColor = (phaseId: string) => {
    const colors: Record<string, string> = {
      activation: 'emerald',
      service: 'blue',
      irrigation: 'cyan',
      fruiting: 'amber',
      pre_harvest: 'orange',
      ready: 'green'
    };
    return colors[phaseId] || 'gray';
  };

  const getClassificationInfo = (classId: string) => {
    return classifications.find(c => c.id === classId);
  };

  const stats = {
    total: operations.length,
    byPhase: phases.reduce((acc, phase) => {
      acc[phase.id] = operations.filter(op => op.currentPhase === phase.id).length;
      return acc;
    }, {} as Record<string, number>),
    totalTrees: operations.reduce((sum, op) => sum + op.treeCount, 0),
    paused: operations.filter(op => op.isPaused).length
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
      {/* الإحصائيات */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-5 h-5 opacity-80" />
            <span className="text-2xl font-bold">{stats.total}</span>
          </div>
          <p className="text-sm opacity-90">إجمالي البطاقات التشغيلية</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between mb-2">
            <Sprout className="w-5 h-5 opacity-80" />
            <span className="text-2xl font-bold">{stats.totalTrees.toLocaleString()}</span>
          </div>
          <p className="text-sm opacity-90">إجمالي الأشجار قيد التشغيل</p>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-5 h-5 opacity-80" />
            <span className="text-2xl font-bold">{stats.byPhase.activation || 0}</span>
          </div>
          <p className="text-sm opacity-90">في مرحلة التفعيل</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between mb-2">
            <Package className="w-5 h-5 opacity-80" />
            <span className="text-2xl font-bold">{stats.byPhase.ready || 0}</span>
          </div>
          <p className="text-sm opacity-90">جاهز للإنتاج</p>
        </div>
      </div>

      {/* رسالة دخول الموسم */}
      {getMessage('operations', 'season_started') && (
        <SystemMessageBanner
          message={getMessage('operations', 'season_started')?.message_text || ''}
          icon={getMessage('operations', 'season_started')?.icon}
          type="info"
        />
      )}

      {/* فلتر المراحل */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">تصفية حسب المرحلة</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedPhase('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              selectedPhase === 'all'
                ? 'bg-emerald-500 text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            الكل ({stats.total})
          </button>
          {phases.map(phase => {
            const Icon = getPhaseIcon(phase.id);
            const color = getPhaseColor(phase.id);
            const count = stats.byPhase[phase.id] || 0;

            return (
              <button
                key={phase.id}
                onClick={() => setSelectedPhase(phase.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedPhase === phase.id
                    ? `bg-${color}-500 text-white shadow-lg`
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {phase.nameAr} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* قائمة البطاقات التشغيلية */}
      {operations.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">لا توجد بطاقات تشغيلية</h3>
          <p className="text-gray-600">
            {selectedPhase === 'all'
              ? 'لم يتم تحويل أي طلبات من قسم العقود بعد'
              : 'لا توجد بطاقات في هذه المرحلة حالياً'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {operations.map(operation => {
            const classInfo = getClassificationInfo(operation.investorClassification);
            const PhaseIcon = getPhaseIcon(operation.currentPhase);
            const phaseColor = getPhaseColor(operation.currentPhase);
            const currentPhaseInfo = phases.find(p => p.id === operation.currentPhase);

            return (
              <div
                key={operation.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-gray-900">
                          {operation.investorName}
                        </h3>
                        {classInfo && (
                          <span className="px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-semibold rounded-full">
                            {classInfo.icon} {classInfo.nameAr}
                          </span>
                        )}
                        {operation.isPaused && (
                          <span className="px-3 py-1 bg-orange-100 text-orange-700 text-xs font-semibold rounded-full flex items-center gap-1">
                            <PauseCircle className="w-3 h-3" />
                            متوقف مؤقتاً
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {operation.farm?.name || 'غير محدد'}
                        </span>
                        <span>•</span>
                        <span>{operation.farm?.city || 'غير محدد'}</span>
                        <span>•</span>
                        <span className="font-medium text-emerald-600">
                          {operation.treeCount} شجرة
                        </span>
                        <span>•</span>
                        <span className="text-gray-500">{operation.treeType}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500 mb-1">رقم العقد</div>
                      <div className="text-sm font-mono font-semibold text-gray-900">
                        {operation.contractNumber}
                      </div>
                    </div>
                  </div>

                  {/* المرحلة الحالية */}
                  <div className={`bg-${phaseColor}-50 border border-${phaseColor}-200 rounded-lg p-4 mb-4`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`p-2 bg-${phaseColor}-500 text-white rounded-lg`}>
                          <PhaseIcon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className={`text-sm font-bold text-${phaseColor}-900`}>
                            {currentPhaseInfo?.nameAr}
                          </div>
                          <div className={`text-xs text-${phaseColor}-700`}>
                            {currentPhaseInfo?.description}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-2xl font-bold text-${phaseColor}-600`}>
                          {operation.progressPercentage}%
                        </div>
                        <div className="text-xs text-gray-500">التقدم</div>
                      </div>
                    </div>

                    {/* شريط التقدم */}
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`bg-gradient-to-r from-${phaseColor}-500 to-${phaseColor}-600 h-2 rounded-full transition-all duration-500`}
                        style={{ width: `${operation.progressPercentage}%` }}
                      />
                    </div>
                  </div>

                  {/* موقع الأشجار */}
                  {(operation.farmSection || operation.internalCode) && (
                    <div className="bg-gray-50 rounded-lg p-3 mb-4">
                      <div className="text-xs font-semibold text-gray-700 mb-2">موقع الأشجار في المزرعة</div>
                      <div className="flex items-center gap-4 text-sm">
                        {operation.farmSection && (
                          <div>
                            <span className="text-gray-500">القطعة: </span>
                            <span className="font-medium text-gray-900">{operation.farmSection}</span>
                          </div>
                        )}
                        {operation.farmPlot && (
                          <div>
                            <span className="text-gray-500">الصف: </span>
                            <span className="font-medium text-gray-900">{operation.farmPlot}</span>
                          </div>
                        )}
                        {operation.internalCode && (
                          <div>
                            <span className="text-gray-500">الرمز: </span>
                            <span className="font-mono font-medium text-emerald-600">{operation.internalCode}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* آخر تحديث */}
                  <div className="flex items-start gap-2 text-sm text-gray-600 mb-4">
                    <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium">آخر تحديث: </span>
                      {operation.lastUpdateDescription}
                      <span className="text-gray-400 mr-2">
                        ({new Date(operation.lastUpdateDate).toLocaleDateString('ar-SA')})
                      </span>
                    </div>
                  </div>

                  {/* أزرار الإجراءات */}
                  <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => setSelectedOperation(operation)}
                      className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <Edit3 className="w-4 h-4" />
                      تحديث المرحلة
                    </button>
                    <button
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                    >
                      <ChevronRight className="w-4 h-4" />
                      التفاصيل الكاملة
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* نافذة تحديث المرحلة */}
      {selectedOperation && (
        <UpdatePhaseModal
          operation={selectedOperation}
          phases={phases}
          onClose={() => setSelectedOperation(null)}
          onSuccess={() => {
            setSelectedOperation(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}

// مكون تحديث المرحلة
interface UpdatePhaseModalProps {
  operation: TreeOperation;
  phases: OperationPhase[];
  onClose: () => void;
  onSuccess: () => void;
}

function UpdatePhaseModal({ operation, phases, onClose, onSuccess }: UpdatePhaseModalProps) {
  const [selectedPhase, setSelectedPhase] = useState(operation.currentPhase);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [progress, setProgress] = useState(operation.progressPercentage);
  const [loading, setLoading] = useState(false);

  const handleUpdate = async () => {
    if (!title || !description) {
      alert('الرجاء إدخال العنوان والوصف');
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.rpc('update_operation_phase', {
        p_operation_id: operation.id,
        p_new_phase: selectedPhase,
        p_title: title,
        p_description: description,
        p_progress: progress
      });

      if (error) throw error;

      alert('تم تحديث المرحلة بنجاح');
      onSuccess();
    } catch (error) {
      console.error('Error updating phase:', error);
      alert('حدث خطأ أثناء التحديث');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">تحديث المرحلة التشغيلية</h2>
          <p className="text-sm text-gray-600 mt-1">
            {operation.investorName} • {operation.contractNumber}
          </p>
        </div>

        <div className="p-6 space-y-4">
          {/* اختيار المرحلة */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              المرحلة الجديدة
            </label>
            <div className="grid grid-cols-2 gap-2">
              {phases.map(phase => (
                <button
                  key={phase.id}
                  onClick={() => setSelectedPhase(phase.id)}
                  className={`p-3 rounded-lg border-2 text-right transition-all ${
                    selectedPhase === phase.id
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-gray-900 text-sm">{phase.nameAr}</div>
                  <div className="text-xs text-gray-600 mt-1">{phase.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* نسبة التقدم */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              نسبة التقدم: {progress}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
          </div>

          {/* العنوان */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              عنوان التحديث
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: انتقال الأشجار لمرحلة الري"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          {/* الوصف */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              وصف التحديث
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="اكتب تفاصيل التحديث التي سيراها المستثمر..."
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
            />
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            إلغاء
          </button>
          <button
            onClick={handleUpdate}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                جاري التحديث...
              </>
            ) : (
              'تحديث المرحلة'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
