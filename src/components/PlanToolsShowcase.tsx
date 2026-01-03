import { useEffect, useState } from 'react';
import { Check, Lock, Crown, Sparkles, Zap } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Tool {
  id: string;
  tool_key: string;
  tool_name_ar: string;
  description_ar: string;
  icon: string;
  available_in_free: boolean;
  available_in_silver: boolean;
  available_in_gold: boolean;
  requires_ai: boolean;
  display_order: number;
}

interface PlanToolsShowcaseProps {
  planType: 'free' | 'silver' | 'gold';
  showComparison?: boolean;
}

export function PlanToolsShowcase({ planType, showComparison = false }: PlanToolsShowcaseProps) {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTools();
  }, []);

  const loadTools = async () => {
    try {
      const { data, error } = await supabase
        .from('auction_tools')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setTools(data || []);
    } catch (error) {
      console.error('Error loading tools:', error);
    } finally {
      setLoading(false);
    }
  };

  const getToolIcon = (iconKey: string) => {
    const icons: Record<string, string> = {
      'lock': '🔒',
      'check-circle': '✅',
      'share-2': '📤',
      'rotate-ccw': '🔄',
      'clock': '⏰',
      'alert-triangle': '⚠️',
      'refresh-cw': '🔁',
      'bot': '🤖',
      'lightbulb': '💡',
      'bar-chart-2': '📊',
      'message-circle': '💬',
      'target': '🎯'
    };
    return icons[iconKey] || '🔧';
  };

  const isToolAvailable = (tool: Tool) => {
    switch (planType) {
      case 'free':
        return tool.available_in_free;
      case 'silver':
        return tool.available_in_silver;
      case 'gold':
        return tool.available_in_gold;
      default:
        return false;
    }
  };

  const getPlanColor = () => {
    switch (planType) {
      case 'free':
        return {
          gradient: 'from-gray-50 to-gray-100',
          border: 'border-gray-300',
          badge: 'bg-gray-600',
          icon: 'text-gray-600',
          available: 'bg-green-50 border-green-300 text-green-800',
          locked: 'bg-gray-50 border-gray-200 text-gray-400'
        };
      case 'silver':
        return {
          gradient: 'from-blue-50 to-indigo-50',
          border: 'border-blue-300',
          badge: 'bg-blue-600',
          icon: 'text-blue-600',
          available: 'bg-blue-50 border-blue-300 text-blue-800',
          locked: 'bg-gray-50 border-gray-200 text-gray-400'
        };
      case 'gold':
        return {
          gradient: 'from-yellow-50 to-amber-50',
          border: 'border-yellow-400',
          badge: 'bg-yellow-600',
          icon: 'text-yellow-600',
          available: 'bg-yellow-50 border-yellow-300 text-yellow-900',
          locked: 'bg-gray-50 border-gray-200 text-gray-400'
        };
    }
  };

  const getPlanName = () => {
    switch (planType) {
      case 'free': return 'المجانية';
      case 'silver': return 'الفضية';
      case 'gold': return 'الذهبية';
    }
  };

  const getPlanIcon = () => {
    switch (planType) {
      case 'free': return <Zap className="w-5 h-5" />;
      case 'silver': return <Sparkles className="w-5 h-5" />;
      case 'gold': return <Crown className="w-5 h-5" />;
    }
  };

  const colors = getPlanColor();

  if (loading) {
    return (
      <div className="animate-pulse space-y-2">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="h-20 bg-gray-200 rounded"></div>
        <div className="h-20 bg-gray-200 rounded"></div>
        <div className="h-20 bg-gray-200 rounded"></div>
      </div>
    );
  }

  const availableTools = tools.filter(tool => isToolAvailable(tool));
  const lockedTools = tools.filter(tool => !isToolAvailable(tool));

  return (
    <div className="space-y-4">
      <div className={`bg-gradient-to-br ${colors.gradient} rounded-xl p-4 border-2 ${colors.border}`}>
        <div className="flex items-center gap-3 mb-3">
          <div className={`${colors.badge} p-2 rounded-lg ${colors.icon}`}>
            {getPlanIcon()}
          </div>
          <div>
            <h3 className="text-lg font-black text-gray-900">
              أدوات الباقة {getPlanName()}
            </h3>
            <p className="text-sm text-gray-600">
              {availableTools.length} أداة متاحة من أصل {tools.length}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {availableTools.map((tool) => (
            <div
              key={tool.id}
              className={`${colors.available} border-2 rounded-lg p-3 transition-all hover:shadow-md`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <span className="text-2xl">{getToolIcon(tool.icon)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-bold text-sm leading-tight">
                      {tool.tool_name_ar}
                    </p>
                    <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                    {tool.requires_ai && (
                      <div className="flex items-center gap-1 bg-purple-100 px-2 py-0.5 rounded-full">
                        <Sparkles className="w-3 h-3 text-purple-600" />
                        <span className="text-xs font-bold text-purple-600">AI</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs leading-tight opacity-90">
                    {tool.description_ar}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {showComparison && lockedTools.length > 0 && (
          <>
            <div className="my-4 border-t-2 border-dashed border-gray-300"></div>
            <div className="mb-3">
              <p className="text-sm font-bold text-gray-600 flex items-center gap-2">
                <Lock className="w-4 h-4" />
                أدوات مقفلة ({lockedTools.length})
              </p>
              <p className="text-xs text-gray-500 mt-1">
                هذه الأدوات متاحة في الباقات الأعلى
              </p>
            </div>

            <div className="space-y-2">
              {lockedTools.slice(0, 3).map((tool) => (
                <div
                  key={tool.id}
                  className={`${colors.locked} border-2 rounded-lg p-3 opacity-60`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <span className="text-2xl grayscale">{getToolIcon(tool.icon)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold text-sm leading-tight">
                          {tool.tool_name_ar}
                        </p>
                        <Lock className="w-4 h-4 flex-shrink-0" />
                        {tool.requires_ai && (
                          <div className="flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-full">
                            <Sparkles className="w-3 h-3 text-gray-400" />
                            <span className="text-xs font-bold text-gray-400">AI</span>
                          </div>
                        )}
                      </div>
                      <p className="text-xs leading-tight">
                        {tool.description_ar}
                      </p>
                      <p className="text-xs font-bold mt-1 text-blue-600">
                        متاحة في الباقة {tool.available_in_silver ? 'الفضية' : 'الذهبية'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {lockedTools.length > 3 && (
                <div className="text-center py-2">
                  <p className="text-xs font-bold text-gray-600">
                    + {lockedTools.length - 3} أدوات أخرى متاحة في الباقات الأعلى
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
