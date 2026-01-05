import { useState, useEffect } from 'react';
import { ListChecks, Plus, Loader2, CheckCircle, Clock } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useFarmOperationLock } from '../../../hooks/useFarmOperationLock';

interface Task {
  id: string;
  task_title: string;
  task_type: string;
  priority: string;
  scheduled_date: string;
  status: string;
  assigned_to_staff: { full_name: string } | null;
}

export default function DailyTasksView({ farmId }: { farmId: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const { lockStatus } = useFarmOperationLock(farmId);

  useEffect(() => {
    loadTasks();
  }, [farmId, filter]);

  const loadTasks = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('fc_daily_tasks')
        .select(`
          *,
          assigned_to_staff:platform_staff(full_name)
        `)
        .eq('farm_id', farmId)
        .order('scheduled_date', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTaskTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      irrigation: 'ري',
      fertilization: 'تسميد',
      pest_control: 'مكافحة آفات',
      harvest: 'حصاد',
      maintenance: 'صيانة',
      inspection: 'تفتيش',
      other: 'أخرى'
    };
    return types[type] || type;
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'bg-gray-100 text-gray-700',
      normal: 'bg-blue-100 text-blue-700',
      high: 'bg-orange-100 text-orange-700',
      urgent: 'bg-red-100 text-red-700'
    };
    return colors[priority] || colors.normal;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {['all', 'pending', 'completed'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {f === 'all' && 'الكل'}
              {f === 'pending' && 'قيد التنفيذ'}
              {f === 'completed' && 'مكتملة'}
            </button>
          ))}
        </div>

        <button
          disabled={lockStatus.isLocked}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            lockStatus.isLocked
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-emerald-500 text-white hover:bg-emerald-600'
          }`}
          title={lockStatus.isLocked ? 'المزرعة موقوفة - لا يمكن إضافة مهام' : ''}
        >
          <Plus className="w-4 h-4" />
          مهمة جديدة
        </button>
      </div>

      {/* Tasks List */}
      {tasks.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <ListChecks className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">لا توجد مهام</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-gray-900">{task.task_title}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>{getTaskTypeLabel(task.task_type)}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {new Date(task.scheduled_date).toLocaleDateString('ar-SA')}
                    </span>
                    {task.assigned_to_staff && (
                      <span>المسؤول: {task.assigned_to_staff.full_name}</span>
                    )}
                  </div>
                </div>

                {task.status === 'completed' ? (
                  <CheckCircle className="w-6 h-6 text-green-500" />
                ) : (
                  <button className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm hover:bg-emerald-600 transition-colors">
                    تحديد كمكتمل
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
