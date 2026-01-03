import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { ClipboardList, Clock, CheckCircle, XCircle, PlayCircle, Upload, Image, X } from 'lucide-react';

interface Task {
  id: string;
  farm_id: string;
  type: string;
  title: string;
  description: string;
  due_date: string | null;
  status: 'new' | 'in_progress' | 'submitted' | 'approved' | 'rejected';
  rejection_reason: string | null;
  started_at: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  created_at: string;
  farm_name?: string;
}

interface TaskStats {
  total: number;
  pending: number;
  awaiting_approval: number;
  approved: number;
  rejected: number;
}

export default function SupervisorTasksView() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<TaskStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showProofModal, setShowProofModal] = useState(false);

  // نموذج رفع الإثبات
  const [proofNotes, setProofNotes] = useState('');
  const [proofImages, setProofImages] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadTasks();
    loadStats();
  }, []);

  const loadTasks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('farm_tasks')
        .select(`
          *,
          b2f_farms(name)
        `)
        .eq('assigned_to_user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const tasksWithFarmName = data?.map(task => ({
        ...task,
        farm_name: task.b2f_farms?.name
      })) || [];

      setTasks(tasksWithFarmName);
    } catch (error) {
      console.error('Error loading tasks:', error);
      alert('حدث خطأ في تحميل المهام');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .rpc('get_supervisor_tasks_stats', { p_user_id: user.id });

      if (error) throw error;
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const startTask = async (taskId: string) => {
    try {
      const { data, error } = await supabase
        .rpc('start_task', { p_task_id: taskId });

      if (error) throw error;

      if (data?.success) {
        alert('تم بدء المهمة بنجاح');
        loadTasks();
        loadStats();
      } else {
        alert(data?.error || 'حدث خطأ');
      }
    } catch (error) {
      console.error('Error starting task:', error);
      alert('حدث خطأ في بدء المهمة');
    }
  };

  const openProofModal = (task: Task) => {
    setSelectedTask(task);
    setShowProofModal(true);
    setProofNotes('');
    setProofImages([]);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + proofImages.length > 5) {
      alert('الحد الأقصى 5 صور');
      return;
    }
    setProofImages(prev => [...prev, ...files]);
  };

  const removeImage = (index: number) => {
    setProofImages(prev => prev.filter((_, i) => i !== index));
  };

  const submitProof = async () => {
    if (!selectedTask) return;

    if (proofImages.length === 0) {
      alert('يجب إرفاق صورة واحدة على الأقل');
      return;
    }

    setUploading(true);
    try {
      // رفع الصور
      const uploadedUrls: string[] = [];

      for (const file of proofImages) {
        const fileName = `${selectedTask.farm_id}/${selectedTask.id}/${Date.now()}_${file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('farm-task-proofs')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('farm-task-proofs')
          .getPublicUrl(uploadData.path);

        uploadedUrls.push(publicUrl);
      }

      // إرسال الإثبات
      const attachments = uploadedUrls.map((url, index) => ({
        url,
        filename: proofImages[index].name,
        uploaded_at: new Date().toISOString()
      }));

      const { data, error } = await supabase
        .rpc('submit_task_proof', {
          p_task_id: selectedTask.id,
          p_notes: proofNotes || null,
          p_attachments: attachments
        });

      if (error) throw error;

      if (data?.success) {
        alert('تم إرسال الإثبات بنجاح. في انتظار اعتماد المدير.');
        setShowProofModal(false);
        loadTasks();
        loadStats();
      } else {
        alert(data?.error || 'حدث خطأ');
      }
    } catch (error) {
      console.error('Error submitting proof:', error);
      alert('حدث خطأ في إرسال الإثبات');
    } finally {
      setUploading(false);
    }
  };

  const getTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      irrigation: 'ري',
      fertilization: 'تسميد',
      pest_control: 'مكافحة آفات',
      maintenance: 'صيانة',
      harvest: 'حصاد',
      pruning: 'تقليم',
      general: 'عام'
    };
    return types[type] || type;
  };

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { label: string; color: string; icon: any }> = {
      new: { label: 'جديدة', color: 'bg-blue-500', icon: ClipboardList },
      in_progress: { label: 'قيد التنفيذ', color: 'bg-yellow-500', icon: Clock },
      submitted: { label: 'قيد الاعتماد', color: 'bg-purple-500', icon: Upload },
      approved: { label: 'معتمدة', color: 'bg-green-500', icon: CheckCircle },
      rejected: { label: 'مرفوضة', color: 'bg-red-500', icon: XCircle }
    };

    const config = configs[status] || configs.new;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-white ${config.color}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* الإحصائيات */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm opacity-90">إجمالي المهام</div>
          </div>

          <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white rounded-lg p-4">
            <div className="text-2xl font-bold">{stats.pending}</div>
            <div className="text-sm opacity-90">قيد التنفيذ</div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg p-4">
            <div className="text-2xl font-bold">{stats.awaiting_approval}</div>
            <div className="text-sm opacity-90">قيد الاعتماد</div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg p-4">
            <div className="text-2xl font-bold">{stats.approved}</div>
            <div className="text-sm opacity-90">معتمدة</div>
          </div>

          <div className="bg-gradient-to-br from-red-500 to-red-600 text-white rounded-lg p-4">
            <div className="text-2xl font-bold">{stats.rejected}</div>
            <div className="text-sm opacity-90">مرفوضة</div>
          </div>
        </div>
      )}

      {/* قائمة المهام */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">مهامي</h2>
          <p className="text-sm text-gray-600 mt-1">جميع المهام الموكلة إليك</p>
        </div>

        <div className="divide-y divide-gray-200">
          {tasks.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <ClipboardList className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>لا توجد مهام حالياً</p>
            </div>
          ) : (
            tasks.map((task) => (
              <div key={task.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-gray-800">{task.title}</h3>
                      {getStatusBadge(task.status)}
                      <span className="text-sm px-2 py-1 bg-gray-100 rounded">
                        {getTypeLabel(task.type)}
                      </span>
                    </div>

                    <p className="text-gray-600 text-sm mb-2">{task.description}</p>

                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      {task.farm_name && (
                        <span>المزرعة: {task.farm_name}</span>
                      )}
                      {task.due_date && (
                        <span>التسليم: {new Date(task.due_date).toLocaleDateString('ar-SA')}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* سبب الرفض */}
                {task.status === 'rejected' && task.rejection_reason && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm font-semibold text-red-800 mb-1">سبب الإرجاع:</p>
                    <p className="text-sm text-red-700">{task.rejection_reason}</p>
                  </div>
                )}

                {/* الأزرار */}
                <div className="mt-4 flex gap-2">
                  {task.status === 'new' && (
                    <button
                      onClick={() => startTask(task.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <PlayCircle className="w-4 h-4" />
                      بدء المهمة
                    </button>
                  )}

                  {task.status === 'in_progress' && (
                    <button
                      onClick={() => openProofModal(task)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Upload className="w-4 h-4" />
                      إرسال الإثبات
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* نموذج رفع الإثبات */}
      {showProofModal && selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-800">إرسال إثبات التنفيذ</h3>
              <p className="text-sm text-gray-600 mt-1">{selectedTask.title}</p>
            </div>

            <div className="p-6 space-y-6">
              {/* رفع الصور */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الصور (1-5 صور مطلوبة) *
                </label>

                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  className="hidden"
                  id="proof-images"
                  disabled={proofImages.length >= 5}
                />

                <label
                  htmlFor="proof-images"
                  className={`flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                    proofImages.length >= 5
                      ? 'border-gray-300 bg-gray-100 cursor-not-allowed'
                      : 'border-green-300 hover:border-green-500 hover:bg-green-50'
                  }`}
                >
                  <Image className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-gray-700">
                    {proofImages.length >= 5 ? 'تم الوصول للحد الأقصى' : 'اختر صور'}
                  </span>
                </label>

                {/* معاينة الصور */}
                {proofImages.length > 0 && (
                  <div className="grid grid-cols-3 gap-3 mt-3">
                    {proofImages.map((file, index) => (
                      <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`صورة ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => removeImage(index)}
                          className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ملاحظات */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ملاحظات (اختياري)
                </label>
                <textarea
                  value={proofNotes}
                  onChange={(e) => setProofNotes(e.target.value)}
                  rows={4}
                  placeholder="أضف أي ملاحظات أو تفاصيل إضافية..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={submitProof}
                disabled={uploading || proofImages.length === 0}
                className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors"
              >
                {uploading ? 'جاري الإرسال...' : 'إرسال الإثبات'}
              </button>

              <button
                onClick={() => setShowProofModal(false)}
                disabled={uploading}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 font-medium transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
