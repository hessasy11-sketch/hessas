import { useState, useEffect } from 'react';
import { useAuctionTools, AuctionTool } from './useAuctionTools';
import { useUserSubscription } from './useUserSubscription';

export function useSubscriptionAwareTools(userId: string | undefined) {
  const { currentPlanType, hasActiveSubscription, isExpiringSoon, daysRemaining } = useUserSubscription(userId);
  const { availableTools, lockedTools, loading } = useAuctionTools(currentPlanType);

  const [effectiveTools, setEffectiveTools] = useState<AuctionTool[]>([]);
  const [restrictedTools, setRestrictedTools] = useState<AuctionTool[]>([]);
  const [warningMessage, setWarningMessage] = useState<string>('');

  useEffect(() => {
    if (!userId) {
      setEffectiveTools([]);
      setRestrictedTools(availableTools);
      setWarningMessage('قم بتسجيل الدخول للوصول إلى أدوات المزاد');
      return;
    }

    if (!hasActiveSubscription) {
      const freeTools = availableTools.filter(tool => tool.available_in_free);
      const premiumTools = availableTools.filter(tool => !tool.available_in_free);

      setEffectiveTools(freeTools);
      setRestrictedTools([...premiumTools, ...lockedTools]);
      setWarningMessage('اشتراكك منتهي. تم تقليل الأدوات للباقة المجانية.');
      return;
    }

    if (isExpiringSoon && daysRemaining <= 2) {
      setWarningMessage(`⚠️ باقتك تنتهي خلال ${daysRemaining} يوم. قم بالتجديد للحفاظ على جميع الأدوات.`);
    } else {
      setWarningMessage('');
    }

    setEffectiveTools(availableTools);
    setRestrictedTools(lockedTools);
  }, [userId, hasActiveSubscription, isExpiringSoon, daysRemaining, availableTools, lockedTools, currentPlanType]);

  const checkToolAccess = (toolKey: string): { allowed: boolean; reason?: string } => {
    if (!userId) {
      return { allowed: false, reason: 'قم بتسجيل الدخول أولاً' };
    }

    const tool = effectiveTools.find(t => t.tool_key === toolKey);

    if (!tool) {
      const restrictedTool = restrictedTools.find(t => t.tool_key === toolKey);

      if (restrictedTool) {
        if (!hasActiveSubscription) {
          return { allowed: false, reason: 'اشتراكك منتهي. قم بالتجديد للوصول لهذه الأداة.' };
        }

        if (restrictedTool.available_in_silver && currentPlanType === 'free') {
          return { allowed: false, reason: 'هذه الأداة متاحة في الباقة الفضية' };
        }

        if (restrictedTool.available_in_gold && currentPlanType !== 'gold') {
          return { allowed: false, reason: 'هذه الأداة متاحة في الباقة الذهبية فقط' };
        }
      }

      return { allowed: false, reason: 'هذه الأداة غير متاحة' };
    }

    return { allowed: true };
  };

  return {
    effectiveTools,
    restrictedTools,
    warningMessage,
    checkToolAccess,
    currentPlanType,
    hasActiveSubscription,
    isExpiringSoon,
    daysRemaining,
    loading
  };
}
