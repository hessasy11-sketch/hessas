import { useState, useEffect } from 'react';
import { X, TrendingUp, Crown, Sparkles, AlertTriangle, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useActivityLog } from '../hooks/useActivityLog';

interface SmartSuggestionsPanelProps {
  auctionId: string;
  currentPlanType: 'free' | 'silver' | 'gold';
  engagementLevel: 'low' | 'medium' | 'high';
  onUpgradeClick: () => void;
}

interface Suggestion {
  id: string;
  suggestion_type: string;
  title_ar: string;
  message_ar: string;
  action_type: string;
  priority: string;
  status: string;
  is_dismissed: boolean;
}

export function SmartSuggestionsPanel({
  auctionId,
  currentPlanType,
  engagementLevel,
  onUpgradeClick
}: SmartSuggestionsPanelProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const { logAiSuggestion } = useActivityLog(auctionId);

  useEffect(() => {
    fetchSuggestions();
  }, [auctionId, currentPlanType, engagementLevel]);

  const fetchSuggestions = async () => {
    try {
      const { data, error } = await supabase
        .from('auction_suggestions')
        .select('*')
        .eq('auction_id', auctionId)
        .eq('is_dismissed', false)
        .order('priority', { ascending: false })
        .limit(5);

      if (error) throw error;

      if (!data || data.length === 0) {
        generateSmartSuggestions();
      } else {
        setSuggestions(data);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      generateSmartSuggestions();
    } finally {
      setLoading(false);
    }
  };

  const generateSmartSuggestions = () => {
    const mockSuggestions: Suggestion[] = [];

    if (currentPlanType === 'free' && engagementLevel === 'high') {
      mockSuggestions.push({
        id: '1',
        suggestion_type: 'upgrade',
        title_ar: 'التفاعل ممتاز! قم بالترقية',
        message_ar: 'مزادك يحقق تفاعل عالي جداً. الترقية للفضية ستمنحك أدوات التمديد والإعلانات لزيادة المبيعات بنسبة 45%.',
        action_type: 'upgrade_silver',
        priority: 'high',
        status: 'pending',
        is_dismissed: false
      });
    }

    if (currentPlanType === 'free' && engagementLevel === 'low') {
      mockSuggestions.push({
        id: '2',
        suggestion_type: 'upgrade',
        title_ar: 'حسّن أداء مزادك',
        message_ar: 'التفاعل منخفض. الباقة الفضية توفر لك أدوات إعلان قرب الانتهاء والتمديد لجذب المزيد من المزايدين.',
        action_type: 'upgrade_silver',
        priority: 'medium',
        status: 'pending',
        is_dismissed: false
      });
    }

    if (currentPlanType === 'silver' && engagementLevel === 'high') {
      mockSuggestions.push({
        id: '3',
        suggestion_type: 'upgrade',
        title_ar: 'استفد من الذكاء الصناعي',
        message_ar: 'مزادك رائع! الترقية للذهبية ستمنحك مساعد ذكي يحلل المزايدين ويرسل رسائل تلقائية لزيادة المبيعات.',
        action_type: 'upgrade_gold',
        priority: 'high',
        status: 'pending',
        is_dismissed: false
      });
    }

    if (engagementLevel === 'high') {
      mockSuggestions.push({
        id: '4',
        suggestion_type: 'timing',
        title_ar: 'أفضل وقت لإنهاء المزاد',
        message_ar: 'المزايدون أكثر نشاطاً بين 7-9 مساءً. حاول إنهاء مزادك في هذا الوقت لزيادة السعر.',
        action_type: 'schedule',
        priority: 'medium',
        status: 'pending',
        is_dismissed: false
      });
    }

    if (engagementLevel === 'low') {
      mockSuggestions.push({
        id: '5',
        suggestion_type: 'promotion',
        title_ar: 'روج لمزادك',
        message_ar: 'قلة التفاعل تعني حاجتك للترويج. شارك المزاد على 3 منصات تواصل على الأقل لزيادة المشاهدات.',
        action_type: 'share',
        priority: 'high',
        status: 'pending',
        is_dismissed: false
      });
    }

    mockSuggestions.slice(0, 3).forEach(async (suggestion) => {
      await logAiSuggestion(
        suggestion.suggestion_type,
        suggestion.message_ar,
        85
      );
    });

    setSuggestions(mockSuggestions.slice(0, 3));
  };

  const dismissSuggestion = async (suggestionId: string) => {
    try {
      await supabase
        .from('auction_suggestions')
        .update({ is_dismissed: true })
        .eq('id', suggestionId);

      setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
    } catch (error) {
      console.error('Error dismissing suggestion:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-50 border-red-300';
      case 'medium':
        return 'bg-yellow-50 border-yellow-300';
      default:
        return 'bg-blue-50 border-blue-300';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'medium':
        return <Sparkles className="w-5 h-5 text-yellow-600" />;
      default:
        return <CheckCircle className="w-5 h-5 text-blue-600" />;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <TrendingUp className="w-5 h-5 text-purple-600" />
        <h3 className="text-base font-bold text-gray-900">اقتراحات ذكية</h3>
      </div>

      <div className="space-y-2">
        {suggestions.map((suggestion) => (
          <div
            key={suggestion.id}
            className={`p-3 border rounded-lg ${getPriorityColor(suggestion.priority)}`}
          >
            <div className="flex items-start gap-3 text-right">
              <div className="flex-shrink-0 mt-0.5">
                {getPriorityIcon(suggestion.priority)}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-gray-900 mb-1">
                  {suggestion.title_ar}
                </h4>
                <p className="text-xs text-gray-700 leading-relaxed mb-2">
                  {suggestion.message_ar}
                </p>
                <div className="flex items-center gap-2">
                  {suggestion.action_type.includes('upgrade') && (
                    <button
                      onClick={onUpgradeClick}
                      className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 text-xs font-bold transition-all flex items-center gap-1"
                    >
                      <Crown className="w-3 h-3" />
                      ترقية الآن
                    </button>
                  )}
                  <button
                    onClick={() => dismissSuggestion(suggestion.id)}
                    className="text-xs text-gray-600 hover:text-gray-800 underline"
                  >
                    تجاهل
                  </button>
                </div>
              </div>
              <button
                onClick={() => dismissSuggestion(suggestion.id)}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
