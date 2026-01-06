import { useState, useEffect } from 'react';
import {
  Award,
  TrendingUp,
  CheckCircle,
  FileCheck,
  DollarSign,
  Clock,
  RefreshCw,
  Target,
  Star,
  AlertCircle,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface FarmManagerScoreProps {
  farmId: string;
  periodDays?: number;
}

interface ScoreData {
  farm_id: string;
  period_days: number;
  total_score: number;
  badge: string;
  badge_color: string;
  grade: string;
  breakdown: {
    tasks_commitment: {
      score: number;
      max_score: number;
      percentage: number;
      completed: number;
      overdue: number;
      total: number;
    };
    proof_quality: {
      score: number;
      max_score: number;
      percentage: number;
      approved: number;
      rejected: number;
      total: number;
    };
    financial_discipline: {
      score: number;
      max_score: number;
      percentage: number;
      approved: number;
      rejected: number;
      total: number;
    };
    response_time: {
      score: number;
      max_score: number;
      avg_hours: number;
      grade: string;
    };
  };
}

export default function FarmManagerScore({ farmId, periodDays = 30 }: FarmManagerScoreProps) {
  const [scoreData, setScoreData] = useState<ScoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    loadScore();
  }, [farmId, periodDays, refreshKey]);

  const loadScore = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase.rpc('get_farm_manager_score', {
        p_farm_id: farmId,
        p_period_days: periodDays
      });

      if (error) throw error;

      setScoreData(data);
    } catch (error: any) {
      console.error('Error loading manager score:', error);
    } finally {
      setLoading(false);
    }
  };

  const getBadgeStyles = (color: string) => {
    const styles: Record<string, string> = {
      green: 'bg-gradient-to-r from-emerald-500 to-green-600 text-white',
      blue: 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white',
      cyan: 'bg-gradient-to-r from-cyan-500 to-teal-600 text-white',
      yellow: 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white',
      red: 'bg-gradient-to-r from-red-500 to-rose-600 text-white'
    };
    return styles[color] || styles.blue;
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-cyan-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-emerald-500';
    if (percentage >= 80) return 'bg-blue-500';
    if (percentage >= 70) return 'bg-cyan-500';
    if (percentage >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border-2 border-slate-200 p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-blue-500"></div>
        </div>
        <p className="text-center text-slate-500 mt-4">جاري حساب التقييم...</p>
      </div>
    );
  }

  if (!scoreData) {
    return (
      <div className="bg-white rounded-xl border-2 border-slate-200 p-8 text-center">
        <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
        <p className="text-slate-500">لا توجد بيانات كافية للتقييم</p>
      </div>
    );
  }

  const { breakdown } = scoreData;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Award className="w-7 h-7 text-blue-600" />
            تقييم مدير المزرعة
          </h2>
          <p className="text-sm text-slate-500 mt-1">آخر {periodDays} يوم</p>
        </div>
        <button
          onClick={() => setRefreshKey(prev => prev + 1)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-bold transition-colors text-sm"
        >
          <RefreshCw className="w-4 h-4" />
          تحديث
        </button>
      </div>

      {/* Main Score Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 opacity-10 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500 opacity-10 rounded-full -ml-32 -mb-32"></div>

        <div className="relative z-10">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Star className="w-8 h-8 text-yellow-400" />
                <h3 className="text-xl font-bold">الدرجة الإجمالية</h3>
              </div>
              <p className="text-slate-300 text-sm">
                تقييم شامل بناءً على 4 معايير أساسية
              </p>
            </div>
            <div className={`${getBadgeStyles(scoreData.badge_color)} px-6 py-3 rounded-xl font-bold text-lg shadow-lg`}>
              {scoreData.badge}
            </div>
          </div>

          <div className="flex items-end justify-between">
            <div>
              <div className="flex items-baseline gap-2">
                <span className={`text-7xl font-black ${getScoreColor(scoreData.total_score)}`}>
                  {scoreData.total_score}
                </span>
                <span className="text-3xl text-slate-400 font-bold">/100</span>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <span className="text-2xl font-bold text-white">{scoreData.grade}</span>
                {scoreData.total_score >= 90 ? (
                  <ArrowUp className="w-6 h-6 text-emerald-400" />
                ) : scoreData.total_score < 70 ? (
                  <ArrowDown className="w-6 h-6 text-red-400" />
                ) : null}
              </div>
            </div>

            <div className="text-right">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-3">
                <p className="text-xs text-slate-300 mb-1">الفترة</p>
                <p className="text-lg font-bold">{periodDays} يوم</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. الالتزام بالمهام */}
        <div className="bg-white border-2 border-emerald-200 rounded-xl p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-100 rounded-lg p-3">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">الالتزام بالمهام</h3>
                <p className="text-xs text-slate-500">30% من الدرجة</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-emerald-600">
                {breakdown.tasks_commitment.score}
              </span>
              <span className="text-slate-400">/{breakdown.tasks_commitment.max_score}</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-slate-600">معدل الإنجاز</span>
                <span className="font-bold text-slate-900">
                  {breakdown.tasks_commitment.percentage}%
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${getProgressColor(breakdown.tasks_commitment.percentage)}`}
                  style={{ width: `${breakdown.tasks_commitment.percentage}%` }}
                ></div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-emerald-50 rounded-lg p-2">
                <p className="text-xs text-slate-600">مكتملة</p>
                <p className="text-lg font-bold text-emerald-600">
                  {breakdown.tasks_commitment.completed}
                </p>
              </div>
              <div className="bg-red-50 rounded-lg p-2">
                <p className="text-xs text-slate-600">متأخرة</p>
                <p className="text-lg font-bold text-red-600">
                  {breakdown.tasks_commitment.overdue}
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg p-2">
                <p className="text-xs text-slate-600">إجمالي</p>
                <p className="text-lg font-bold text-slate-900">
                  {breakdown.tasks_commitment.total}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 2. جودة الإثباتات */}
        <div className="bg-white border-2 border-blue-200 rounded-xl p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 rounded-lg p-3">
                <FileCheck className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">جودة الإثباتات</h3>
                <p className="text-xs text-slate-500">25% من الدرجة</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-blue-600">
                {breakdown.proof_quality.score}
              </span>
              <span className="text-slate-400">/{breakdown.proof_quality.max_score}</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-slate-600">معدل القبول</span>
                <span className="font-bold text-slate-900">
                  {breakdown.proof_quality.percentage}%
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${getProgressColor(breakdown.proof_quality.percentage)}`}
                  style={{ width: `${breakdown.proof_quality.percentage}%` }}
                ></div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-blue-50 rounded-lg p-2">
                <p className="text-xs text-slate-600">مقبولة</p>
                <p className="text-lg font-bold text-blue-600">
                  {breakdown.proof_quality.approved}
                </p>
              </div>
              <div className="bg-red-50 rounded-lg p-2">
                <p className="text-xs text-slate-600">مرفوضة</p>
                <p className="text-lg font-bold text-red-600">
                  {breakdown.proof_quality.rejected}
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg p-2">
                <p className="text-xs text-slate-600">إجمالي</p>
                <p className="text-lg font-bold text-slate-900">
                  {breakdown.proof_quality.total}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 3. الانضباط المالي */}
        <div className="bg-white border-2 border-amber-200 rounded-xl p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-amber-100 rounded-lg p-3">
                <DollarSign className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">الانضباط المالي</h3>
                <p className="text-xs text-slate-500">25% من الدرجة</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-amber-600">
                {breakdown.financial_discipline.score}
              </span>
              <span className="text-slate-400">/{breakdown.financial_discipline.max_score}</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-slate-600">معدل الاعتماد</span>
                <span className="font-bold text-slate-900">
                  {breakdown.financial_discipline.percentage}%
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${getProgressColor(breakdown.financial_discipline.percentage)}`}
                  style={{ width: `${breakdown.financial_discipline.percentage}%` }}
                ></div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-emerald-50 rounded-lg p-2">
                <p className="text-xs text-slate-600">معتمدة</p>
                <p className="text-lg font-bold text-emerald-600">
                  {breakdown.financial_discipline.approved}
                </p>
              </div>
              <div className="bg-red-50 rounded-lg p-2">
                <p className="text-xs text-slate-600">مرفوضة</p>
                <p className="text-lg font-bold text-red-600">
                  {breakdown.financial_discipline.rejected}
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg p-2">
                <p className="text-xs text-slate-600">إجمالي</p>
                <p className="text-lg font-bold text-slate-900">
                  {breakdown.financial_discipline.total}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 4. الاستجابة */}
        <div className="bg-white border-2 border-cyan-200 rounded-xl p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-cyan-100 rounded-lg p-3">
                <Clock className="w-6 h-6 text-cyan-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">سرعة الاستجابة</h3>
                <p className="text-xs text-slate-500">20% من الدرجة</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-cyan-600">
                {breakdown.response_time.score}
              </span>
              <span className="text-slate-400">/{breakdown.response_time.max_score}</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600">متوسط وقت الإغلاق</span>
                <Target className="w-5 h-5 text-slate-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-slate-900">
                  {breakdown.response_time.avg_hours}
                </span>
                <span className="text-slate-500">ساعة</span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                ({(breakdown.response_time.avg_hours / 24).toFixed(1)} يوم)
              </p>
            </div>

            <div className="bg-cyan-50 rounded-lg p-3 text-center">
              <p className="text-xs text-slate-600 mb-1">التقييم</p>
              <p className="font-bold text-cyan-700">
                {breakdown.response_time.grade}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <TrendingUp className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-bold text-slate-900">ملخص الأداء</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-emerald-600">
              {breakdown.tasks_commitment.percentage}%
            </p>
            <p className="text-xs text-slate-600 mt-1">إنجاز المهام</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-blue-600">
              {breakdown.proof_quality.percentage}%
            </p>
            <p className="text-xs text-slate-600 mt-1">جودة الإثباتات</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-amber-600">
              {breakdown.financial_discipline.percentage}%
            </p>
            <p className="text-xs text-slate-600 mt-1">انضباط مالي</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-cyan-600">
              {breakdown.response_time.score}
            </p>
            <p className="text-xs text-slate-600 mt-1">نقاط الاستجابة</p>
          </div>
        </div>
      </div>
    </div>
  );
}
