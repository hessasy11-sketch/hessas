import { useState, useEffect } from 'react';
import { Zap, Clock, CheckCircle, AlertCircle, TrendingUp, Calendar, Target, Award, Users, Filter } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface Task {
  id: string;
  staff_id: string;
  template_id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  board: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  requires_proof: boolean;
  due_date?: string;
  staff?: {
    full_name: string;
    staff_code: string;
  };
  template?: {
    name: string;
    estimated_duration_minutes: number;
  };
}

interface StaffStats {
  staff_id: string;
  full_name: string;
  staff_code: string;
  total_tasks: number;
  completed_tasks: number;
  pending_tasks: number;
  in_progress_tasks: number;
  avg_completion_time: number;
  points: number;
}

export function SmartTaskGenerationHub() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [staffStats, setStaffStats] = useState<StaffStats[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterBoard, setFilterBoard] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTasks();
    loadStaffStats();
  }, [filterStatus, filterBoard]);

  const loadTasks = async () => {
    try {
      let query = supabase
        .from('staff_tasks')
        .select(`
          *,
          staff:platform_staff(full_name, staff_code),
          template:task_templates(name, estimated_duration_minutes)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      if (filterBoard !== 'all') {
        query = query.eq('board', filterBoard);
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

  const loadStaffStats = async () => {
    try {
      const { data, error } = await supabase.rpc('get_staff_task_stats');
      if (error) throw error;
      setStaffStats(data || []);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'in_progress': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'cancelled': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'bg-gray-500';
      case 'medium': return 'bg-blue-500';
      case 'high': return 'bg-orange-500';
      case 'urgent': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'معلقة';
      case 'in_progress': return 'قيد التنفيذ';
      case 'completed': return 'مكتملة';
      case 'cancelled': return 'ملغاة';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-white">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 border border-yellow-500/30 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-8 h-8 text-yellow-400" />
            <span className="text-3xl font-bold text-white">
              {tasks.filter(t => t.status === 'pending').length}
            </span>
          </div>
          <div className="text-yellow-300 font-bold">مهام معلقة</div>
        </div>

        <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-8 h-8 text-blue-400" />
            <span className="text-3xl font-bold text-white">
              {tasks.filter(t => t.status === 'in_progress').length}
            </span>
          </div>
          <div className="text-blue-300 font-bold">قيد التنفيذ</div>
        </div>

        <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 border border-green-500/30 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-8 h-8 text-green-400" />
            <span className="text-3xl font-bold text-white">
              {tasks.filter(t => t.status === 'completed').length}
            </span>
          </div>
          <div className="text-green-300 font-bold">مكتملة</div>
        </div>

        <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-2">
            <Target className="w-8 h-8 text-purple-400" />
            <span className="text-3xl font-bold text-white">
              {Math.round((tasks.filter(t => t.status === 'completed').length / tasks.length) * 100) || 0}%
            </span>
          </div>
          <div className="text-purple-300 font-bold">معدل الإنجاز</div>
        </div>
      </div>

      {/* Top Performers */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Award className="w-6 h-6 text-yellow-400" />
          <h2 className="text-xl font-bold text-white">الموظفون المتميزون</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {staffStats.slice(0, 3).map((staff, index) => (
            <div
              key={staff.staff_id}
              className={`bg-white/5 border border-white/10 rounded-xl p-4 ${
                index === 0 ? 'ring-2 ring-yellow-500' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {index === 0 && <Award className="w-5 h-5 text-yellow-400" />}
                  <span className="text-white font-bold">{staff.full_name}</span>
                </div>
                <span className="text-xs text-gray-400">{staff.staff_code}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-green-500/20 rounded-lg p-2">
                  <div className="text-green-300 text-xs">مكتملة</div>
                  <div className="text-white font-bold">{staff.completed_tasks}</div>
                </div>
                <div className="bg-blue-500/20 rounded-lg p-2">
                  <div className="text-blue-300 text-xs">معلقة</div>
                  <div className="text-white font-bold">{staff.pending_tasks}</div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-gray-400">نقاط الأداء</span>
                <span className="text-yellow-400 font-bold">{staff.points}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <span className="text-white font-bold">الفلاتر:</span>
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
          >
            <option value="all">كل الحالات</option>
            <option value="pending">معلقة</option>
            <option value="in_progress">قيد التنفيذ</option>
            <option value="completed">مكتملة</option>
            <option value="cancelled">ملغاة</option>
          </select>

          <select
            value={filterBoard}
            onChange={(e) => setFilterBoard(e.target.value)}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
          >
            <option value="all">كل اللوحات</option>
            <option value="b2b">المزادات (B2B)</option>
            <option value="b2f">المزارع (B2F)</option>
            <option value="operations">العمليات</option>
            <option value="general">عام</option>
          </select>
        </div>
      </div>

      {/* Tasks List */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
        <h2 className="text-xl font-bold text-white mb-4">المهام النشطة</h2>
        <div className="space-y-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-white font-bold">{task.title}</h3>
                    <span className={`px-2 py-1 ${getPriorityColor(task.priority)} text-white text-xs rounded`}>
                      {task.priority}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm">{task.description}</p>
                </div>
                <span className={`px-3 py-1 ${getStatusColor(task.status)} text-white text-xs rounded-full`}>
                  {getStatusLabel(task.status)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-300">{task.staff?.full_name}</span>
                  </div>
                  {task.template?.estimated_duration_minutes && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-300">{task.template.estimated_duration_minutes} دقيقة</span>
                    </div>
                  )}
                  {task.requires_proof && (
                    <span className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded">
                      يتطلب إثبات
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(task.created_at).toLocaleDateString('ar-SA')}
                </span>
              </div>
            </div>
          ))}

          {tasks.length === 0 && (
            <div className="text-center py-12">
              <Zap className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">لا توجد مهام</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
