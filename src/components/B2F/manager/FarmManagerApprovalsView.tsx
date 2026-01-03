import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { CheckCircle, XCircle, Image as ImageIcon, FileText, Send, Eye } from 'lucide-react';

interface TaskWithProof {
  id: string;
  title: string;
  description: string;
  type: string;
  created_by_name: string;
  assigned_to_name: string;
  submitted_at: string;
  proof: {
    id: string;
    notes: string | null;
    attachments: Array<{ url: string; filename: string; uploaded_at: string }>;
    submitted_at: string;
  } | null;
}

interface Props {
  farmId: string;
}

export default function FarmManagerApprovalsView({ farmId }: Props) {
  const [tasks, setTasks] = useState<TaskWithProof[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<TaskWithProof | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalMode, setApprovalMode] = useState<'approve' | 'reject'>('approve');

  // خيارات بعد الاعتماد
  const [convertToUpdate, setConvertToUpdate] = useState(false);
  const [sendToAdmin, setSendToAdmin] = useState(false);

  // ملاحظات
  const [notes, setNotes] = useState('');

  // تقرير المدير العام
  const [reportTitle, setReportTitle] = useState('');
  const [reportSummary, setReportSummary] = useState('');
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);

  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadPendingApprovals();
  }, [farmId]);

  const loadPendingApprovals = async () => {
    try {
      const { data: tasksData, error: tasksError } = await supabase
        .from('farm_tasks')
        .select('*')
        .eq('farm_id', farmId)
        .eq('status', 'submitted')
        .order('submitted_at', { ascending: true });

      if (tasksError) throw tasksError;

      // جلب الإثباتات
      const tasksWithProofs = await Promise.all(
        (tasksData || []).map(async (task) => {
          const { data: proofData } = await supabase
            .from('task_proofs')
            .select('*')
            .eq('task_id', task.id)
            .single();

          return {
            ...task,
            proof: proofData
          };
        })
      );

      setTasks(tasksWithProofs);
    } catch (error) {
      console.error('Error loading approvals:', error);
      alert('حدث خطأ في تحميل المهام المعلقة');
    } finally {
      setLoading(false);
    }
  };

  const openApprovalModal = (task: TaskWithProof, mode: 'approve' | 'reject') => {
    setSelectedTask(task);
    setApprovalMode(mode);
    setShowApprovalModal(true);
    setNotes('');
    setConvertToUpdate(false);
    setSendToAdmin(false);
    setReportTitle('');
    setReportSummary('');
    setSelectedPhotos([]);
  };

  const approveTask = async () => {
    if (!selectedTask) return;

    setProcessing(true);
    try {
      // اعتماد المهمة
      const { data: approvalData, error: approvalError } = await supabase
        .rpc('approve_task_proof', {
          p_task_id: selectedTask.id,
          p_approval_notes: notes || null
        });

      if (approvalError) throw approvalError;

      if (!approvalData?.success) {
        alert(approvalData?.error || 'حدث خطأ في الاعتماد');
        return;
      }

      // خيار 1: تحويل لتحديث للمستثمرين
      if (convertToUpdate && selectedTask.proof) {
        await convertToInvestorUpdate(selectedTask);
      }

      // خيار 2: إرسال تقرير للمدير العام
      if (sendToAdmin && selectedTask.proof) {
        await createManagementReport(selectedTask);
      }

      alert('تم اعتماد المهمة بنجاح');
      setShowApprovalModal(false);
      loadPendingApprovals();
    } catch (error) {
      console.error('Error approving task:', error);
      alert('حدث خطأ في اعتماد المهمة');
    } finally {
      setProcessing(false);
    }
  };

  const convertToInvestorUpdate = async (task: TaskWithProof) => {
    try {
      // إنشاء تحديث تشغيلي للمستثمرين
      const { data, error } = await supabase.rpc('add_farm_operation_update', {
        p_farm_id: farmId,
        p_update_type: task.type,
        p_title: task.title,
        p_description: `${task.description}\n\n${task.proof?.notes || ''}`,
        p_images: task.proof?.attachments || [],
        p_visible: true
      });

      if (error) throw error;

      if (data?.success) {
        // تحديث المهمة
        await supabase
          .from('farm_tasks')
          .update({
            converted_to_update: true,
            operation_update_id: data.update_id
          })
          .eq('id', task.id);

        // إرسال للمستثمرين
        if (data.update_id) {
          await supabase.rpc('send_farm_update_to_investors', {
            p_farm_id: farmId,
            p_operation_update_id: data.update_id
          });
        }
      }
    } catch (error) {
      console.error('Error converting to update:', error);
      throw error;
    }
  };

  const createManagementReport = async (task: TaskWithProof) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // استخدام الدالة المحصنة الجديدة
      const { data, error } = await supabase.rpc('create_management_report_safe', {
        p_task_id: task.id,
        p_farm_id: farmId,
        p_approved_by: user.id,
        p_title: reportTitle || task.title,
        p_summary: reportSummary || task.description,
        p_approved_photos: JSON.stringify(
          selectedPhotos.map(url => ({ url, approved: true }))
        ),
        p_send_to_investors: convertToUpdate // دمج الخيارين: تقرير + إرسال للمستثمرين
      });

      if (error) throw error;

      if (!data?.success) {
        throw new Error(data?.error || 'فشل إنشاء التقرير');
      }

      // عرض النتيجة
      if (data.investors_notified > 0) {
        alert(`تم إنشاء التقرير وإرساله إلى ${data.investors_notified} مستثمر`);
      } else {
        alert('تم إنشاء التقرير بنجاح');
      }
    } catch (error) {
      console.error('Error creating report:', error);
      throw error;
    }
  };

  const rejectTask = async () => {
    if (!selectedTask) return;

    if (!notes.trim()) {
      alert('يجب كتابة سبب الإرجاع');
      return;
    }

    setProcessing(true);
    try {
      const { data, error } = await supabase
        .rpc('reject_task_proof', {
          p_task_id: selectedTask.id,
          p_rejection_reason: notes
        });

      if (error) throw error;

      if (data?.success) {
        alert('تم إرجاع المهمة للمشرف');
        setShowApprovalModal(false);
        loadPendingApprovals();
      } else {
        alert(data?.error || 'حدث خطأ');
      }
    } catch (error) {
      console.error('Error rejecting task:', error);
      alert('حدث خطأ في رفض المهمة');
    } finally {
      setProcessing(false);
    }
  };

  const togglePhotoSelection = (url: string) => {
    setSelectedPhotos(prev =>
      prev.includes(url)
        ? prev.filter(p => p !== url)
        : prev.length < 3
        ? [...prev, url]
        : prev
    );
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
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">اعتمادات المشرفين</h2>
          <p className="text-sm text-gray-600 mt-1">المهام المقدمة للاعتماد</p>
        </div>

        <div className="divide-y divide-gray-200">
          {tasks.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <CheckCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>لا توجد مهام معلقة للاعتماد</p>
            </div>
          ) : (
            tasks.map((task) => (
              <div key={task.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="mb-4">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-gray-800">{task.title}</h3>
                    <span className="text-sm px-2 py-1 bg-purple-100 text-purple-700 rounded">
                      {getTypeLabel(task.type)}
                    </span>
                  </div>

                  <p className="text-gray-600 text-sm mb-2">{task.description}</p>

                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>المشرف: {task.assigned_to_name}</span>
                    <span>تاريخ التقديم: {new Date(task.submitted_at).toLocaleString('ar-SA')}</span>
                  </div>
                </div>

                {/* الإثبات */}
                {task.proof && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    {/* الصور */}
                    {task.proof.attachments && task.proof.attachments.length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm font-medium text-gray-700 mb-2">
                          الصور المرفقة ({task.proof.attachments.length})
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                          {task.proof.attachments.map((attachment, index) => (
                            <a
                              key={index}
                              href={attachment.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="aspect-square rounded-lg overflow-hidden border-2 border-gray-200 hover:border-green-500 transition-colors"
                            >
                              <img
                                src={attachment.url}
                                alt={`صورة ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* الملاحظات */}
                    {task.proof.notes && (
                      <div className="p-3 bg-white border border-gray-200 rounded">
                        <p className="text-sm font-medium text-gray-700 mb-1">ملاحظات المشرف:</p>
                        <p className="text-sm text-gray-600">{task.proof.notes}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* الأزرار */}
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => openApprovalModal(task, 'approve')}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" />
                    اعتماد
                  </button>

                  <button
                    onClick={() => openApprovalModal(task, 'reject')}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                    إرجاع
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* نموذج الاعتماد/الرفض */}
      {showApprovalModal && selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-800">
                {approvalMode === 'approve' ? 'اعتماد المهمة' : 'إرجاع المهمة'}
              </h3>
              <p className="text-sm text-gray-600 mt-1">{selectedTask.title}</p>
            </div>

            <div className="p-6 space-y-6">
              {approvalMode === 'approve' ? (
                <>
                  {/* ملاحظات الاعتماد */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ملاحظات الاعتماد (اختياري)
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      placeholder="أضف ملاحظات إن وجدت..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>

                  {/* خيارات بعد الاعتماد */}
                  <div className="border-t pt-4">
                    <p className="font-medium text-gray-800 mb-3">بعد الاعتماد:</p>

                    <div className="space-y-3">
                      <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={convertToUpdate}
                          onChange={(e) => setConvertToUpdate(e.target.checked)}
                          className="mt-1"
                        />
                        <div>
                          <p className="font-medium text-gray-800">تحويل إلى تحديث تشغيلي للمستثمرين</p>
                          <p className="text-xs text-gray-600 mt-1">سيظهر هذا التحديث في صفحة "تشغيل أشجاري" لجميع المستثمرين</p>
                        </div>
                      </label>

                      <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={sendToAdmin}
                          onChange={(e) => setSendToAdmin(e.target.checked)}
                          className="mt-1"
                        />
                        <div>
                          <p className="font-medium text-gray-800">إرسال تقرير توثيق للمدير العام</p>
                          <p className="text-xs text-gray-600 mt-1">توثيق داخلي للإدارة العليا</p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* نموذج التقرير للمدير العام */}
                  {sendToAdmin && selectedTask.proof && (
                    <div className="border-t pt-4 space-y-4">
                      <p className="font-medium text-gray-800">تفاصيل التقرير:</p>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          عنوان التقرير
                        </label>
                        <input
                          type="text"
                          value={reportTitle}
                          onChange={(e) => setReportTitle(e.target.value)}
                          placeholder={selectedTask.title}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          ملخص التقرير
                        </label>
                        <textarea
                          value={reportSummary}
                          onChange={(e) => setReportSummary(e.target.value)}
                          rows={3}
                          placeholder={selectedTask.description}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          اختر أفضل 1-3 صور للتقرير
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                          {selectedTask.proof.attachments.map((attachment, index) => (
                            <div
                              key={index}
                              onClick={() => togglePhotoSelection(attachment.url)}
                              className={`aspect-square rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                                selectedPhotos.includes(attachment.url)
                                  ? 'border-green-500 ring-2 ring-green-200'
                                  : 'border-gray-200 hover:border-green-300'
                              }`}
                            >
                              <img
                                src={attachment.url}
                                alt={`صورة ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                              {selectedPhotos.includes(attachment.url) && (
                                <div className="absolute inset-0 bg-green-500 bg-opacity-20 flex items-center justify-center">
                                  <CheckCircle className="w-8 h-8 text-green-600" />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          تم اختيار {selectedPhotos.length} من 3 صور
                        </p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* نموذج الرفض */
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    سبب الإرجاع *
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    placeholder="اذكر سبب إرجاع المهمة للمشرف..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                  />
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={approvalMode === 'approve' ? approveTask : rejectTask}
                disabled={processing}
                className={`flex-1 px-6 py-3 text-white rounded-lg font-medium transition-colors ${
                  approvalMode === 'approve'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                } disabled:bg-gray-400 disabled:cursor-not-allowed`}
              >
                {processing
                  ? 'جاري المعالجة...'
                  : approvalMode === 'approve'
                  ? 'اعتماد المهمة'
                  : 'إرجاع المهمة'}
              </button>

              <button
                onClick={() => setShowApprovalModal(false)}
                disabled={processing}
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
