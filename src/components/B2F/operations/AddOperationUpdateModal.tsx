import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import {
  X,
  Loader2,
  TrendingUp,
  Clock,
  Wrench,
  Droplet,
  Sprout,
  Shield,
  Package,
  Info,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

interface OperationPhase {
  id: string;
  name_ar: string;
  description: string;
  icon: string;
  color: string;
}

interface AddOperationUpdateModalProps {
  farmId: string;
  farmName: string;
  affectedContracts: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddOperationUpdateModal({
  farmId,
  farmName,
  affectedContracts,
  onClose,
  onSuccess
}: AddOperationUpdateModalProps) {
  const [updateType, setUpdateType] = useState('general');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPhase, setSelectedPhase] = useState('');
  const [progress, setProgress] = useState<number | null>(null);
  const [phases, setPhases] = useState<OperationPhase[]>([]);
  const [sendToInvestors, setSendToInvestors] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPhases();
  }, []);

  const loadPhases = async () => {
    const { data } = await supabase
      .from('b2f_farm_operation_phases')
      .select('*')
      .eq('is_active', true)
      .order('order_number');

    if (data) setPhases(data);
  };

  const updateTypes = [
    { id: 'phase_change', name: 'تغيير المرحلة', icon: TrendingUp, color: 'emerald' },
    { id: 'progress_update', name: 'تحديث التقدم', icon: Clock, color: 'blue' },
    { id: 'maintenance', name: 'صيانة', icon: Wrench, color: 'amber' },
    { id: 'irrigation', name: 'ري', icon: Droplet, color: 'cyan' },
    { id: 'fertilization', name: 'تسميد', icon: Sprout, color: 'green' },
    { id: 'pest_control', name: 'مكافحة آفات', icon: Shield, color: 'red' },
    { id: 'harvest', name: 'حصاد', icon: Package, color: 'orange' },
    { id: 'general', name: 'عام', icon: Info, color: 'gray' }
  ];

  const handleSubmit = async () => {
    if (!title || !description) {
      alert('الرجاء إدخال العنوان والوصف');
      return;
    }

    try {
      setLoading(true);
      let updateId: string | null = null;

      // إذا كان التحديث تغيير مرحلة
      if (updateType === 'phase_change' && selectedPhase) {
        const { data, error } = await supabase.rpc('update_farm_operation_phase', {
          p_farm_id: farmId,
          p_new_phase: selectedPhase,
          p_title: title,
          p_description: description,
          p_progress: progress
        });

        if (error) throw error;

        if (data?.success) {
          updateId = data.update_id;
        } else {
          alert(data?.error || 'حدث خطأ');
          return;
        }
      } else {
        // تحديث عام
        const { data, error } = await supabase.rpc('add_farm_operation_update', {
          p_farm_id: farmId,
          p_update_type: updateType,
          p_title: title,
          p_description: description,
          p_visible: true
        });

        if (error) throw error;

        if (data?.success) {
          updateId = data.update_id;
        } else {
          alert(data?.error || 'حدث خطأ');
          return;
        }
      }

      // إرسال للمستثمرين إذا تم اختيار ذلك
      if (sendToInvestors && updateId) {
        const { data: sendData, error: sendError } = await supabase.rpc('send_farm_update_to_investors', {
          p_farm_id: farmId,
          p_operation_update_id: updateId
        });

        if (sendError) throw sendError;

        if (sendData?.success) {
          alert(sendData.message);
        } else {
          alert('تم حفظ التحديث ولكن فشل الإرسال للمستثمرين');
        }
      } else {
        alert('تم حفظ التحديث بنجاح (لم يتم إرساله للمستثمرين)');
      }

      onSuccess();
    } catch (error) {
      console.error('Error adding update:', error);
      alert('حدث خطأ أثناء إضافة التحديث');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* الرأس */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">إضافة تحديث تشغيلي</h2>
            <p className="text-sm text-gray-600 mt-1">
              {farmName} • سيصل لـ <span className="font-semibold text-emerald-600">{affectedContracts}</span> عقد نشط
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* تنبيه */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-blue-900 mb-1">تحديث على مستوى المزرعة</h4>
                <p className="text-sm text-blue-700">
                  هذا التحديث سيظهر تلقائياً لجميع المستثمرين المرتبطين بهذه المزرعة عبر عقودهم النشطة
                </p>
              </div>
            </div>
          </div>

          {/* نوع التحديث */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              نوع التحديث
            </label>
            <div className="grid grid-cols-2 gap-3">
              {updateTypes.map((type) => {
                const Icon = type.icon;
                const isSelected = updateType === type.id;
                return (
                  <button
                    key={type.id}
                    onClick={() => setUpdateType(type.id)}
                    className={`p-4 rounded-lg border-2 text-right transition-all ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 rounded-lg bg-gray-100">
                        <Icon className="w-5 h-5 text-gray-700" />
                      </div>
                      <span className="font-medium text-gray-900 text-sm">
                        {type.name}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* اختيار المرحلة (إذا كان التحديث تغيير مرحلة) */}
          {updateType === 'phase_change' && (
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                المرحلة الجديدة
              </label>
              <div className="grid grid-cols-2 gap-3">
                {phases.map((phase) => (
                  <button
                    key={phase.id}
                    onClick={() => setSelectedPhase(phase.id)}
                    className={`p-3 rounded-lg border-2 text-right transition-all ${
                      selectedPhase === phase.id
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-gray-900 text-sm mb-1">
                      {phase.name_ar}
                    </div>
                    <div className="text-xs text-gray-600">
                      {phase.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* نسبة التقدم (اختياري) */}
          {updateType === 'phase_change' && (
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                نسبة التقدم (اختياري): {progress !== null ? `${progress}%` : 'غير محدد'}
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={progress || 0}
                onChange={(e) => setProgress(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0%</span>
                <span>25%</span>
                <span>50%</span>
                <span>75%</span>
                <span>100%</span>
              </div>
            </div>
          )}

          {/* العنوان */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              عنوان التحديث
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: تم الانتقال لمرحلة الري والرعاية"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-right"
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
              placeholder="اكتب تفاصيل التحديث التي سيراها المستثمرون..."
              rows={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none text-right"
            />
            <p className="text-xs text-gray-500 mt-2">
              سيظهر هذا التحديث في تبويب "تشغيل أشجاري" لجميع المستثمرين
            </p>
          </div>

          {/* خيار الإرسال للمستثمرين */}
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="sendToInvestors"
                checked={sendToInvestors}
                onChange={(e) => setSendToInvestors(e.target.checked)}
                className="mt-1 w-5 h-5 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
              />
              <div className="flex-1">
                <label htmlFor="sendToInvestors" className="block font-semibold text-blue-900 mb-1 cursor-pointer">
                  إرسال التحديث للمستثمرين
                </label>
                <p className="text-sm text-blue-700 mb-2">
                  عند التفعيل، سيصل هذا التحديث فوراً لـ <span className="font-bold">{affectedContracts}</span> عقد نشط
                  في تبويب "تشغيل أشجاري"
                </p>
                <p className="text-xs text-blue-600">
                  {sendToInvestors
                    ? '✅ سيتم إرسال التحديث تلقائياً لجميع المستثمرين المرتبطين بالمزرعة'
                    : '⚠️ سيتم حفظ التحديث في سجل المزرعة فقط بدون إرساله للمستثمرين'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* معاينة */}
          {title && description && sendToInvestors && (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">معاينة ما سيراه المستثمر:</h4>
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-1">{title}</h4>
                    <p className="text-sm text-gray-700 mb-2">{description}</p>
                    <p className="text-xs text-gray-500">
                      {new Date().toLocaleDateString('ar-SA', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* الأزرار */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-6 flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 font-medium"
          >
            إلغاء
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !title || !description}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium shadow-lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                جاري الإضافة...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                إضافة التحديث
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
