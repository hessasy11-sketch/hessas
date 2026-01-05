import { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Clock,
  PlayCircle,
  FileCheck,
  XCircle,
  Plus,
  AlertCircle,
  Calendar,
  User,
  AlertTriangle,
  TrendingUp,
  Package,
  Droplets,
  Leaf,
  Bug,
  Wrench,
  ShoppingCart,
  Search
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface FarmTask {
  task_id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  priority: string;
  assigned_to_id: string;
  assigned_to_name: string;
  assigned_to_role: string;
  created_by_name: string;
  due_date: string | null;
  created_at: string;
  started_at: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  approval_notes: string | null;
  rejection_reason: string | null;
}

interface TeamMember {
  staff_id: string;
  staff_name: string;
  staff_code: string;
  role: string;
  role_name_ar: string;
  department: string;
  phone: string | null;
  email: string | null;
}

interface FarmTasksManagementProps {
  farmId: string;
  farmName: string;
}

export default function FarmTasksManagement({ farmId, farmName }: FarmTasksManagementProps) {
  const [tasks, setTasks] = useState<FarmTask[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [farmId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // جلب المهام
      const { data: tasksData, error: tasksError } = await supabase.rpc(
        'get_farm_tasks_with_stats',
        { p_farm_id: farmId }
      );

      if (tasksError) throw tasksError;
      setTasks(tasksData || []);

      // جلب أعضاء الفريق
      const { data: membersData, error: membersError } = await supabase.rpc(
        'get_farm_team_members_for_task',
        { p_farm_id: farmId }
      );

      if (membersError) throw membersError;
      setTeamMembers(membersData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveTask = async (taskId: string) => {
    if (!confirm('هل أنت متأكد من اعتماد هذه المهمة؟')) return;

    setActionLoading(taskId);
    try {
      const { data: staffData } = await supabase
        .from('platform_staff')
        .select('id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .maybeSingle();

      if (!staffData) throw new Error('لم يتم العثور على بيانات الموظف');

      const { data, error } = await supabase.rpc('approve_farm_task', {
        p_task_id: taskId,
        p_approver_id: staffData.id,
        p_notes: null
      });

      if (error) throw error;

      alert('تم اعتماد المهمة بنجاح');
      loadData();
    } catch (error: any) {
      console.error('Error approving task:', error);
      alert('حدث خطأ: ' + error.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectTask = async (taskId: string) => {
    const reason = prompt('أدخل سبب الرفض:');
    if (!reason) return;

    setActionLoading(taskId);
    try {
      const { data: staffData } = await supabase
        .from('platform_staff')
        .select('id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .maybeSingle();

      if (!staffData) throw new Error('لم يتم العثور على بيانات الموظف');

      const { data, error } = await supabase.rpc('reject_farm_task', {
        p_task_id: taskId,
        p_rejecter_id: staffData.id,
        p_reason: reason
      });

      if (error) throw error;

      alert('تم رفض المهمة');
      loadData();
    } catch (error: any) {
      console.error('Error rejecting task:', error);
      alert('حدث خطأ: ' + error.message);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, any> = {
      pending: {
        label: 'معلقة',
        icon: Clock,
        color: 'bg-slate-100 text-slate-700 border-slate-200'
      },
      in_progress: {
        label: 'قيد التنفيذ',
        icon: PlayCircle,
        color: 'bg-blue-100 text-blue-700 border-blue-200'
      },
      submitted: {
        label: 'مقدمة',
        icon: FileCheck,
        color: 'bg-amber-100 text-amber-700 border-amber-200'
      },
      approved: {
        label: 'معتمدة',
        icon: CheckCircle2,
        color: 'bg-emerald-100 text-emerald-700 border-emerald-200'
      },
      rejected: {
        label: 'مرفوضة',
        icon: XCircle,
        color: 'bg-red-100 text-red-700 border-red-200'
      }
    };
    return configs[status] || configs.pending;
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      urgent: 'text-red-600',
      high: 'text-orange-600',
      medium: 'text-yellow-600',
      low: 'text-slate-600'
    };
    return colors[priority] || colors.medium;
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, any> = {
      general: Package,
      irrigation: Droplets,
      fertilization: Leaf,
      pest_control: Bug,
      maintenance: Wrench,
      harvesting: ShoppingCart,
      inspection: Search
    };
    return icons[type] || Package;
  };

  const filteredTasks =
    filterStatus === 'all' ? tasks : tasks.filter((t) => t.status === filterStatus);

  const stats = {
    total: tasks.length,
    pending: tasks.filter((t) => t.status === 'pending').length,
    in_progress: tasks.filter((t) => t.status === 'in_progress').length,
    submitted: tasks.filter((t) => t.status === 'submitted').length,
    approved: tasks.filter((t) => t.status === 'approved').length,
    rejected: tasks.filter((t) => t.status === 'rejected').length
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-slate-600">جاري تحميل المهام...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
            <FileCheck className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">مهام المزرعة</h2>
            <p className="text-slate-600 text-sm">{farmName}</p>
          </div>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl font-bold hover:shadow-lg transition-all"
        >
          <Plus className="w-5 h-5" />
          مهمة جديدة
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-purple-900">
            <p className="font-bold mb-1">عن نظام المهام:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>يمكن تعيين المهام فقط لأعضاء فريق المزرعة</li>
              <li>المكلف يمكنه بدء وإكمال المهمة</li>
              <li>مدير المزرعة يعتمد أو يرفض المهام المقدمة</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-xl shadow p-4 border-t-4 border-slate-500">
          <p className="text-2xl font-black text-slate-900">{stats.total}</p>
          <p className="text-sm text-slate-600">المجموع</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 border-t-4 border-slate-500">
          <p className="text-2xl font-black text-slate-900">{stats.pending}</p>
          <p className="text-sm text-slate-600">معلقة</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 border-t-4 border-blue-500">
          <p className="text-2xl font-black text-blue-900">{stats.in_progress}</p>
          <p className="text-sm text-blue-600">قيد التنفيذ</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 border-t-4 border-amber-500">
          <p className="text-2xl font-black text-amber-900">{stats.submitted}</p>
          <p className="text-sm text-amber-600">مقدمة</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 border-t-4 border-emerald-500">
          <p className="text-2xl font-black text-emerald-900">{stats.approved}</p>
          <p className="text-sm text-emerald-600">معتمدة</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 border-t-4 border-red-500">
          <p className="text-2xl font-black text-red-900">{stats.rejected}</p>
          <p className="text-sm text-red-600">مرفوضة</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-xl shadow-lg p-2 flex gap-2 overflow-x-auto">
        {[
          { key: 'all', label: 'الكل', count: stats.total },
          { key: 'pending', label: 'معلقة', count: stats.pending },
          { key: 'in_progress', label: 'قيد التنفيذ', count: stats.in_progress },
          { key: 'submitted', label: 'مقدمة', count: stats.submitted },
          { key: 'approved', label: 'معتمدة', count: stats.approved },
          { key: 'rejected', label: 'مرفوضة', count: stats.rejected }
        ].map((filter) => (
          <button
            key={filter.key}
            onClick={() => setFilterStatus(filter.key)}
            className={`px-4 py-2 rounded-lg font-bold whitespace-nowrap transition-colors ${
              filterStatus === filter.key
                ? 'bg-purple-500 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {filter.label} ({filter.count})
          </button>
        ))}
      </div>

      {/* Tasks List */}
      <div className="space-y-4">
        {filteredTasks.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <FileCheck className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 font-medium mb-2">لا توجد مهام في هذا القسم</p>
            <p className="text-slate-500 text-sm mb-4">ابدأ بإنشاء مهام جديدة لفريقك</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-purple-500 text-white rounded-lg font-bold hover:bg-purple-600 transition-colors"
            >
              إنشاء مهمة
            </button>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const statusConfig = getStatusConfig(task.status);
            const StatusIcon = statusConfig.icon;
            const TypeIcon = getTypeIcon(task.type);

            return (
              <div
                key={task.task_id}
                className="bg-white rounded-xl shadow-lg border-2 border-slate-200 p-6 hover:shadow-xl transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <TypeIcon className="w-5 h-5 text-slate-600" />
                      <h3 className="text-lg font-bold text-slate-900">{task.title}</h3>
                      <span
                        className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-bold border ${statusConfig.color}`}
                      >
                        <StatusIcon className="w-4 h-4" />
                        {statusConfig.label}
                      </span>
                      <span className={`text-sm font-bold ${getPriorityColor(task.priority)}`}>
                        {task.priority === 'urgent' && '🔴 عاجل'}
                        {task.priority === 'high' && '🟠 عالي'}
                        {task.priority === 'medium' && '🟡 متوسط'}
                        {task.priority === 'low' && '⚪ منخفض'}
                      </span>
                    </div>

                    {task.description && (
                      <p className="text-slate-600 mb-3">{task.description}</p>
                    )}

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2 text-slate-600">
                        <User className="w-4 h-4" />
                        <span>المكلَّف: {task.assigned_to_name}</span>
                        <span className="text-xs bg-slate-100 px-2 py-0.5 rounded">
                          {task.assigned_to_role}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <User className="w-4 h-4" />
                        <span>المنشئ: {task.created_by_name}</span>
                      </div>
                      {task.due_date && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <Calendar className="w-4 h-4" />
                          <span>
                            الموعد النهائي: {new Date(task.due_date).toLocaleDateString('ar-SA')}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-slate-600">
                        <Clock className="w-4 h-4" />
                        <span>إنشاء: {new Date(task.created_at).toLocaleDateString('ar-SA')}</span>
                      </div>
                    </div>

                    {task.rejection_reason && (
                      <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                        <p className="text-sm text-red-900 font-bold mb-1">سبب الرفض:</p>
                        <p className="text-sm text-red-700">{task.rejection_reason}</p>
                      </div>
                    )}

                    {task.approval_notes && task.status === 'approved' && (
                      <div className="mt-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                        <p className="text-sm text-emerald-900 font-bold mb-1">ملاحظات الاعتماد:</p>
                        <p className="text-sm text-emerald-700">{task.approval_notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {task.status === 'submitted' && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleApproveTask(task.task_id)}
                        disabled={actionLoading === task.task_id}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg font-bold hover:bg-emerald-600 transition-colors disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        اعتماد
                      </button>
                      <button
                        onClick={() => handleRejectTask(task.task_id)}
                        disabled={actionLoading === task.task_id}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg font-bold hover:bg-red-600 transition-colors disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4" />
                        رفض
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Task Modal */}
      {showCreateModal && (
        <CreateTaskModal
          farmId={farmId}
          teamMembers={teamMembers}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}

interface CreateTaskModalProps {
  farmId: string;
  teamMembers: TeamMember[];
  onClose: () => void;
  onSuccess: () => void;
}

function CreateTaskModal({ farmId, teamMembers, onClose, onSuccess }: CreateTaskModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'general',
    assigned_to: '',
    priority: 'medium',
    due_date: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.assigned_to) {
      alert('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    setSubmitting(true);
    try {
      const { data: staffData } = await supabase
        .from('platform_staff')
        .select('id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .maybeSingle();

      if (!staffData) throw new Error('لم يتم العثور على بيانات الموظف');

      const { data, error } = await supabase.rpc('create_farm_task_for_team', {
        p_farm_id: farmId,
        p_title: formData.title,
        p_description: formData.description,
        p_type: formData.type,
        p_assigned_to: formData.assigned_to,
        p_created_by: staffData.id,
        p_priority: formData.priority,
        p_due_date: formData.due_date || null
      });

      if (error) throw error;

      if (data && !data.success) {
        throw new Error(data.error || 'فشل في إنشاء المهمة');
      }

      alert('تم إنشاء المهمة بنجاح');
      onSuccess();
    } catch (error: any) {
      console.error('Error creating task:', error);
      alert('حدث خطأ: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900">إنشاء مهمة جديدة</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-bold text-slate-900 mb-2">
              عنوان المهمة <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-purple-500 focus:outline-none"
              placeholder="مثال: ري القطاع الشمالي"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-bold text-slate-900 mb-2">الوصف</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-purple-500 focus:outline-none"
              rows={3}
              placeholder="تفاصيل المهمة..."
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-bold text-slate-900 mb-2">نوع المهمة</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-purple-500 focus:outline-none"
            >
              <option value="general">عامة</option>
              <option value="irrigation">ري</option>
              <option value="fertilization">تسميد</option>
              <option value="pest_control">مكافحة آفات</option>
              <option value="maintenance">صيانة</option>
              <option value="harvesting">حصاد</option>
              <option value="inspection">تفتيش</option>
            </select>
          </div>

          {/* Assigned To */}
          <div>
            <label className="block text-sm font-bold text-slate-900 mb-2">
              تعيين إلى <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.assigned_to}
              onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-purple-500 focus:outline-none"
              required
            >
              <option value="">-- اختر عضو من الفريق --</option>
              {teamMembers.map((member) => (
                <option key={member.staff_id} value={member.staff_id}>
                  {member.staff_name} ({member.role_name_ar})
                </option>
              ))}
            </select>
            {teamMembers.length === 0 && (
              <p className="text-sm text-red-600 mt-1">
                لا يوجد أعضاء في الفريق. قم بإضافة أعضاء أولاً.
              </p>
            )}
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-bold text-slate-900 mb-2">الأولوية</label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-purple-500 focus:outline-none"
            >
              <option value="low">منخفضة</option>
              <option value="medium">متوسطة</option>
              <option value="high">عالية</option>
              <option value="urgent">عاجلة</option>
            </select>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-sm font-bold text-slate-900 mb-2">الموعد النهائي</label>
            <input
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-purple-500 focus:outline-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4">
            <button
              type="submit"
              disabled={submitting || teamMembers.length === 0}
              className="flex-1 px-6 py-3 bg-purple-500 text-white rounded-xl font-bold hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'جاري الإنشاء...' : 'إنشاء المهمة'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-300 transition-colors"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
