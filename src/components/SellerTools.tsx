import { useState } from 'react';
import {
  Lock, Unlock, Clock, CheckCircle, RotateCcw, AlertTriangle,
  Share2, Crown, Sparkles, TrendingUp, MessageSquare, Zap, Edit3
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSubscriptionAwareTools } from '../hooks/useSubscriptionAwareTools';
import { FeatureLockedModal } from './FeatureLockedModal';

interface SellerToolsProps {
  auctionId: string;
  chatStatus: string;
  onToggleChat: () => void;
  onExtend: () => void;
  onMarkSold: () => void;
  onShare: () => void;
  onMarkClosingSoon?: () => void;
  onRepost?: () => void;
  onSmartAssist?: () => void;
  onViewAnalytics?: () => void;
  onEdit?: () => void;
}

export function SellerTools({
  auctionId,
  chatStatus,
  onToggleChat,
  onExtend,
  onMarkSold,
  onShare,
  onMarkClosingSoon,
  onRepost,
  onSmartAssist,
  onViewAnalytics,
  onEdit
}: SellerToolsProps) {
  const { user } = useAuth();
  const {
    effectiveTools,
    restrictedTools,
    warningMessage,
    checkToolAccess,
    currentPlanType,
  } = useSubscriptionAwareTools(user?.id);

  const [showLockedModal, setShowLockedModal] = useState(false);
  const [lockedFeature, setLockedFeature] = useState<{
    name: string;
    requiredPlan: 'silver' | 'gold';
  } | null>(null);

  const handleLockedFeature = (featureName: string, requiredPlan: 'silver' | 'gold') => {
    setLockedFeature({ name: featureName, requiredPlan });
    setShowLockedModal(true);
  };

  const handleExtendClick = () => {
    const access = checkToolAccess('extend_auction');
    if (!access.allowed) {
      handleLockedFeature('تمديد المزاد', currentPlanType === 'free' ? 'silver' : 'gold');
      return;
    }
    onExtend();
  };

  const handleRepostClick = () => {
    const access = checkToolAccess('repost_auction');
    if (!access.allowed) {
      handleLockedFeature('إعادة نشر المزاد', currentPlanType === 'free' ? 'silver' : 'gold');
      return;
    }
    if (onRepost) onRepost();
  };

  const handleClosingSoonClick = () => {
    const access = checkToolAccess('closing_alert');
    if (!access.allowed) {
      handleLockedFeature('إعلان قرب انتهاء المزاد', 'silver');
      return;
    }
    if (onMarkClosingSoon) onMarkClosingSoon();
  };

  const handleSmartAssistClick = () => {
    const access = checkToolAccess('smart_assistant');
    if (!access.allowed) {
      handleLockedFeature('المساعد الذكي في المزاد', 'gold');
      return;
    }
    if (onSmartAssist) onSmartAssist();
  };

  const handleAnalyticsClick = () => {
    const access = checkToolAccess('analytics');
    if (!access.allowed) {
      handleLockedFeature('تحليلات المزاد', currentPlanType === 'free' ? 'silver' : 'gold');
      return;
    }
    if (onViewAnalytics) onViewAnalytics();
  };

  const isSilverOrHigher = () => {
    return currentPlanType === 'silver' || currentPlanType === 'gold';
  };

  const isGoldUser = () => {
    return currentPlanType === 'gold';
  };

  const canExtendAuction = () => {
    return checkToolAccess('extend_auction').allowed;
  };

  const canRepost = () => {
    return checkToolAccess('repost_auction').allowed;
  };

  const canMarkClosing = () => {
    return checkToolAccess('closing_alert').allowed;
  };

  const canUseSmartAssistant = () => {
    return checkToolAccess('smart_assistant').allowed;
  };

  const canViewAnalytics = () => {
    return checkToolAccess('analytics').allowed;
  };

  const getPlanBadge = () => {
    if (currentPlanType === 'gold') {
      return (
        <span className="text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 bg-gradient-to-r from-yellow-400 to-yellow-600 text-white shadow-lg">
          <Crown className="w-3 h-3" />
          ذهبي
        </span>
      );
    } else if (currentPlanType === 'silver') {
      return (
        <span className="text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 bg-gradient-to-r from-blue-400 to-blue-600 text-white shadow-lg">
          <Sparkles className="w-3 h-3" />
          فضي
        </span>
      );
    } else {
      return (
        <span className="text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 bg-gray-400 text-white">
          مجاني
        </span>
      );
    }
  };

  return (
    <>
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-5 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900 flex items-center gap-2 text-lg">
            ⚙️ أدوات البائع
          </h3>
          {getPlanBadge()}
        </div>

        {warningMessage && (
          <div className="mb-4 p-3 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
            <p className="text-sm text-yellow-800 font-medium text-center">
              {warningMessage}
            </p>
          </div>
        )}

        <div className="space-y-4">
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <h4 className="text-xs font-bold text-gray-600 mb-2">✅ الأدوات الأساسية (مجانية)</h4>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onEdit}
                className="flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-500 text-white rounded-lg font-medium text-sm hover:bg-blue-600 transition-all hover:scale-105 shadow-md"
              >
                <Edit3 className="w-4 h-4" />
                <span>تعديل الإعلان</span>
              </button>

              <button
                onClick={onToggleChat}
                className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg font-medium text-sm transition-all hover:scale-105 ${
                  chatStatus === 'closed'
                    ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-md'
                    : 'bg-red-500 text-white hover:bg-red-600 shadow-md'
                }`}
              >
                {chatStatus === 'closed' ? (
                  <>
                    <Unlock className="w-4 h-4" />
                    <span>فتح المزاد</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>إغلاق المزاد</span>
                  </>
                )}
              </button>

              <button
                onClick={onMarkSold}
                className="flex items-center justify-center gap-2 px-3 py-2.5 bg-green-500 text-white rounded-lg font-medium text-sm hover:bg-green-600 transition-all hover:scale-105 shadow-md"
              >
                <CheckCircle className="w-4 h-4" />
                <span>تم البيع</span>
              </button>

              <button
                onClick={onShare}
                className="flex items-center justify-center gap-2 px-3 py-2.5 bg-gray-600 text-white rounded-lg font-medium text-sm hover:bg-gray-700 transition-all hover:scale-105 shadow-md"
              >
                <Share2 className="w-4 h-4" />
                <span>مشاركة</span>
              </button>

              <button
                onClick={handleRepostClick}
                className="flex items-center justify-center gap-2 px-3 py-2.5 bg-gray-300 text-gray-600 rounded-lg font-medium text-sm hover:bg-gray-400 transition-all hover:scale-105 shadow-md col-span-2"
                title="متاح بعد 24 ساعة"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="text-xs">إعادة نشر (24س)</span>
              </button>
            </div>
          </div>

          <div className={`rounded-lg p-3 border-2 ${
            isSilverOrHigher()
              ? 'bg-blue-50 border-blue-300'
              : 'bg-gray-100 border-gray-300 opacity-60'
          }`}>
            <h4 className="text-xs font-bold mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span className={isSilverOrHigher() ? 'text-blue-700' : 'text-gray-600'}>
                أدوات الباقة الفضية
              </span>
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleExtendClick}
                className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg font-medium text-sm transition-all hover:scale-105 shadow-md ${
                  canExtendAuction()
                    ? 'bg-orange-500 text-white hover:bg-orange-600'
                    : 'bg-gray-300 text-gray-600 cursor-not-allowed relative'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>تمديد المزاد</span>
                {!canExtendAuction() && (
                  <Crown className="w-3 h-3 absolute -top-1 -right-1 text-yellow-500" />
                )}
              </button>

              <button
                onClick={handleClosingSoonClick}
                className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg font-medium text-sm transition-all hover:scale-105 shadow-md ${
                  isSilverOrHigher()
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-gray-300 text-gray-600 cursor-not-allowed relative'
                }`}
              >
                <AlertTriangle className="w-4 h-4" />
                <span className="text-xs">قرب الإغلاق</span>
                {!isSilverOrHigher() && (
                  <Crown className="w-3 h-3 absolute -top-1 -right-1 text-yellow-500" />
                )}
              </button>
            </div>
          </div>

          <div className={`rounded-lg p-3 border-2 ${
            isGoldUser()
              ? 'bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-300'
              : 'bg-gray-100 border-gray-300 opacity-60'
          }`}>
            <h4 className="text-xs font-bold mb-2 flex items-center gap-2">
              <Crown className="w-4 h-4 text-yellow-600" />
              <span className={isGoldUser() ? 'text-yellow-700' : 'text-gray-600'}>
                أدوات الباقة الذهبية
              </span>
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleSmartAssistClick}
                className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg font-medium text-sm transition-all hover:scale-105 shadow-md ${
                  canUseSmartAssistant()
                    ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700'
                    : 'bg-gray-300 text-gray-600 cursor-not-allowed relative'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span className="text-xs">مساعد ذكي</span>
                {!canUseSmartAssistant() && (
                  <Crown className="w-3 h-3 absolute -top-1 -right-1 text-yellow-500" />
                )}
              </button>

              <button
                onClick={handleAnalyticsClick}
                className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg font-medium text-sm transition-all hover:scale-105 shadow-md ${
                  canViewAnalytics()
                    ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white hover:from-teal-600 hover:to-teal-700'
                    : 'bg-gray-300 text-gray-600 cursor-not-allowed relative'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs">التحليلات</span>
                {!canViewAnalytics() && (
                  <Crown className="w-3 h-3 absolute -top-1 -right-1 text-yellow-500" />
                )}
              </button>

              <button
                className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg font-medium text-sm transition-all hover:scale-105 shadow-md col-span-2 ${
                  isGoldUser()
                    ? 'bg-gradient-to-r from-pink-500 to-pink-600 text-white hover:from-pink-600 hover:to-pink-700'
                    : 'bg-gray-300 text-gray-600 cursor-not-allowed relative'
                }`}
                onClick={() => !isGoldUser() && handleLockedFeature('رسائل تشجيعية للمزايدين', 'gold')}
              >
                <MessageSquare className="w-4 h-4" />
                <span className="text-xs">رسائل تشجيعية للمزايدين</span>
                {!isGoldUser() && (
                  <Crown className="w-3 h-3 absolute -top-1 -right-1 text-yellow-500" />
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 text-xs rounded-lg p-3 flex items-start gap-2 bg-blue-100 border border-blue-200">
          <Zap className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-blue-700">
            {currentPlanType === 'free' ? (
              <p>
                <strong>ترقّ لباقة مدفوعة</strong> للحصول على أدوات متقدمة تساعدك على زيادة المبيعات!
              </p>
            ) : isSilverOrHigher() && !isGoldUser() ? (
              <p>
                <strong>ترقّ للباقة الذهبية</strong> للحصول على المساعد الذكي وتحليلات متقدمة!
              </p>
            ) : (
              <p>
                <strong>لديك جميع الأدوات المتاحة!</strong> استفد منها لتحسين مبيعاتك.
              </p>
            )}
          </div>
        </div>
      </div>

      {showLockedModal && lockedFeature && (
        <FeatureLockedModal
          featureName={lockedFeature.name}
          requiredPlan={lockedFeature.requiredPlan}
          onClose={() => setShowLockedModal(false)}
          onUpgrade={() => {
            setShowLockedModal(false);
          }}
        />
      )}
    </>
  );
}
