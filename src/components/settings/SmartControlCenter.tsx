import { useState, useEffect } from 'react';
import { Zap, TrendingUp, TrendingDown, Crown, Sparkles, RefreshCw, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface AIRecommendation {
  id: string;
  recommendation_type: string;
  recommendation_title: string;
  recommendation_details: any;
  priority: 'high' | 'medium' | 'low';
  confidence_score: number;
  status: string;
}

export function SmartControlCenter() {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [mode, setMode] = useState<'normal' | 'economy' | 'advanced'>('normal');
  const [loading, setLoading] = useState(true);
  const [currentMode, setCurrentMode] = useState<string>('normal');

  useEffect(() => {
    loadCurrentMode();
    loadRecommendations();
  }, []);

  const loadCurrentMode = async () => {
    try {
      const { data } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'performance_mode')
        .maybeSingle();

      if (data?.setting_value?.mode) {
        setMode(data.setting_value.mode);
        setCurrentMode(data.setting_value.mode);
      }
    } catch (error) {
      console.error('Error loading mode:', error);
    }
  };

  const loadRecommendations = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_recommendations')
        .select('*')
        .eq('status', 'pending')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(6);

      if (error) throw error;

      setRecommendations(data || []);
    } catch (error) {
      console.error('Error loading recommendations:', error);
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSmartOptimization = async () => {
    if (!user) return;

    setIsOptimizing(true);

    try {
      if (recommendations.length === 0) {
        alert('لا توجد توصيات متاحة للتطبيق حالياً');
        return;
      }

      for (const rec of recommendations) {
        await supabase
          .from('ai_recommendations')
          .update({
            status: 'applied',
            applied_at: new Date().toISOString()
          })
          .eq('id', rec.id);
      }

      await supabase
        .from('system_logs')
        .insert({
          action_type: 'smart_optimization',
          action_data: {
            mode: 'auto',
            timestamp: new Date().toISOString(),
            applied_recommendations: recommendations.map(r => r.recommendation_type),
            admin_id: user.id
          },
          impact_analysis: {
            recommendations_count: recommendations.length,
            areas_affected: ['sliders', 'filters', 'regions', 'tools']
          }
        });

      alert(`✅ تم تطبيق ${recommendations.length} توصية بنجاح!`);
      loadRecommendations();
    } catch (error) {
      console.error('Error:', error);
      alert('حدث خطأ في التحسين التلقائي');
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleEconomyMode = async () => {
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          setting_key: 'performance_mode',
          setting_value: { mode: 'economy', enabled_at: new Date().toISOString() },
          category: 'performance',
          description: 'وضع اقتصادي لتحسين الأداء'
        }, { onConflict: 'setting_key' });

      if (!error) {
        setMode('economy');
        alert('✅ تم تفعيل الوضع الاقتصادي');

        await supabase.from('system_logs').insert({
          action_type: 'mode_change',
          action_data: {
            old_mode: currentMode,
            new_mode: 'economy',
            admin_id: user?.id
          }
        });
      }
    } catch (error) {
      console.error('Error:', error);
      alert('حدث خطأ في تغيير الوضع');
    }
  };

  const handleAdvancedMode = async () => {
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          setting_key: 'performance_mode',
          setting_value: { mode: 'advanced', enabled_at: new Date().toISOString() },
          category: 'performance',
          description: 'وضع متقدم للمستخدمين الكبار'
        }, { onConflict: 'setting_key' });

      if (!error) {
        setMode('advanced');
        alert('✅ تم تفعيل الوضع المتقدم');

        await supabase.from('system_logs').insert({
          action_type: 'mode_change',
          action_data: {
            old_mode: currentMode,
            new_mode: 'advanced',
            admin_id: user?.id
          }
        });
      }
    } catch (error) {
      console.error('Error:', error);
      alert('حدث خطأ في تغيير الوضع');
    }
  };

  const applyRecommendation = async (recommendation: AIRecommendation) => {
    const confirmed = confirm(`هل تريد تطبيق هذه التوصية؟\n\n${recommendation.recommendation_title}\n\nمستوى الثقة: ${Math.round(recommendation.confidence_score * 100)}%`);

    if (confirmed) {
      try {
        const { error } = await supabase
          .from('ai_recommendations')
          .update({
            status: 'applied',
            applied_at: new Date().toISOString()
          })
          .eq('id', recommendation.id);

        if (!error) {
          await supabase.from('system_logs').insert({
            action_type: 'recommendation_applied',
            action_data: {
              recommendation_type: recommendation.recommendation_type,
              recommendation_id: recommendation.id,
              admin_id: user?.id
            }
          });

          alert('✅ تم تطبيق التوصية بنجاح!');
          loadRecommendations();
        }
      } catch (error) {
        console.error('Error:', error);
        alert('حدث خطأ في تطبيق التوصية');
      }
    }
  };

  const getImpactColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#EF4444';
      case 'medium': return '#F59E0B';
      case 'low': return '#10B981';
      default: return '#6B7280';
    }
  };

  const getImpactLabel = (priority: string) => {
    switch (priority) {
      case 'high': return 'تأثير عالي';
      case 'medium': return 'تأثير متوسط';
      case 'low': return 'تأثير منخفض';
      default: return 'غير محدد';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
          <span className="text-gray-600">جاري التحميل...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">مركز التحكم الذكي</h3>
        <p className="text-gray-600">نظام تحكم متطور مدعوم بالذكاء الصناعي</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <button
          onClick={handleSmartOptimization}
          disabled={isOptimizing || recommendations.length === 0}
          className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl shadow-lg hover:shadow-xl transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Zap className="w-8 h-8 mb-3 mx-auto" />
          <div className="font-bold text-lg mb-1">
            {isOptimizing ? 'جاري التحسين...' : 'تحسين تلقائي'}
          </div>
          <div className="text-sm opacity-90">
            {recommendations.length > 0
              ? `تطبيق ${recommendations.length} توصية`
              : 'لا توجد توصيات'}
          </div>
        </button>

        <button
          onClick={handleEconomyMode}
          className={`p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all hover:scale-105 ${
            mode === 'economy'
              ? 'bg-gradient-to-br from-green-500 to-green-600 text-white'
              : 'bg-white text-gray-700 border-2 border-gray-200'
          }`}
        >
          <TrendingDown className="w-8 h-8 mb-3 mx-auto" />
          <div className="font-bold text-lg mb-1">الوضع الاقتصادي</div>
          <div className="text-sm opacity-75">أداء سريع ومحسّن</div>
        </button>

        <button
          onClick={handleAdvancedMode}
          className={`p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all hover:scale-105 ${
            mode === 'advanced'
              ? 'bg-gradient-to-br from-purple-500 to-purple-600 text-white'
              : 'bg-white text-gray-700 border-2 border-gray-200'
          }`}
        >
          <Crown className="w-8 h-8 mb-3 mx-auto" />
          <div className="font-bold text-lg mb-1">الوضع المتقدم</div>
          <div className="text-sm opacity-75">مميزات كاملة</div>
        </button>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-6 h-6 text-purple-500" />
          <h4 className="text-xl font-bold text-gray-900">لوحة القرارات الذكية</h4>
        </div>

        {recommendations.length === 0 ? (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-8 text-center">
            <Info className="w-12 h-12 text-blue-500 mx-auto mb-3" />
            <h5 className="font-bold text-blue-900 mb-2">لا توجد توصيات حالياً</h5>
            <p className="text-blue-700 text-sm">
              سيقوم النظام بتحليل البيانات وإنشاء توصيات ذكية بناءً على نشاط المستخدمين والمزادات
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {recommendations.map((rec) => (
              <div
                key={rec.id}
                className="bg-white rounded-xl p-5 border-2 border-gray-100 hover:border-blue-200 transition-all hover:shadow-lg"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h5 className="font-bold text-gray-900 mb-1">{rec.recommendation_title}</h5>
                    <p className="text-sm text-gray-600">
                      {typeof rec.recommendation_details === 'string'
                        ? rec.recommendation_details
                        : rec.recommendation_details?.description || 'توصية ذكية'}
                    </p>
                  </div>
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0 ml-3"
                    style={{ backgroundColor: getImpactColor(rec.priority) }}
                  >
                    {Math.round(rec.confidence_score * 100)}%
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span
                    className="px-3 py-1 rounded-lg text-xs font-semibold"
                    style={{
                      backgroundColor: `${getImpactColor(rec.priority)}15`,
                      color: getImpactColor(rec.priority)
                    }}
                  >
                    {getImpactLabel(rec.priority)}
                  </span>

                  <button
                    onClick={() => applyRecommendation(rec)}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-semibold hover:bg-blue-600 transition-colors flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    تطبيق
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {recommendations.length > 0 && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />
            <div>
              <h5 className="font-bold text-amber-900 mb-2">توصيات متاحة</h5>
              <p className="text-amber-800 text-sm">
                يوجد {recommendations.length} توصية جاهزة للتطبيق. يمكنك تطبيقها جميعاً باستخدام زر "تحسين تلقائي" أو تطبيق كل توصية على حدة.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
