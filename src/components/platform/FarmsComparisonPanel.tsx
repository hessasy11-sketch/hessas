import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Trophy,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Award,
  Star,
  ArrowRight,
  RefreshCw,
  BarChart3
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface FarmScore {
  farm_id: string;
  farm_name: string;
  farm_location: string;
  farm_city: string;
  total_score: number;
  badge: string;
  badge_color: string;
  grade: string;
  main_issue: string;
  operational_status: string;
}

interface ComparisonData {
  period_days: number;
  total_farms: number;
  top_5: FarmScore[];
  needs_attention: FarmScore[];
  all_farms: FarmScore[];
}

export default function FarmsComparisonPanel() {
  const navigate = useNavigate();
  const [data, setData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    loadComparison();
  }, [refreshKey]);

  const loadComparison = async () => {
    try {
      setLoading(true);

      const { data: result, error } = await supabase.rpc('get_all_farms_scores', {
        p_period_days: 30
      });

      if (error) throw error;

      setData(result);
    } catch (error: any) {
      console.error('Error loading farms comparison:', error);
    } finally {
      setLoading(false);
    }
  };

  const getBadgeStyles = (color: string) => {
    const styles: Record<string, string> = {
      green: 'bg-emerald-500 text-white',
      blue: 'bg-blue-500 text-white',
      cyan: 'bg-cyan-500 text-white',
      yellow: 'bg-yellow-500 text-white',
      red: 'bg-red-500 text-white'
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

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="w-6 h-6 text-yellow-500" />;
    if (index === 1) return <Award className="w-6 h-6 text-slate-400" />;
    if (index === 2) return <Star className="w-6 h-6 text-orange-400" />;
    return <span className="text-lg font-bold text-slate-400">#{index + 1}</span>;
  };

  const handleFarmClick = (farmId: string) => {
    navigate(`/admin/b2f/farms/${farmId}?tab=performance`);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border-2 border-slate-200 p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-blue-500"></div>
        </div>
        <p className="text-center text-slate-500 mt-4">جاري تحميل المقارنة...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white rounded-xl border-2 border-slate-200 p-8 text-center">
        <BarChart3 className="w-12 h-12 text-slate-400 mx-auto mb-3" />
        <p className="text-slate-500">لا توجد بيانات متاحة</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-blue-600" />
            مقارنة المزارع
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            إجمالي {data.total_farms} مزرعة • آخر {data.period_days} يوم
          </p>
        </div>
        <button
          onClick={() => setRefreshKey(prev => prev + 1)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-bold transition-colors text-sm"
        >
          <RefreshCw className="w-4 h-4" />
          تحديث
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 5 - أفضل أداء */}
        <div className="bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-emerald-500 rounded-lg p-2">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">أفضل 5 مزارع</h3>
              <p className="text-xs text-slate-600">الأداء المتميز</p>
            </div>
          </div>

          <div className="space-y-3">
            {data.top_5 && data.top_5.length > 0 ? (
              data.top_5.map((farm, index) => (
                <button
                  key={farm.farm_id}
                  onClick={() => handleFarmClick(farm.farm_id)}
                  className="w-full bg-white hover:bg-emerald-50 border-2 border-emerald-200 hover:border-emerald-400 rounded-lg p-4 transition-all cursor-pointer text-right group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="flex-shrink-0">
                        {getRankIcon(index)}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                          {farm.farm_name}
                        </h4>
                        <p className="text-xs text-slate-500">
                          {farm.farm_city} • {farm.farm_location}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 transition-colors flex-shrink-0" />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-2xl font-black ${getScoreColor(farm.total_score)}`}>
                        {farm.total_score}
                      </span>
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${getBadgeStyles(farm.badge_color)}`}>
                        {farm.badge}
                      </span>
                    </div>
                    <span className="text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded">
                      {farm.main_issue}
                    </span>
                  </div>
                </button>
              ))
            ) : (
              <div className="text-center py-8 text-slate-500">
                لا توجد مزارع بعد
              </div>
            )}
          </div>
        </div>

        {/* Needs Attention - تحتاج تدخل */}
        <div className="bg-gradient-to-br from-red-50 to-rose-50 border-2 border-red-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-red-500 rounded-lg p-2">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">تحتاج تدخل</h3>
              <p className="text-xs text-slate-600">درجة أقل من 60</p>
            </div>
          </div>

          <div className="space-y-3">
            {data.needs_attention && data.needs_attention.length > 0 ? (
              data.needs_attention.map((farm) => (
                <button
                  key={farm.farm_id}
                  onClick={() => handleFarmClick(farm.farm_id)}
                  className="w-full bg-white hover:bg-red-50 border-2 border-red-200 hover:border-red-400 rounded-lg p-4 transition-all cursor-pointer text-right group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="flex-shrink-0">
                        <TrendingDown className="w-6 h-6 text-red-500" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-slate-900 group-hover:text-red-700 transition-colors">
                          {farm.farm_name}
                        </h4>
                        <p className="text-xs text-slate-500">
                          {farm.farm_city} • {farm.farm_location}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-red-600 transition-colors flex-shrink-0" />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-2xl font-black ${getScoreColor(farm.total_score)}`}>
                        {farm.total_score}
                      </span>
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${getBadgeStyles(farm.badge_color)}`}>
                        {farm.badge}
                      </span>
                    </div>
                    <span className="text-xs text-red-700 bg-red-100 px-2 py-1 rounded font-medium">
                      {farm.main_issue}
                    </span>
                  </div>
                </button>
              ))
            ) : (
              <div className="text-center py-8">
                <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                  <Trophy className="w-8 h-8 text-green-600" />
                </div>
                <p className="text-slate-700 font-medium">ممتاز!</p>
                <p className="text-sm text-slate-500 mt-1">
                  جميع المزارع بأداء جيد
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <BarChart3 className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-bold text-slate-900">إحصائيات سريعة</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-emerald-600">
              {data.top_5 ? data.top_5.length : 0}
            </p>
            <p className="text-xs text-slate-600 mt-1">أداء ممتاز</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-blue-600">
              {data.all_farms.filter(f => f.total_score >= 70 && f.total_score < 90).length}
            </p>
            <p className="text-xs text-slate-600 mt-1">أداء جيد</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-yellow-600">
              {data.all_farms.filter(f => f.total_score >= 60 && f.total_score < 70).length}
            </p>
            <p className="text-xs text-slate-600 mt-1">أداء مقبول</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-red-600">
              {data.needs_attention ? data.needs_attention.length : 0}
            </p>
            <p className="text-xs text-slate-600 mt-1">يحتاج تدخل</p>
          </div>
        </div>
      </div>
    </div>
  );
}
