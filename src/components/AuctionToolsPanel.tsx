import { Lock, Sparkles, Crown, Zap, AlertCircle } from 'lucide-react';
import { AuctionTool } from '../hooks/useAuctionTools';

interface AuctionToolsPanelProps {
  availableTools: AuctionTool[];
  lockedTools: AuctionTool[];
  currentPlanType: 'free' | 'silver' | 'gold';
  onToolClick: (tool: AuctionTool) => void;
  onUpgradeClick: () => void;
}

export function AuctionToolsPanel({
  availableTools,
  lockedTools,
  currentPlanType,
  onToolClick,
  onUpgradeClick
}: AuctionToolsPanelProps) {
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

  const getRequiredPlanName = (tool: AuctionTool): string => {
    if (!tool.available_in_free && tool.available_in_silver) return 'الفضية';
    if (!tool.available_in_silver && tool.available_in_gold) return 'الذهبية';
    return 'الذهبية';
  };

  const getPlanColor = () => {
    switch (currentPlanType) {
      case 'free':
        return { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' };
      case 'silver':
        return { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-400' };
      case 'gold':
        return { bg: 'bg-yellow-50', text: 'text-yellow-900', border: 'border-yellow-400' };
    }
  };

  const colors = getPlanColor();

  if (availableTools.length === 0 && lockedTools.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
      {availableTools.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            {currentPlanType === 'gold' && <Crown className="w-5 h-5 text-yellow-600" />}
            {currentPlanType === 'silver' && <Sparkles className="w-5 h-5 text-gray-500" />}
            {currentPlanType === 'free' && <Zap className="w-5 h-5 text-green-600" />}
            <h3 className="text-base font-bold text-gray-900">أدوات إدارة المزاد</h3>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {availableTools.map((tool) => (
              <button
                key={tool.id}
                onClick={() => onToolClick(tool)}
                className={`p-3 ${colors.bg} border ${colors.border} rounded-lg hover:shadow-md transition-all text-right group relative overflow-hidden`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="flex items-start gap-2 mb-1">
                    <span className="text-2xl">{getToolIcon(tool.icon)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 leading-tight">
                        {tool.tool_name_ar}
                      </p>
                      {tool.requires_ai && (
                        <div className="flex items-center gap-1 mt-1">
                          <Sparkles className="w-3 h-3 text-purple-600" />
                          <span className="text-xs text-purple-600 font-medium">AI</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 leading-tight">
                    {tool.description_ar}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {lockedTools.length > 0 && currentPlanType !== 'gold' && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Lock className="w-5 h-5 text-orange-600" />
            <h3 className="text-base font-bold text-gray-900">أدوات مقفلة</h3>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3">
            {lockedTools.slice(0, 4).map((tool) => (
              <button
                key={tool.id}
                onClick={onUpgradeClick}
                className="p-3 bg-gray-50 border border-gray-300 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-all text-right group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="flex items-start gap-2 mb-1">
                    <div className="relative">
                      <span className="text-2xl opacity-40">{getToolIcon(tool.icon)}</span>
                      <Lock className="w-3 h-3 text-orange-600 absolute -top-1 -right-1" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-500 leading-tight">
                        {tool.tool_name_ar}
                      </p>
                      <p className="text-xs text-orange-600 font-medium mt-1">
                        {getRequiredPlanName(tool)}
                      </p>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {lockedTools.length > 4 && (
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg mb-3">
              <p className="text-sm text-orange-800 text-center font-medium">
                +{lockedTools.length - 4} أداة أخرى متاحة في الباقات الأعلى
              </p>
            </div>
          )}

          <button
            onClick={onUpgradeClick}
            className="w-full p-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 transition-all shadow-lg font-bold text-sm flex items-center justify-center gap-2"
          >
            <Crown className="w-5 h-5" />
            ترقية للوصول لجميع الأدوات
          </button>
        </div>
      )}

      {currentPlanType === 'free' && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2 text-right">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-bold text-blue-900 mb-1">
                أنت على الباقة المجانية
              </p>
              <p className="text-xs text-blue-700 leading-relaxed">
                قم بالترقية للفضية للحصول على أدوات التمديد والإشعارات، أو الذهبية للحصول على المساعد الذكي والتحليلات
              </p>
            </div>
          </div>
        </div>
      )}

      {currentPlanType === 'silver' && lockedTools.length > 0 && (
        <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="flex items-start gap-2 text-right">
            <Sparkles className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-bold text-purple-900 mb-1">
                الذكاء الصناعي في انتظارك
              </p>
              <p className="text-xs text-purple-700 leading-relaxed">
                الترقية للذهبية تمنحك {lockedTools.length} أداة ذكاء صناعي لتحسين أداء مزاداتك تلقائياً
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
