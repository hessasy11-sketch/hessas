import { useState, useEffect } from 'react';
import { Zap, CheckCircle, X, Users, Calendar, Clock, Target } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface TaskTemplate {
  id: string;
  name: string;
  description: string;
  board: string;
  priority: string;
  estimated_duration_minutes?: number;
  requires_proof: boolean;
}

interface Staff {
  id: string;
  full_name: string;
  staff_code: string;
  department: string;
  job_title: string;
}

export function AutoTaskAssignment() {
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedStaff, setSelectedStaff] = useState<string[]>([]);
  const [assignmentType, setAssignmentType] = useState<'manual' | 'auto'>('manual');
  const [scheduledDate, setScheduledDate] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [templatesData, staffData] = await Promise.all([
        supabase
          .from('task_templates')
          .select('*')
          .eq('is_active', true)
          .order('name'),
        supabase
          .from('platform_staff')
          .select('id, full_name, staff_code, department, job_title')
          .eq('is_active', true)
          .order('full_name')
      ]);

      if (templatesData.error) throw templatesData.error;
      if (staffData.error) throw staffData.error;

      setTemplates(templatesData.data || []);
      setStaff(staffData.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleAutoAssign = async () => {
    if (!selectedTemplate) {
      alert('يرجى اختيار قالب المهمة');
      return;
    }

    setSaving(true);
    try {
      const template = templates.find(t => t.id === selectedTemplate);
      if (!template) return;

      // Auto-assign to staff based on department and workload
      const { data: eligibleStaff, error: staffError } = await supabase
        .from('platform_staff')
        .select('id, full_name, department')
        .eq('department', template.board.toUpperCase())
        .eq('is_active', true);

      if (staffError) throw staffError;

      if (!eligibleStaff || eligibleStaff.length === 0) {
        alert('لا يوجد موظفون مؤهلون لهذه المهمة');
        return;
      }

      // Get staff with least tasks
      const { data: taskCounts } = await supabase
        .from('staff_tasks')
        .select('staff_id')
        .in('staff_id', eligibleStaff.map(s => s.id))
        .in('status', ['pending', 'in_progress']);

      const staffWorkload = eligibleStaff.map(s => ({
        ...s,
        taskCount: taskCounts?.filter(t => t.staff_id === s.id).length || 0
      }));

      staffWorkload.sort((a, b) => a.taskCount - b.taskCount);
      const selectedStaffId = staffWorkload[0].id;

      await assignTask(template, selectedStaffId);
      alert(`تم تعيين المهمة تلقائياً إلى: ${staffWorkload[0].full_name}`);

    } catch (error: any) {
      console.error('Error auto-assigning:', error);
      alert('حدث خطأ أثناء التعيين التلقائي');
    } finally {
      setSaving(false);
    }
  };

  const handleManualAssign = async () => {
    if (!selectedTemplate || selectedStaff.length === 0) {
      alert('يرجى اختيار القالب والموظفين');
      return;
    }

    setSaving(true);
    try {
      const template = templates.find(t => t.id === selectedTemplate);
      if (!template) return;

      for (const staffId of selectedStaff) {
        await assignTask(template, staffId);
      }

      alert('تم تعيين المهام بنجاح');
      setSelectedStaff([]);
      setSelectedTemplate('');

    } catch (error) {
      console.error('Error manual assigning:', error);
      alert('حدث خطأ أثناء التعيين');
    } finally {
      setSaving(false);
    }
  };

  const assignTask = async (template: TaskTemplate, staffId: string) => {
    const { error } = await supabase
      .from('staff_tasks')
      .insert([{
        staff_id: staffId,
        template_id: template.id,
        title: template.name,
        description: template.description,
        status: 'pending',
        priority: template.priority,
        board: template.board,
        requires_proof: template.requires_proof,
        due_date: scheduledDate || null
      }]);

    if (error) throw error;
  };

  const toggleStaff = (staffId: string) => {
    setSelectedStaff(prev =>
      prev.includes(staffId)
        ? prev.filter(id => id !== staffId)
        : [...prev, staffId]
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-emerald-500/20 to-teal-600/20 border border-emerald-500/30 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Zap className="w-8 h-8 text-emerald-400" />
          <div>
            <h2 className="text-2xl font-bold text-white">تعيين المهام الذكي</h2>
            <p className="text-emerald-300 text-sm">اختر قالب المهمة وقم بالتعيين تلقائياً أو يدوياً</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel - Configuration */}
        <div className="space-y-4">
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
            <h3 className="text-lg font-bold text-white mb-4">إعدادات المهمة</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-white font-bold mb-2">قالب المهمة</label>
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white"
                >
                  <option value="">اختر قالب المهمة</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.board})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-white font-bold mb-2">نوع التعيين</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setAssignmentType('manual')}
                    className={`px-4 py-3 rounded-lg font-bold transition-all ${
                      assignmentType === 'manual'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    <Users className="w-5 h-5 mx-auto mb-1" />
                    يدوي
                  </button>
                  <button
                    onClick={() => setAssignmentType('auto')}
                    className={`px-4 py-3 rounded-lg font-bold transition-all ${
                      assignmentType === 'auto'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    <Zap className="w-5 h-5 mx-auto mb-1" />
                    تلقائي
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-white font-bold mb-2">موعد التنفيذ (اختياري)</label>
                <input
                  type="datetime-local"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white"
                />
              </div>

              {selectedTemplate && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <Target className="w-5 h-5 text-blue-400 mt-1" />
                    <div>
                      <div className="text-white font-bold mb-1">معلومات القالب</div>
                      {templates.find(t => t.id === selectedTemplate) && (
                        <div className="text-sm text-blue-300 space-y-1">
                          <div>اللوحة: {templates.find(t => t.id === selectedTemplate)?.board}</div>
                          {templates.find(t => t.id === selectedTemplate)?.estimated_duration_minutes && (
                            <div>المدة المتوقعة: {templates.find(t => t.id === selectedTemplate)?.estimated_duration_minutes} دقيقة</div>
                          )}
                          {templates.find(t => t.id === selectedTemplate)?.requires_proof && (
                            <div>يتطلب إثبات بالصور</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            {assignmentType === 'manual' ? (
              <button
                onClick={handleManualAssign}
                disabled={saving || !selectedTemplate || selectedStaff.length === 0}
                className="flex-1 px-6 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                {saving ? 'جاري التعيين...' : `تعيين إلى ${selectedStaff.length} موظف`}
              </button>
            ) : (
              <button
                onClick={handleAutoAssign}
                disabled={saving || !selectedTemplate}
                className="flex-1 px-6 py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2"
              >
                <Zap className="w-5 h-5" />
                {saving ? 'جاري التعيين...' : 'تعيين تلقائي'}
              </button>
            )}
          </div>
        </div>

        {/* Right Panel - Staff Selection */}
        {assignmentType === 'manual' && (
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
            <h3 className="text-lg font-bold text-white mb-4">اختيار الموظفين</h3>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {staff.map((s) => (
                <button
                  key={s.id}
                  onClick={() => toggleStaff(s.id)}
                  className={`w-full p-4 rounded-xl transition-all text-right ${
                    selectedStaff.includes(s.id)
                      ? 'bg-blue-600 border-2 border-blue-400'
                      : 'bg-white/5 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white font-bold">{s.full_name}</div>
                      <div className="text-gray-400 text-sm">{s.job_title}</div>
                      <div className="text-gray-500 text-xs">{s.staff_code}</div>
                    </div>
                    {selectedStaff.includes(s.id) && (
                      <CheckCircle className="w-6 h-6 text-white" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
