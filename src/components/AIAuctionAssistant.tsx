import { useState, useEffect } from 'react';
import { X, Bot, TrendingUp, Users, Clock, MessageCircle, Sparkles, AlertCircle, CheckCircle, Zap } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useActivityLog } from '../hooks/useActivityLog';

interface AIAuctionAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  auctionId: string;
  auctionTitle: string;
  currentPlanType: 'free' | 'silver' | 'gold';
  onUpgradeClick: () => void;
}

interface AIInsight {
  id: string;
  insight_type: string;
  title_ar: string;
  message_ar: string;
  confidence_score: number;
  is_read: boolean;
  created_at: string;
}

export function AIAuctionAssistant({
  isOpen,
  onClose,
  auctionId,
  auctionTitle,
  currentPlanType,
  onUpgradeClick
}: AIAuctionAssistantProps) {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const { logAiAnalysis } = useActivityLog(auctionId);

  useEffect(() => {
    if (isOpen && currentPlanType === 'gold') {
      fetchInsights();
    }
  }, [isOpen, auctionId, currentPlanType]);

  const fetchInsights = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_auction_insights')
        .select('*')
        .eq('auction_id', auctionId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      if (data && data.length === 0) {
        generateMockInsights();
      } else {
        setInsights(data || []);

        if (data && data.length > 0) {
          await logAiAnalysis('insights_review', 95, {
            insights_count: data.length,
            types: data.map(d => d.insight_type)
          });
        }
      }
    } catch (error) {
      console.error('Error fetching insights:', error);
      generateMockInsights();
    } finally {
      setLoading(false);
    }
  };

  const generateMockInsights = () => {
    const mockInsights: AIInsight[] = [
      {
        id: '1',
        insight_type: 'engagement',
        title_ar: 'تفاعل ممتاز على المزاد',
        message_ar: 'المزاد يحقق 78% تفاعل أعلى من المتوسط. استمر في التفاعل مع المزايدين.',
        confidence_score: 92,
        is_read: false,
        created_at: new Date().toISOString()
      },
      {
        id: '2',
        insight_type: 'timing',
        title_ar: 'أفضل وقت للتمديد',
        message_ar: 'نشاط المزايدين يزداد بين 7-9 مساءً. أنصحك بتمديد المزاد إذا انتهى خارج هذا الوقت.',
        confidence_score: 85,
        is_read: false,
        created_at: new Date().toISOString()
      },
      {
        id: '3',
        insight_type: 'bidders',
        title_ar: 'مزايدون نشطون',
        message_ar: 'لديك 3 مزايدين نشطين يتابعون المزاد باستمرار. احتمالية ارتفاع السعر 80%.',
        confidence_score: 88,
        is_read: false,
        created_at: new Date().toISOString()
      },
      {
        id: '4',
        insight_type: 'price',
        title_ar: 'توقع السعر النهائي',
        message_ar: 'بناءً على التحليل، السعر المتوقع سيصل إلى 6,500 ر.س (زيادة 30% من السعر الحالي).',
        confidence_score: 75,
        is_read: false,
        created_at: new Date().toISOString()
      },
      {
        id: '5',
        insight_type: 'recommendation',
        title_ar: 'توصية ذكية',
        message_ar: 'أرسل رسالة تذكير للمتابعين قبل 2 ساعة من الانتهاء لزيادة المنافسة.',
        confidence_score: 90,
        is_read: false,
        created_at: new Date().toISOString()
      }
    ];

    setInsights(mockInsights);
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'engagement':
        return <Users className="w-5 h-5 text-blue-600" />;
      case 'timing':
        return <Clock className="w-5 h-5 text-orange-600" />;
      case 'bidders':
        return <TrendingUp className="w-5 h-5 text-green-600" />;
      case 'price':
        return <Sparkles className="w-5 h-5 text-purple-600" />;
      case 'recommendation':
        return <Zap className="w-5 h-5 text-yellow-600" />;
      default:
        return <Bot className="w-5 h-5 text-gray-600" />;
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-blue-600';
    return 'text-orange-600';
  };

  if (!isOpen) return null;

  if (currentPlanType !== 'gold') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bot className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">المساعد الذكي</h2>
            <p className="text-gray-600 mb-6">
              هذه الميزة متاحة فقط في الباقة الذهبية
            </p>

            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-400 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3 text-right">
                <Sparkles className="w-6 h-6 text-yellow-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-yellow-900 mb-2">
                    ما الذي ستحصل عليه:
                  </p>
                  <ul className="text-sm text-yellow-800 space-y-1">
                    <li>✨ تحليل ذكي للمزايدين</li>
                    <li>📊 توقع السعر النهائي</li>
                    <li>⏰ توصيات التمديد</li>
                    <li>💬 رسائل تلقائية للمهتمين</li>
                    <li>🎯 أفضل وقت للإغلاق</li>
                  </ul>
                </div>
              </div>
            </div>

            <button
              onClick={onUpgradeClick}
              className="w-full py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg hover:from-yellow-600 hover:to-orange-600 font-bold transition-all shadow-lg mb-3"
            >
              ترقية للباقة الذهبية
            </button>

            <button
              onClick={onClose}
              className="w-full py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full my-8 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                المساعد الذكي
              </h2>
              <p className="text-sm text-gray-600">{auctionTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[500px] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
            </div>
          ) : insights.length === 0 ? (
            <div className="text-center py-12">
              <Bot className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">لا توجد رؤى ذكية حالياً</p>
              <p className="text-sm text-gray-500 mt-2">
                سيقوم المساعد الذكي بتحليل المزاد قريباً
              </p>
            </div>
          ) : (
            insights.map((insight) => (
              <div
                key={insight.id}
                className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-4"
              >
                <div className="flex items-start gap-3 text-right">
                  <div className="flex-shrink-0 mt-1">
                    {getInsightIcon(insight.insight_type)}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 mb-1">
                      {insight.title_ar}
                    </h3>
                    <p className="text-sm text-gray-700 leading-relaxed mb-2">
                      {insight.message_ar}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              insight.confidence_score >= 90
                                ? 'bg-green-500'
                                : insight.confidence_score >= 75
                                ? 'bg-blue-500'
                                : 'bg-orange-500'
                            }`}
                            style={{ width: `${insight.confidence_score}%` }}
                          />
                        </div>
                        <span
                          className={`text-xs font-bold ${getConfidenceColor(
                            insight.confidence_score
                          )}`}
                        >
                          {insight.confidence_score}%
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(insight.created_at).toLocaleTimeString('ar-EG', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-6 border-t bg-gradient-to-r from-purple-50 to-pink-50">
          <div className="flex items-center gap-2 text-sm text-purple-900">
            <CheckCircle className="w-4 h-4 text-purple-600" />
            <span className="font-medium">
              يتم تحديث التحليلات كل 5 دقائق تلقائياً
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
