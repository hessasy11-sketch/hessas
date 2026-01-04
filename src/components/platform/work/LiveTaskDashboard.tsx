import { useState, useEffect } from 'react';
import { Activity, TrendingUp, Zap, Award, Target, Clock, Users, AlertCircle, Trophy, Star, Crown } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface LiveTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  started_at: string;
  staff: {
    full_name: string;
    staff_code: string;
  };
}

interface Achievement {
  id: string;
  achievement_type: string;
  level: number;
  unlocked_at: string;
  badge_color: string;
  staff: {
    full_name: string;
  };
}

interface Analytics {
  staff_id: string;
  date: string;
  tasks_completed: number;
  efficiency_score: number;
  total_points_earned: number;
  staff: {
    full_name: string;
    staff_code: string;
  };
}

export function LiveTaskDashboard() {
  const [liveTasks, setLiveTasks] = useState<LiveTask[]>([]);
  const [recentAchievements, setRecentAchievements] = useState<Achievement[]>([]);
  const [topPerformers, setTopPerformers] = useState<Analytics[]>([]);
  const [stats, setStats] = useState({
    activeNow: 0,
    completedToday: 0,
    avgEfficiency: 0,
    totalPoints: 0
  });

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      const [tasksData, achievementsData, analyticsData] = await Promise.all([
        supabase
          .from('staff_tasks')
          .select('id, title, status, priority, started_at, staff:platform_staff!staff_id(full_name, staff_code)')
          .eq('status', 'in_progress')
          .order('started_at', { ascending: false })
          .limit(10),

        supabase
          .from('staff_achievements')
          .select('id, achievement_type, level, unlocked_at, badge_color, staff:platform_staff!staff_id(full_name)')
          .not('unlocked_at', 'is', null)
          .order('unlocked_at', { ascending: false })
          .limit(5),

        supabase
          .from('task_analytics')
          .select('staff_id, date, tasks_completed, efficiency_score, total_points_earned, staff:platform_staff!staff_id(full_name, staff_code)')
          .eq('date', new Date().toISOString().split('T')[0])
          .order('efficiency_score', { ascending: false })
          .limit(5)
      ]);

      if (tasksData.data) setLiveTasks(tasksData.data);
      if (achievementsData.data) setRecentAchievements(achievementsData.data);
      if (analyticsData.data) setTopPerformers(analyticsData.data);

      const completedToday = await supabase
        .from('staff_tasks')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'completed')
        .gte('completed_at', new Date().toISOString().split('T')[0]);

      const avgEffData = await supabase
        .from('task_analytics')
        .select('efficiency_score')
        .eq('date', new Date().toISOString().split('T')[0]);

      const totalPointsData = await supabase
        .from('task_analytics')
        .select('total_points_earned')
        .eq('date', new Date().toISOString().split('T')[0]);

      setStats({
        activeNow: tasksData.data?.length || 0,
        completedToday: completedToday.count || 0,
        avgEfficiency: avgEffData.data?.reduce((acc, curr) => acc + (curr.efficiency_score || 0), 0) / (avgEffData.data?.length || 1) || 0,
        totalPoints: totalPointsData.data?.reduce((acc, curr) => acc + (curr.total_points_earned || 0), 0) || 0
      });

    } catch (error) {
      console.error('Error loading dashboard:', error);
    }
  };

  const getAchievementIcon = (type: string) => {
    switch (type) {
      case 'speed_master': return <Zap className="w-5 h-5 text-yellow-400" />;
      case 'task_crusher': return <Target className="w-5 h-5 text-red-400" />;
      case 'week_warrior': return <Trophy className="w-5 h-5 text-blue-400" />;
      case 'month_champion': return <Crown className="w-5 h-5 text-purple-400" />;
      default: return <Star className="w-5 h-5 text-gray-400" />;
    }
  };

  const getAchievementLabel = (type: string) => {
    const labels: Record<string, string> = {
      speed_master: 'سيد السرعة',
      perfectionist: 'المثالي',
      multitasker: 'متعدد المهام',
      early_bird: 'الطائر المبكر',
      night_owl: 'بومة الليل',
      team_player: 'لاعب جماعي',
      task_crusher: 'محطم المهام',
      week_warrior: 'محارب الأسبوع',
      month_champion: 'بطل الشهر',
      year_legend: 'أسطورة السنة'
    };
    return labels[type] || type;
  };

  const getTimeSince = (dateString: string) => {
    const now = new Date();
    const past = new Date(dateString);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `${diffMins} دقيقة`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} ساعة`;
    return `${Math.floor(diffHours / 24)} يوم`;
  };

  return (
    <div className="space-y-6">
      {/* Live Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-green-500/20 to-emerald-600/10 border border-green-500/30 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-2">
            <Activity className="w-8 h-8 text-green-400 animate-pulse" />
            <span className="text-3xl font-bold text-white">{stats.activeNow}</span>
          </div>
          <div className="text-green-300 font-bold">نشط الآن</div>
          <div className="text-xs text-green-400/60 mt-1">قيد التنفيذ</div>
        </div>

        <div className="bg-gradient-to-br from-blue-500/20 to-cyan-600/10 border border-blue-500/30 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-2">
            <Target className="w-8 h-8 text-blue-400" />
            <span className="text-3xl font-bold text-white">{stats.completedToday}</span>
          </div>
          <div className="text-blue-300 font-bold">مكتمل اليوم</div>
          <div className="text-xs text-blue-400/60 mt-1">إجمالي</div>
        </div>

        <div className="bg-gradient-to-br from-purple-500/20 to-pink-600/10 border border-purple-500/30 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-8 h-8 text-purple-400" />
            <span className="text-3xl font-bold text-white">{Math.round(stats.avgEfficiency)}%</span>
          </div>
          <div className="text-purple-300 font-bold">متوسط الكفاءة</div>
          <div className="text-xs text-purple-400/60 mt-1">جميع الموظفين</div>
        </div>

        <div className="bg-gradient-to-br from-yellow-500/20 to-orange-600/10 border border-yellow-500/30 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-2">
            <Award className="w-8 h-8 text-yellow-400" />
            <span className="text-3xl font-bold text-white">{stats.totalPoints}</span>
          </div>
          <div className="text-yellow-300 font-bold">النقاط اليوم</div>
          <div className="text-xs text-yellow-400/60 mt-1">إجمالي</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live Tasks Feed */}
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Activity className="w-6 h-6 text-green-400 animate-pulse" />
            <h2 className="text-xl font-bold text-white">مهام نشطة الآن</h2>
            <span className="px-2 py-1 bg-green-500/20 text-green-300 text-xs rounded-full">
              مباشر
            </span>
          </div>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {liveTasks.map((task) => (
              <div key={task.id} className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="text-white font-bold mb-1">{task.title}</h3>
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-300">{task.staff?.full_name}</span>
                      <span className="text-gray-500">•</span>
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-400">{getTimeSince(task.started_at)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  </div>
                </div>
              </div>
            ))}
            {liveTasks.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                لا توجد مهام نشطة حالياً
              </div>
            )}
          </div>
        </div>

        {/* Recent Achievements */}
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Trophy className="w-6 h-6 text-yellow-400" />
            <h2 className="text-xl font-bold text-white">إنجازات حديثة</h2>
          </div>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {recentAchievements.map((achievement) => (
              <div key={achievement.id} className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="bg-yellow-500/20 rounded-full p-3">
                    {getAchievementIcon(achievement.achievement_type)}
                  </div>
                  <div className="flex-1">
                    <div className="text-white font-bold">{achievement.staff?.full_name}</div>
                    <div className="text-yellow-300 text-sm">
                      {getAchievementLabel(achievement.achievement_type)} - المستوى {achievement.level}
                    </div>
                    <div className="text-gray-400 text-xs mt-1">
                      {getTimeSince(achievement.unlocked_at)}
                    </div>
                  </div>
                  <Star className="w-5 h-5 text-yellow-400" />
                </div>
              </div>
            ))}
            {recentAchievements.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                لا توجد إنجازات حديثة
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top Performers Today */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Crown className="w-6 h-6 text-purple-400" />
          <h2 className="text-xl font-bold text-white">أفضل أداء اليوم</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {topPerformers.map((performer, index) => (
            <div
              key={performer.staff_id}
              className={`relative rounded-xl p-4 ${
                index === 0 ? 'bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-2 border-yellow-500/50 ring-2 ring-yellow-500/30' :
                index === 1 ? 'bg-gradient-to-br from-gray-400/20 to-gray-500/20 border-2 border-gray-400/50' :
                index === 2 ? 'bg-gradient-to-br from-orange-600/20 to-orange-700/20 border-2 border-orange-600/50' :
                'bg-white/5 border border-white/10'
              }`}
            >
              {index < 3 && (
                <div className="absolute -top-3 -right-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    index === 0 ? 'bg-yellow-500' :
                    index === 1 ? 'bg-gray-400' :
                    'bg-orange-600'
                  }`}>
                    <span className="text-white font-bold text-sm">{index + 1}</span>
                  </div>
                </div>
              )}
              <div className="text-center">
                <div className="text-white font-bold mb-1">{performer.staff?.full_name}</div>
                <div className="text-gray-400 text-xs mb-2">{performer.staff?.staff_code}</div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">مكتمل:</span>
                    <span className="text-green-400 font-bold">{performer.tasks_completed}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">الكفاءة:</span>
                    <span className="text-blue-400 font-bold">{Math.round(performer.efficiency_score)}%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">النقاط:</span>
                    <span className="text-yellow-400 font-bold">{performer.total_points_earned}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
